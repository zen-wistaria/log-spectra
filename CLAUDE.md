# Log Spectra — Skripsi TA

**Judul:** Sistem Deteksi Anomali dan Risk Scoring pada Log Web Server Menggunakan Metode Isolation Forest Berbasis Agent

## Arsitektur

```
Access Log → LogReader → Feature Engineering (7 fitur per IP)
                                         ↓
                              Isolation Forest → anomaly_score (~ -0.15 s.d 0.30)
                                         ↓
                              Hybrid Risk Scoring (50% model + 50% behavior rules)
                                         ↓
                              Cascade: risk_score >= min_risk_score_to_send (default 60) → kirim ke server
                              (risk scoring dihitung untuk SEMUA IP, bukan hanya yg anomali IF)
```

## Alur Deteksi (3 Lapisan)

1. **Isolation Forest** → label semua IP: -1 (anomali) / +1 (normal)
2. **Risk Scoring** (semua IP) → model_risk × 50% + behavior_risk × 50% → risk_score 0-100
3. **Filter** → hanya IP dengan risk_score >= `min_risk_score_to_send` (default: 60) dikirim ke server via `build_payload()`

**Mengapa risk scoring dihitung untuk semua IP?** Karena behavior rules bisa mendeteksi IP yang lolos IF. Contoh: IP dengan error_rate 92% tapi anomaly_score -0.0133 (IF bilang normal) → behavior rules trigger → risk_score 64.2 → MEDIUM.

## Komponen Project

### 1. Agent (`agent/`)

Python agent yg di-deploy ke server web yg dimonitor. Baca nginx `access.log` incremental (pygtail), akumulasi ke disk, analisis periodik pake Isolation Forest.

**Pipeline:**
1. `LogReader` — baca baris baru nginx combined format, parse ke structured dict, simpan ke **sliding window buffer** (max 100K entries) + **disk accumulator** (file .accumulated, auto-trim by size)
2. `LogAccumulator` — persist raw lines ke `.accumulated`, trim otomatis kalo > max ukuran. Juga punya `read_tail_lines(n)` untuk restore buffer dari N lines terakhir (tanpa load full file).
3. `feature_engineering()` — ekstrak 7 fitur per IP: request_count, error_rate, avg_response_size, response_size_std, avg_url_length, request_per_second, unique_endpoint_ratio
4. `detect_anomalies()` — RobustScaler → Isolation Forest → threshold percentile-adjusted → label anomali
5. `calculate_risk()` — hybrid scoring: 50% model_risk + 50% behavior_risk. Kategori: LOW (<40), MEDIUM (40-69), HIGH (≥70). **Cascade boost:** behavior >= 20 → minimal MEDIUM.
6. `build_payload()` — filter IP berdasarkan threshold `min_risk_score_to_send` (misal 60), urutkan berdasarkan risk_score tertinggi, lalu kirim ke server
7. `_http_post()` — kirim hasil via HTTP POST dengan Bearer token (Bearer auth), retry + exponential backoff
8. `_heartbeat_loop()` — thread terpisah, kirim heartbeat periodik (default tiap 5 menit)

**Behavior Rules:**
| Rule | Kondisi | Poin | Justifikasi |
|------|---------|------|-------------|
| Burst | req/s > 5.0 | +35 | DDoS / rate-based attack |
| Error | error_rate > 0.3 AND req >= 10 | +30 | Scanning / fuzzing aktif |
| Endpoint | ratio > 0.7 AND req >= 25 | +25 | Crawling / path enumeration |
| Volume | req > 500 AND rps > 1 | +10 | Volume akumulasi tinggi + intensitas burst |
| IoC | has_ioc = True | +60 | Serangan injeksi (SQLi, XSS, Traversal) |
| Susp_UA | has_susp_ua = True | +20 | Penggunaan Scanner tools (sqlmap, nmap, dll) |

**Threshold 5 rps** — dari analisis distribusi 100.000 baris log: 99% IP punya rps di bawah 5. Hanya 1% IP di atas 5 rps.

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

**Feature Engineering (7 fitur + 2 sinyal teks per IP):**
| Fitur | Kegunaan | Perhitungan |
|-------|----------|-------------|
| request_count | Volume traffic baseline | Global |
| error_rate | Scanner/fuzzer → error rate tinggi | Global |
| avg_response_size | Scanner dapet response kecil (403/404) | Global |
| response_size_std | Scanner otomatis → std mendekati 0 | Global |
| avg_url_length | URL panjang → path traversal/injection | Global |
| request_per_second | Burst traffic / rate-based attack | **Peak 1-minute bin** (solusi time dilution) |
| unique_endpoint_ratio | Crawling/scanning → banyak endpoint beda | Global |
| has_ioc | Deteksi payload SQLi/XSS/Traversal | Regex Match (Global) |
| has_susp_ua | Deteksi tool bot/scanner | Regex Match (Global) |

*Catatan Update (Time Dilution Fix):* `request_per_second` menggunakan Peak 1-minute bin alih-alih `time_diff` keseluruhan agar skor burst tidak terbagi (ter-dilusi) jika rentang waktu log sangat panjang (misal 30 hari). Di sisi lain, `error_rate` dan `unique_endpoint_ratio` tetap global agar tidak memicu False Positive tinggi pada user normal yang mengalami spike error sesaat.

