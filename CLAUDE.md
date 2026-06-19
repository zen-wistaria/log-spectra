# Log Spectra — Skripsi TA

**Judul:** Sistem Deteksi Anomali dan Risk Scoring pada Log Web Server Menggunakan Metode Isolation Forest Berbasis Agent

## Arsitektur

```
┌─────────────────────────────────────────────────────────┐
│  Server (Next.js 15 + Prisma + PostgreSQL)              │
│  ├── UI Dashboard (agent mgmt, reports, analytics)      │
│  ├── API Endpoints (v1/collects, v1/agents, heartbeat)  │
│  └── Database (agents, anomaly_logs, api_tokens, users) │
├─────────────────────────────────────────────────────────┤
│  Agent (Python — di-install di server web target)       │
│  ├── Baca nginx access.log → pygtail                    │
│  ├── Feature Engineering per-IP (7 fitur)               │
│  ├── Isolation Forest → anomaly detection               │
│  ├── Rule-based behavior scoring (hybrid)               │
│  └── Kirim hasil + heartbeat ke Server via HTTP POST    │
├─────────────────────────────────────────────────────────┤
│  FastAPI (opsional — analisis log manual via upload)    │
│  └── Upload file .log → parse → detect → score → return │
└─────────────────────────────────────────────────────────┘
```

## Komponen Project

### 1. Agent (`agent/`)

Python agent yg di-deploy ke server web yg dimonitor. Baca nginx `access.log` incremental (pygtail), akumulasi ke disk, analisis periodik pake Isolation Forest.

**Pipeline:**
1. `LogReader` — baca baris baru nginx combined format, parse ke structured dict, simpan ke **sliding window buffer** (max 100K entries) + **disk accumulator** (file .accumulated, auto-trim by size)
2. `LogAccumulator` — persist raw lines ke `.accumulated`, trim otomatis kalo > max ukuran. Juga punya `read_tail_lines(n)` untuk restore buffer dari N lines terakhir (tanpa load full file).
3. `feature_engineering()` — ekstrak 7 fitur per IP: request_count, error_rate, avg_response_size, response_size_std, avg_url_length, request_per_second, unique_endpoint_ratio
4. `detect_anomalies()` — RobustScaler → Isolation Forest → threshold percentile-adjusted → label anomali
5. `calculate_risk()` — hybrid scoring: 60% model_risk + 40% behavior_risk. Kategori: LOW (<40), MEDIUM (40-69), HIGH (≥70)
6. `_http_post()` — kirim hasil via HTTP POST dengan Bearer token (Bearer auth), retry + exponential backoff
7. `_heartbeat_loop()` — thread terpisah, kirim heartbeat periodik (default tiap 5 menit)

**Behavior Rules:**
| Rule | Kondisi | Poin | Justifikasi |
|------|---------|------|-------------|
| Burst | req/s > 5.0 | +35 | DDoS / rate-based attack |
| Error | error_rate > 0.3 | +30 | Scanning / fuzzing aktif |
| Endpoint | ratio > 0.7 AND req ≥ 25 | +25 | Crawling / path enumeration |
| Vol+Intensity | req > 500 AND rps > 1 | +10 | Volume akumulasi tinggi + intensitas burst |

⚠️ **Pertimbangan Rule 4 (volume):** Buffer in-memory adalah **sliding window** (default 100K entries ~100MB RAM). IP aktif lama punya `request_count` besar bukan karena satu burst tapi karena akumulasi dari buffer. Threshold tunggal `>200` atau `>1000` bikin FP. Solusi: kombinasikan `request_count > 500` AND `request_per_second > 1` — butuh bukti volume + intensitas.

**API / Bot UA filter** (dapat score boost +0.15 agar tidak jadi FP):
- API tools: `Dart`, `curl`, `Postman`, `python`, `Go-http-client`
- Search crawlers: `Googlebot`, `bingbot`, `Slurp`, `YandexBot`, `DuckDuckBot`, `Baiduspider`, `facebookexternalhit`
- AI crawlers: `GPTBot`, `Claude-Web`, `CCBot`, `anthropic-ai`, `PerplexityBot`
- Monitoring: `UptimeRobot`, `Pingdom`, `Datadog`
- Lainnya: `Feedfetcher`, `W3C_Validator`

**Config:** YAML + env vars + CLI args (priority: CLI > env > YAML > default)

**Install:** `install.sh` — deploy ke `/opt/log-spectra-agent`, systemd service `log-spectra-agent`

### 2. Server (Next.js 15 + Prisma)

**Auth:** NextAuth v5 (Credentials provider) + JWT session. User roles (default: "admin").