**Isolation Forest:**
- `contamination=0.08` (optimal dari tuning. Default sklearn=0.02)
- `n_estimators=200`, `random_state=42`
- RobustScaler pre-processing (median + IQR, tahan outlier)
- Threshold dari percentile, bukan predict() langsung
- Output `decision_function()`: **~ -0.15 (sangat anomali) sampai 0.30 (sangat normal)**. Bukan -1 sampai 1. Score negatif = anomali, positif = normal. 0 = borderline.
- Post-processing: API client dapet score boost +0.15 biar ga jadi false positive

**Hybrid Risk Scoring:**
```
risk_score = (0.5 × model_risk) + (0.5 × behavior_risk)
```
- `model_risk` = min-max normalisasi anomaly_score ke 0-100 (score paling negatif = 100)
- `behavior_risk` = rule-based 0-100
- Cascade boost: behavior >= 20 tapi final_risk < 40 → naikkan ke 40+(final×0.1)
- Kategorisasi: LOW < 45, MEDIUM 45-69, HIGH ≥ 70
- `"Normal pattern"` pada reasons = behavior_risk=0 (tidak ada rule trigger). IP ini murni terdeteksi oleh IF.

## Evaluasi

### Metode
1. Ambil baris data dari `datasheet/access.log` sebagai normal baseline.
2. **Baseline Filtering:** `evaluasi.py` mem-filter baseline dengan sangat ketat (membuang peak RPS > 2.0, error_rate > 15%, dan mendeteksi IoC/Suspicious UA) karena datasheet asli mengandung serangan *real* dari internet. Ini mencegah model dihukum dengan *False Positive* ketika ia berhasil mendeteksi penyerang asli.
3. Inject 75 IP anomali sintetik (5 pola: brute force, scanner, burst/DDoS, slow crawler, mixed).
4. Hitung Confusion Matrix, Precision, Recall, F1.
5. Tuning contamination → weight → threshold.

### Hasil (75 IP anomali + 906 IP normal)

| Metode | Precision | Recall | F1 | TP | FP |
|---|---|---|---|---|---|
| IF-only (contamination=0.08) | 35.44% | 37.33% | 0.36 | 28 | 51 |
| **Cascade IF→Risk Scoring** | **44.14%** | **65.33%** | **0.53** | **49** | **62** |
| Random Forest (supervised) | 100% | 100% | 1.00 | - | - |

### Konfigurasi Optimal (empiris)
- Contamination: **0.08**
- Weight Model:Behavior: **50:50** (diuji 7 variasi: 100:0 s.d 0:100)
- Threshold MEDIUM: >= **45**
- Threshold HIGH: >= 70

### Case Study (100.000 baris access.log asli)

| Metrik | Nilai |
|---|---|
| Total entries | 100.000 |
| IP unik | 2.371 |
| IP HIGH | 11 (0.46%) |
| IP MEDIUM | 209 (8.81%) |
| IP LOW | 2.151 (90.72%) |

**Top HIGH-RISK IPs:**
- `103.253.27.27` — 8.930 request, error rate 50%, rps 2.32. **HIGH (74.2)**
- `152.32.189.174` — 1.120 request, error rate 62%, rps 40.00. **HIGH (73.1)**
- `103.253.27.24` & `103.253.27.121` — cluster serangan (6.698 req, 66.6% error). **HIGH (72.8)**

## Dataset
- `datasheet/access.log` — 130MB, 556.575 baris, log asli smartkelurahan. Traffic campuran normal + anomali.
- `log_testing/` — file sample untuk testing. Ada file terpisah normal.log, anomaly.log, campuran.

## Scripts Penting

```bash
# Evaluasi (inject anomali sintetik → hitung metrik)
python scripts/evaluasi.py

# Case study (jalanin sistem di access.log asli)
python scripts/case_study.py

# Dev server
bun dev              # Next.js dev (turbopack)
bun run build        # Build production
bun run db:migrate   # Prisma migrate deploy
bun run db:seed      # Seed user
```

## Catatan Penting

- Feature engineering + Isolation Forest di-duplicated antara `agent/` dan `fastapi/` — kode serupa, path beda (fastapi/analyzer.py vs agent/analyzer.py). **Kedua path harus selalu sync** termasuk threshold rules dan bot UA list.
- Anomaly detection per IP, bukan per request — setiap IP jadi satu sample.
- Agent pake **sliding window buffer** (default 100K entries, ~100MB RAM) + **disk accumulator** (.accumulated, max 200MB). Buffer & disk **decoupled**.
- Risk scoring dihitung untuk **SEMUA IP** — bukan hanya yang dilabel anomali oleh IF. Filter berbasis konfigurasi `min_risk_score_to_send` (contoh: 60) baru dilakukan di `build_payload()` untuk mengurangi beban jaringan.
- FP di evaluasi mungkin termasuk anomali asli di access.log yang tidak terlabel — precision sebenarnya mungkin lebih tinggi.
- Slow crawler (error=0, rps rendah, endpoint ratio tinggi) adalah border case yang lolos deteksi — tidak trigger IF juga tidak trigger behavior rules.
- Random Forest mencapai F1=1.0 — supervised tetap unggul, tapi butuh labeled data.
- Catatan evaluasi lebih detail ada di [scripts/evaluasi.py](scripts/evaluasi.py) dan [scripts/case_study.py](scripts/case_study.py).