**API Endpoints:**
| Endpoint | Method | Auth | Fungsi |
|----------|--------|------|--------|
| `/api/v1/collects` | POST | Bearer token | Terima hasil analisis dari agent |
| `/api/v1/agents` | GET/POST | Bearer token | CRUD agent |
| `/api/v1/agents/[id]` | GET/PATCH/DELETE | Bearer token | Detail/update/hapus agent |
| `/api/v1/agents/heartbeat` | POST | Bearer token | Terima heartbeat agent |
| `/api/v1/agents/[id]/tokens` | POST/GET | Bearer token | Manajemen API token |
| `/api/analyze-log` | POST | NextAuth | Analisis live dari dashboard |
| `/api/dashboard` | GET | NextAuth | Statistik dashboard |

**Database (Prisma + PostgreSQL):**
- `Agents` — server yg dimonitor (name, hostname, machine_id, status, version, last_seen)
- `AnomalyLogs` — hasil analisis per IP per agent (unique constraint `[agent_id, ip]`)
- `ApiTokens` — bearer token untuk auth agent-server
- `Users` — admin user (username+password, bcrypt)

**Dashboard Pages:**
- `/dashboard` — ringkasan statistik, top suspicious IPs, latest agent reports
- `/agents` — CRUD agent, lihat status online/offline
- `/agents/[id]/tokens` — generate/revoke API tokens per agent
- `/reports` — tabel semua anomaly logs, filter, resolve
- `/reports/[ip]` — detail IP, abuseipdb lookup
- `/resolved` — anomaly logs yg sudah diresolve
- `/log-analyzer` — upload/analyze log manual via dashboard (frontend buat `/api/analyze-log`)
- `/users` — manajemen user admin

### 3. FastAPI (`fastapi/`)

Service opsional untuk analisis log manual (tidak simpan ke DB). Upload file .log → parse → feature engineering → Isolation Forest → risk scoring → return JSON.

### 4. Metode Deteksi

**Feature Engineering (7 fitur per IP):**
| Fitur | Kegunaan |
|-------|----------|
| request_count | Volume traffic baseline |
| error_rate | Scanner/fuzzer → error rate tinggi |
| avg_response_size | Scanner dapet response kecil (403/404) |
| response_size_std | Scanner otomatis → std mendekati 0 |
| avg_url_length | URL panjang → path traversal/injection |
| request_per_second | Burst traffic / rate-based attack |
| unique_endpoint_ratio | Crawling/scanning → banyak endpoint beda |

**Isolation Forest:**
- `contamination=0.02` (default), `n_estimators=200` (default)
- RobustScaler pre-processing
- Threshold dari percentile, bukan predict() langsung — biar ga selalu label anomaly kalo traffic normal
- Post-processing: API client (curl, Postman, dll) dapet score boost +0.15 biar ga jadi false positive

**Hybrid Risk Scoring:**
```
risk_score = (0.6 × model_risk) + (0.4 × behavior_risk)
```

## Stack Teknologi

| Layer | Tools |
|-------|-------|
| Frontend | Next.js 15 (turbopack), React 19, Tailwind v4, Radix UI, shadcn/ui |
| Charts | recharts |
| Table | TanStack Table, TanStack Query, TanStack Form |
| URL state | nuqs |
| Drag & drop | dnd-kit |
| Auth | NextAuth v5 (Credentials), bcrypt-ts |
| Validasi | zod |
| DB ORM | Prisma + PostgreSQL |
| Backend API | Next.js API routes |
| Agent ML | Python, scikit-learn (Isolation Forest), pandas, numpy, pygtail, pyyaml, requests |
| FastAPI | FastAPI, uvicorn, python-dotenv |
| Tooling | Biome, Husky, Bun |
| Infra | Docker (compose), systemd |

## Scripts Penting

```bash
bun dev              # Next.js dev (turbopack)
bun run build        # Build production
bun run db:migrate   # Prisma migrate deploy
bun run db:seed      # Seed user
bun run lint         # Biome check
bun run lint:fix     # Biome lint + format write
```

## Catatan Penting

- Feature engineering + Isolation Forest di-duplicated antara `agent/` dan `fastapi/` — kode serupa, path beda (fastapi/analyzer.py vs agent/analyzer.py). **Kedua path harus selalu sync** termasuk threshold rules dan bot UA list
- Anomaly detection per IP, bukan per request — setiap IP jadi satu sample
- Agent pake **sliding window buffer** (default 100K entries, → ~100MB RAM) untuk analisis + **disk accumulator** (.accumulated, max 200MB) untuk persist data survive log rotation. Buffer & disk **decoupled** — tidak ada sync/rebuild setelah trim. Restart restore dari tail file, bukan full load.
- Behavior Rule 4 dikomposisi dari `request_count > 500 AND request_per_second > 1` untuk hindari false positive akibat akumulasi di buffer.
- Keamanan: agent pake Bearer token API, web pake NextAuth session
- `.env` file di root dipake sama server, FASTAPI-nya juga nge-load `.env` dari parent directory
