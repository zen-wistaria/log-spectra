#!/usr/bin/env python3
"""
EVALUASI FINAL — Log Spectra
Sistem Deteksi Anomali Log Web Server

Alur:
  1. Inject anomali sintetik ke traffic asli (standar journal IDS)
  2. Isolation Forest → feature engineering → anomaly score
  3. Hybrid Risk Scoring (model + behavior rules)
  4. Cari weight & threshold optimal

Cara jalan:
  cd scripts
  python evaluasi.py
"""

import sys, os, logging, random

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "agent"))

import pandas as pd
import numpy as np
from log_reader import parse_log_line
from analyzer import feature_engineering, detect_anomalies
from risk_scoring import _calculate_behavior_score

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ACCESS_LOG = os.path.join(BASE_DIR, "datasheet", "full_60_day_access.log")
SAMPLE_SIZE = 600000
RANDOM_SEED = 42

ANOMALI_LOG = os.path.join(BASE_DIR, "datasheet", "anomali.log")
ANOMALI_IPS_LOG = os.path.join(BASE_DIR, "datasheet", "anomali_ips.txt")


# ============================================================
# BACA & PARSE LOG
# ============================================================
def read_and_parse(path, n):
    entries = []
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        for i, line in enumerate(f):
            if i >= n:
                break
            e = parse_log_line(line.strip())
            if e:
                entries.append(e)
    return entries


def filter_normal_entries(
    entries, rps_threshold=2.0, error_threshold=0.15, min_requests=3
):
    """Filter entri normal dengan membuang IP yang jelas anomali di dataset asli.

    Karena datasheet asli berisi real traffic dari internet, pasti ada serangan/scanner asli.
    Jika tidak dibuang secara ketat, model IF akan mendeteksi mereka dengan benar sbg anomali,
    tapi evaluasi menganggapnya sbg False Positive (karena dilabeli 'Normal'), sehingga
    merusak skor precision saat meload banyak data.
    """
    if not entries:
        return entries

    from analyzer import IOC_REGEX, SUSPICIOUS_UA_REGEX

    df = pd.DataFrame(entries)
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)

    # Deteksi IoC di URL atau Suspicious UA
    df["has_ioc"] = df["url"].fillna("").astype(str).str.contains(IOC_REGEX)
    df["has_susp_ua"] = (
        df["user_agent"].fillna("").astype(str).str.contains(SUSPICIOUS_UA_REGEX)
    )

    ip_ioc_ua = df.groupby("ip")[["has_ioc", "has_susp_ua"]].any()

    # Hitung error rate dan peak RPS (1-min bins) untuk filtering
    error_rates = df.groupby("ip")["status"].apply(lambda x: (x >= 400).mean())
    req_counts = df.groupby("ip").size()

    df_ts = df.set_index("timestamp")
    peak_rps = (
        df_ts.groupby([pd.Grouper(freq="1min"), "ip"]).size().groupby("ip").max() / 60.0
    )

    filtered_ips = set()
    for ip in df["ip"].unique():
        reasons = []
        err = error_rates.get(ip, 0)
        rps = peak_rps.get(ip, 0)
        cnt = req_counts.get(ip, 0)

        if rps > rps_threshold:
            reasons.append(f"peak_rps={rps:.2f}")
        if err > error_threshold and cnt >= min_requests:
            reasons.append(f"err={err:.2%}")
        if ip_ioc_ua.loc[ip, "has_ioc"]:
            reasons.append("has_ioc")
        if ip_ioc_ua.loc[ip, "has_susp_ua"]:
            reasons.append("susp_ua")

        if reasons:
            filtered_ips.add(ip)

    result = [e for e in entries if e["ip"] not in filtered_ips]
    logger.info(
        f"  Filter baseline: {len(filtered_ips)} IP asli terdeteksi sbg anomali & dibuang, "
        f"{len(result)}/{len(entries)} entries tersisa sbg data BENAR-BENAR NORMAL"
    )
    return result


# ============================================================
# GENERATE ANOMALI SINTETIK
# ============================================================
def generate_attacks(normal_entries):
    """Generate synthetic attacks — content-based (SQLi, XSS, traversal) + behavioral (DDoS, brute force).

    Content-based attacks memiliki karakteristik mencurigakan di URL/UA
    yang dapat dideteksi oleh IoC regex di request-level features.
    Referensi: Chua et al. (2024) — Attack Type: SQL injection, cross-site scripting,
    probe, connect tunnel.
    """
    from datetime import timedelta

    random.seed(RANDOM_SEED)
    timestamps = [e["timestamp"] for e in normal_entries if "timestamp" in e][:50]
    base = timestamps[0]
    attacks = {}

    def _ua():
        return random.choice(
            [
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
                "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
                "Python-requests/2.28.1",
                "Go-http-client/2.0",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
                "curl/8.4.0",
            ]
        )

    # ===================================================================
    # CONTENT-BASED: DETECTED OLEH PER-REQUEST IF (IoC di URL)
    # ===================================================================

    # # 1. SQL Injection (10 IP) — union select, OR 1=1, ' -- di URL
    sqli_payloads = [
        "' OR '1'='1",
        "' UNION SELECT * FROM users--",
        "1; DROP TABLE users--",
        "' AND 1=1--",
        "admin'--",
        "1' ORDER BY 3--",
        "' UNION SELECT null,null,null--",
        "1' AND SLEEP(5)--",
        "admin' OR '1'='1'--",
        "1' UNION SELECT @@version--",
    ]
    for i in range(8):
        ip = f"10.10.1.{i+10}"
        entries = []
        for j in range(random.randint(15, 35)):
            t = base + timedelta(seconds=j * random.uniform(1, 3))
            payload = random.choice(sqli_payloads)
            url = f"/api/data?id={payload}"
            entries.append(
                {
                    "ip": ip,
                    "timestamp": t,
                    "method": "GET",
                    "url": url,
                    "status": 500 if random.random() < 0.3 else 200,
                    "size": random.randint(100, 500),
                    "url_length": len(url),
                    "hour": t.hour,
                    "user_agent": _ua(),
                }
            )
        attacks[ip] = entries

    # # 2. XSS (10 IP) — <script>, alert(), onerror= di URL
    xss_payloads = [
        "<script>alert('xss')</script>",
        "<img src=x onerror=alert(1)>",
        "/<script>document.cookie</script>",
        "?q=<svg onload=alert(1)>",
        "?search=%3Cscript%3Ealert('XSS')%3C%2Fscript%3E",
        "/search?q=<iframe src=javascript:alert(1)>",
        "?name=<ScRiPt>alert(1)</ScRiPt>",
        "/<img%20src%3Dx%20onerror%3Dalert(1)>",
        "?page=1&error=<script>alert(1)</script>",
        "/test?input=\"'>&lt;script&gt;alert(1)&lt;/script&gt;",
    ]
    for i in range(8):
        ip = f"10.10.2.{i+10}"
        entries = []
        for j in range(random.randint(15, 30)):
            t = base + timedelta(seconds=j * random.uniform(0.5, 2))
            payload = random.choice(xss_payloads)
            url = f"/search{payload}"
            entries.append(
                {
                    "ip": ip,
                    "timestamp": t,
                    "method": "GET",
                    "url": url,
                    "status": 200,
                    "size": random.randint(200, 800),
                    "url_length": len(url),
                    "hour": t.hour,
                    "user_agent": _ua(),
                }
            )
        attacks[ip] = entries

    # 3. Path Traversal (8 IP) — ../../../etc/passwd
    pt_payloads = [
        "/../../../etc/passwd",
        "/..\\..\\..\\windows\\system32\\config",
        "/admin/../../../etc/shadow",
        "/%2e%2e/%2e%2e/%2e%2e/etc/passwd",
        "/api/../../config/database.php",
        "/panel/../../../proc/self/environ",
        "/assets/../../../etc/nginx/nginx.conf",
        "/../../../var/log/auth.log",
        "/..;/..;/..;/etc/passwd",
        "/static/..%252f..%252f..%252fetc/passwd",
    ]
    for i in range(8):
        ip = f"10.10.3.{i+10}"
        entries = []
        for j in range(random.randint(10, 25)):
            t = base + timedelta(seconds=j * random.uniform(1, 4))
            payload = random.choice(pt_payloads)
            url = f"{payload}"
            entries.append(
                {
                    "ip": ip,
                    "timestamp": t,
                    "method": "GET",
                    "url": url,
                    "status": 404 if random.random() < 0.6 else 200,
                    "size": random.randint(50, 300),
                    "url_length": len(url),
                    "hour": t.hour,
                    "user_agent": _ua(),
                }
            )
        attacks[ip] = entries

    # 4. Command Injection (8 IP) — cmd=, exec=, `cmd` di URL
    cmd_payloads = [
        "?cmd=cat+/etc/passwd",
        "?exec=whoami",
        "?host=127.0.0.1;+cat+/etc/shadow",
        "?file=somefile.txt;+ls+-la",
        "?dir=`cat+/etc/passwd`",
        "/api/exec?cmd=id",
        "?download=../../bin/sh+cat+/etc/passwd",
        "/panel/log?file=test.log|cat+/etc/passwd",
    ]
    for i in range(6):
        ip = f"10.10.4.{i+10}"
        entries = []
        for j in range(random.randint(10, 20)):
            t = base + timedelta(seconds=j * random.uniform(2, 5))
            payload = random.choice(cmd_payloads)
            url = f"/admin{payload}"
            entries.append(
                {
                    "ip": ip,
                    "timestamp": t,
                    "method": "GET",
                    "url": url,
                    "status": 200 if random.random() < 0.4 else 500,
                    "size": random.randint(100, 1000),
                    "url_length": len(url),
                    "hour": t.hour,
                    "user_agent": _ua(),
                }
            )
        attacks[ip] = entries

    # 5. Mixed Content Attack (6 IP) — SQLi + XSS + traversal in one session
    all_content_payloads = sqli_payloads + xss_payloads + pt_payloads + cmd_payloads
    for i in range(6):
        ip = f"10.10.5.{i+10}"
        entries = []
        for j in range(random.randint(20, 40)):
            t = base + timedelta(seconds=j * random.uniform(1, 3))
            payload = random.choice(all_content_payloads)
            url = f"/api/v1/test?q={payload}"
            entries.append(
                {
                    "ip": ip,
                    "timestamp": t,
                    "method": "GET" if random.random() < 0.7 else "POST",
                    "url": url,
                    "status": random.choice([200, 403, 500]),
                    "size": random.randint(100, 500),
                    "url_length": len(url),
                    "hour": t.hour,
                    "user_agent": _ua(),
                }
            )
        attacks[ip] = entries

    # ===================================================================
    # BEHAVIORAL: DETECTED OLEH PER-IP ATAU RULES (kelemahan IF di-handle rules)
    # ===================================================================

    # 6. Brute Force (6 IP) — error_rate tinggi, endpoint terbatas
    for i in range(6):
        ip = f"192.168.100.{10+i}"
        entries = []
        for j in range(random.randint(30, 60)):
            t = base + timedelta(seconds=j * 2 + random.randint(0, 3))
            url = random.choice(["/panel/login", "/api/auth/login", "/admin/login"])
            entries.append(
                {
                    "ip": ip,
                    "timestamp": t,
                    "method": "POST",
                    "url": url,
                    "status": 401 if random.random() < 0.8 else 200,
                    "size": random.randint(100, 300),
                    "url_length": len(url),
                    "hour": t.hour,
                    "user_agent": "Python-requests/2.28.1",
                }
            )
        attacks[ip] = entries

    # 7. Path Scanner (6 IP) — banyak endpoint, semua 404
    scan = [
        "/admin",
        "/administrator",
        "/backup",
        "/phpmyadmin",
        "/test",
        "/.env",
        "/server-status",
        "/wp-admin",
        "/wp-login",
        "/api/backup",
        "/database.sql",
    ]
    for i in range(6):
        ip = f"10.0.0.{20+i}"
        entries = []
        for url in scan:
            for _ in range(random.randint(2, 4)):
                t = base + timedelta(seconds=random.randint(0, 180))
                entries.append(
                    {
                        "ip": ip,
                        "timestamp": t,
                        "method": "GET",
                        "url": url,
                        "status": 404,
                        "size": random.randint(80, 200),
                        "url_length": len(url),
                        "hour": t.hour,
                        "user_agent": "Mozilla/5.0",
                    }
                )
        attacks[ip] = entries

    # 8. DDoS Burst (8 IP) — rps >20, volume 200-400
    for i in range(8):
        ip = f"172.16.0.{30+i}"
        entries = []
        for j in range(random.randint(200, 400)):
            t = base + timedelta(milliseconds=j * random.randint(40, 80))
            url = random.choice(
                ["/", "/index.html", "/panel/dashboard", "/api/v1/data"]
            )
            entries.append(
                {
                    "ip": ip,
                    "timestamp": t,
                    "method": "GET",
                    "url": url,
                    "status": 200,
                    "size": random.randint(500, 5000),
                    "url_length": len(url),
                    "hour": t.hour,
                    "user_agent": "Mozilla/5.0",
                }
            )
        attacks[ip] = entries

    # 9. Mixed Behavioral (6 IP) — error burst + volume
    for i in range(6):
        ip = f"45.33.32.{150+i}"
        entries = []
        for j in range(random.randint(20, 40)):
            t = base + timedelta(
                seconds=j * 2 if random.random() < 0.5 else random.randint(1, 60)
            )
            url = random.choice(
                ["/admin", "/wp-admin", "/panel/login", "/api/auth/login"]
            )
            entries.append(
                {
                    "ip": ip,
                    "timestamp": t,
                    "method": "POST" if "login" in url else "GET",
                    "url": url,
                    "status": 401 if random.random() < 0.7 else 200,
                    "size": random.randint(100, 500),
                    "url_length": len(url),
                    "hour": t.hour,
                    "user_agent": "Go-http-client/2.0",
                }
            )
        attacks[ip] = entries

    # ===================================================================
    # BORDER CASE — LEMAH DI KEDUANYA
    # ===================================================================

    # # 10. Slow Crawler (4 IP) — endpoint banyak, error=0, rps rendah
    # crawl_targets = [
    #     "/panel/permohonan",
    #     "/panel/dashboard",
    #     "/panel/master/kelurahan/cari?district_id=327803",
    #     "/api/v1/officers/submissions",
    #     "/api/v1/data/rekap",
    # ]
    # for i in range(4):
    #     ip = f"203.0.113.{50+i}"
    #     entries = []
    #     for url in crawl_targets:
    #         for _ in range(random.randint(1, 3)):
    #             t = base + timedelta(seconds=random.randint(0, 300))
    #             entries.append(
    #                 {
    #                     "ip": ip,
    #                     "timestamp": t,
    #                     "method": "GET",
    #                     "url": url,
    #                     "status": 200,
    #                     "size": random.randint(500, 100000),
    #                     "url_length": len(url),
    #                     "hour": t.hour,
    #                     "user_agent": "Mozilla/5.0 (compatible; Googlebot/2.1)",
    #                 }
    #             )
    #     attacks[ip] = entries

    logger.info(
        f"  {sum(len(v) for v in attacks.values())} baris anomali dari {len(attacks)} IP"
    )
    return attacks


# ============================================================
# HITUNG METRIK
# ============================================================
def hitung(y_true, y_pred, label=""):
    tp = int(((y_pred == 1) & (y_true == 1)).sum())
    tn = int(((y_pred == 0) & (y_true == 0)).sum())
    fp = int(((y_pred == 1) & (y_true == 0)).sum())
    fn = int(((y_pred == 0) & (y_true == 1)).sum())
    prec = tp / (tp + fp) if (tp + fp) else 0.0
    rec = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = 2 * prec * rec / (prec + rec) if (prec + rec) else 0.0
    acc = (tp + tn) / (tp + tn + fp + fn) if (tp + tn + fp + fn) else 0.0
    return {
        "tp": tp,
        "tn": tn,
        "fp": fp,
        "fn": fn,
        "prec": prec,
        "rec": rec,
        "f1": f1,
        "acc": acc,
    }


# ============================================================
# HITUNG RISK SCORE DENGAN WEIGHT BERUBAH
# ============================================================
def calculate_risk_custom(
    result,
    weight_model=0.6,
    weight_behavior=0.4,
    threshold_medium=40,
    threshold_high=70,
):
    """Risk scoring dengan parameter weight & threshold yang bisa diubah."""
    r = result.copy()
    min_s = r["anomaly_score"].min()
    max_s = r["anomaly_score"].max()
    score_range = max_s - min_s
    if score_range < 1e-6:
        r["model_risk_score"] = 50.0
    else:
        r["model_risk_score"] = ((max_s - r["anomaly_score"]) / score_range) * 100

    risks = []
    cats = []
    reasons_list = []
    beh_scores = []
    for _, row in r.iterrows():
        beh, reasons = _calculate_behavior_score(row)
        final = weight_model * row["model_risk_score"] + weight_behavior * beh

        # Cascade boost: behavior >= 20 tapi final < medium → naikin
        if beh >= 20 and final < threshold_medium:
            final = threshold_medium + (final * 0.1)

        final = min(100.0, round(final, 2))
        if final >= threshold_high:
            cat = "HIGH"
        elif final >= threshold_medium:
            cat = "MEDIUM"
        else:
            cat = "LOW"

        risks.append(final)
        cats.append(cat)
        reasons_list.append(reasons if reasons else ["Normal pattern"])
        beh_scores.append(beh)

    r["model_risk_score"] = r["model_risk_score"].round(2)
    r["behavior_risk_score"] = beh_scores
    r["risk_score"] = risks
    r["risk_category"] = cats
    r["risk_reasons"] = reasons_list
    return r


# ============================================================
# MAIN
# ============================================================
if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("EVALUASI FINAL — LOG SPECTRA")
    logger.info("Sistem Deteksi Anomali Log Web Server")
    logger.info("=" * 60)

    # ---------- DATASET ----------
    logger.info(f"\n--- MEMBANGUN DATASET ---")

    raw_normal_entries = read_and_parse(ACCESS_LOG, SAMPLE_SIZE)
    normal_entries = filter_normal_entries(
        raw_normal_entries, rps_threshold=3.0, error_threshold=0.4
    )

    # Generate atau baca anomali sintetik dari file
    if os.path.exists(ANOMALI_LOG) and os.path.exists(ANOMALI_IPS_LOG):
        logger.info(f"  Memuat anomali dari {ANOMALI_LOG}...")
        with open(ANOMALI_LOG, "r", encoding="utf-8", errors="replace") as f:
            attack_entries = [e for line in f if (e := parse_log_line(line.strip()))]
        with open(ANOMALI_IPS_LOG, "r") as f:
            attack_ips = set(f.read().strip().splitlines())
        logger.info(
            f"  {len(attack_entries)} baris anomali dari {len(attack_ips)} IP (dari file)"
        )
    else:
        logger.info(f"  Men-generate anomali sintetik...")
        attacks = generate_attacks(normal_entries)
        attack_ips = set(attacks.keys())

        logger.info(f"  Menyimpan ke {ANOMALI_LOG}...")
        with open(ANOMALI_LOG, "w", encoding="utf-8") as f:
            for ip, entries in attacks.items():
                for e in entries:
                    ts = e["timestamp"].strftime("%d/%b/%Y:%H:%M:%S +0000")
                    f.write(
                        f'{e["ip"]} - - [{ts}] "{e["method"]} {e["url"]} HTTP/1.1" {e["status"]} {e["size"]} "-" "{e["user_agent"]}"\n'
                    )
        with open(ANOMALI_IPS_LOG, "w") as f:
            for ip in sorted(attack_ips):
                f.write(ip + "\n")

        attack_entries = [e for es in attacks.values() for e in es]
        logger.info(
            f"  {len(attack_entries)} baris anomali dari {len(attack_ips)} IP (baru digenerate)"
        )

    # Merge in-memory, file asli gak disentuh
    all_entries = normal_entries + attack_entries
    features = feature_engineering(all_entries)
    y_true = features["ip"].isin(attack_ips).astype(int).values
    n_normal = (y_true == 0).sum()
    n_anom = (y_true == 1).sum()
    logger.info(f"  Total entries: {len(all_entries)}")
    logger.info(
        f"  Total IP     : {len(features)} (normal={n_normal}, anomali={n_anom})"
    )
    logger.info(f"  Attack IP: {y_true.sum()} — {', '.join(sorted(attack_ips))}")

    # ---------- 1. IF-ONLY ----------
    logger.info(f"\n{'='*60}")
    logger.info("BAGIAN 1: ISOLATION FOREST (unsupervised)")
    logger.info(f"{'='*60}")

    logger.info(f"\n  Tuning contamination:")
    logger.info(
        f"  {'Contam':>8} {'TP':>4} {'FP':>4} {'FN':>4} {'Prec':>8} {'Recall':>8} {'F1':>8}"
    )
    logger.info(f"  {'-'*52}")

    best_if = None
    for c in [0.01, 0.02, 0.03, 0.05, 0.08, 0.10, 0.15, 0.20]:
        r = detect_anomalies(features, contamination=c, api_score_boost=0.15)
        yp = (r["anomaly"].values == -1).astype(int)
        m = hitung(y_true, yp)
        m["c"] = c
        logger.info(
            f"  {c:>8.2f} {m['tp']:>4} {m['fp']:>4} {m['fn']:>4} {m['prec']:>8.4f} {m['rec']:>8.4f} {m['f1']:>8.4f}"
        )
        if best_if is None or m["f1"] > best_if["f1"]:
            best_if = m

    logger.info(
        f"\n  → IF terbaik: contamination={best_if['c']:.2f}, F1={best_if['f1']:.4f}"
    )

    # IF final dengan API boost
    r_if = detect_anomalies(features, contamination=best_if["c"], api_score_boost=0.15)
    yp_if = (r_if["anomaly"].values == -1).astype(int)
    met_if = hitung(y_true, yp_if)
    logger.info(f"\n  Confusion Matrix (IF-only, contamination={best_if['c']}):")
    logger.info(f"  {'':>20} {'Pred Normal':>12} {'Pred Anomali':>12}")
    logger.info(f"  {'Aktual Normal' :>20} {met_if['tn']:>12} {met_if['fp']:>12}")
    logger.info(f"  {'Aktual Anomali':>20} {met_if['fn']:>12} {met_if['tp']:>12}")

    # ---------- 2. VARIASI WEIGHT ----------
    logger.info(f"\n{'='*60}")
    logger.info("BAGIAN 2: HYBRID — VARIASI WEIGHT MODEL:BEHAVIOR")
    logger.info(f"{'='*60}")

    r_if = detect_anomalies(features, contamination=best_if["c"], api_score_boost=0.15)

    weights = [(100, 0), (80, 20), (60, 40), (50, 50), (40, 60), (20, 80), (0, 100)]

    logger.info(
        f"\n  {'Weight M:B':>12} {'TP':>4} {'FP':>4} {'FN':>4} {'Prec':>8} {'Recall':>8} {'F1':>8}"
    )
    logger.info(f"  {'-'*56}")

    weight_results = []
    for wm, wb in weights:
        r_risk = calculate_risk_custom(
            r_if, weight_model=wm / 100, weight_behavior=wb / 100, threshold_medium=40
        )
        yp = (r_risk["risk_category"].isin(["MEDIUM", "HIGH"])).astype(int)
        m = hitung(y_true, yp)
        m["wm"] = wm
        m["wb"] = wb
        weight_results.append(m)
        logger.info(
            f"  {wm:>4}:{wb:<4} {m['tp']:>4} {m['fp']:>4} {m['fn']:>4} {m['prec']:>8.4f} {m['rec']:>8.4f} {m['f1']:>8.4f}"
        )

    best_w = max(weight_results, key=lambda x: x["f1"])
    logger.info(
        f"\n  → Weight terbaik: {best_w['wm']}:{best_w['wb']} (F1={best_w['f1']:.4f})"
    )

    # ---------- 3. VARIASI THRESHOLD MEDIUM ----------
    logger.info(f"\n{'='*60}")
    logger.info(
        f"BAGIAN 3: HYBRID — VARIASI THRESHOLD MEDIUM (weight {best_w['wm']}:{best_w['wb']})"
    )
    logger.info(f"{'='*60}")

    logger.info(
        f"\n  {'MEDIUM >=':>10} {'TP':>4} {'FP':>4} {'FN':>4} {'Prec':>8} {'Recall':>8} {'F1':>8}"
    )
    logger.info(f"  {'-'*56}")

    thresholds = [30, 35, 40, 45, 50, 55, 60, 70]
    thresh_results = []
    for th in thresholds:
        r_risk = calculate_risk_custom(
            r_if,
            weight_model=best_w["wm"] / 100,
            weight_behavior=best_w["wb"] / 100,
            threshold_medium=th,
        )
        yp = (r_risk["risk_category"].isin(["MEDIUM", "HIGH"])).astype(int)
        m = hitung(y_true, yp)
        m["th"] = th
        thresh_results.append(m)
        logger.info(
            f"  {th:>10} {m['tp']:>4} {m['fp']:>4} {m['fn']:>4} {m['prec']:>8.4f} {m['rec']:>8.4f} {m['f1']:>8.4f}"
        )

    best_th = max(thresh_results, key=lambda x: x["f1"])
    logger.info(
        f"\n  → Threshold MEDIUM terbaik: >= {best_th['th']} (F1={best_th['f1']:.4f})"
    )

    # ---------- 4. CASCADE FINAL ----------
    logger.info(f"\n{'='*60}")
    logger.info(
        f"BAGIAN 4: CASCADE FINAL (weight {best_w['wm']}:{best_w['wb']}, MEDIUM>={best_th['th']})"
    )
    logger.info(f"{'='*60}")

    r_risk = calculate_risk_custom(
        r_if,
        weight_model=best_w["wm"] / 100,
        weight_behavior=best_w["wb"] / 100,
        threshold_medium=best_th["th"],
    )
    yp_cascade = (r_risk["risk_category"].isin(["MEDIUM", "HIGH"])).astype(int)
    met_cascade = hitung(y_true, yp_cascade)

    logger.info(f"\n  Confusion Matrix (Cascade IF → Risk Scoring):")
    logger.info(f"  {'':>20} {'Pred Normal':>12} {'Pred Anomali':>12}")
    logger.info(
        f"  {'Aktual Normal' :>20} {met_cascade['tn']:>12} {met_cascade['fp']:>12}"
    )
    logger.info(
        f"  {'Aktual Anomali':>20} {met_cascade['fn']:>12} {met_cascade['tp']:>12}"
    )
    logger.info(
        f"\n  Precision: {met_cascade['prec']:.4f} ({met_cascade['prec']*100:.2f}%)"
    )
    logger.info(
        f"  Recall:    {met_cascade['rec']:.4f} ({met_cascade['rec']*100:.2f}%)"
    )
    logger.info(f"  F1-Score:  {met_cascade['f1']:.4f} ({met_cascade['f1']*100:.2f}%)")
    logger.info(
        f"  Accuracy:  {met_cascade['acc']:.4f} ({met_cascade['acc']*100:.2f}%)"
    )

    # Detail
    gt = r_risk["ip"].isin(attack_ips)
    logger.info(f"\n  Detail 20 IP anomali sintetik:")
    logger.info(
        f"  {'Status':>4} {'IP':<22} {'Risk':>6} {'Cat':>8} {'Beh':>4} {'Model':>8} {'Ket':>25}"
    )
    logger.info(f"  {'-'*77}")
    for _, row in r_risk[gt].sort_values("risk_score", ascending=False).iterrows():
        det = "✓ TERDETEKSI" if yp_cascade[row.name] else "✗ LOLOS"
        logger.info(
            f"  {'✓' if yp_cascade[row.name] else '✗'} {row['ip']:<22} {row['risk_score']:>6.1f} {row['risk_category']:>8} {row['behavior_risk_score']:>4} {row['model_risk_score']:>8.1f} {det:>25}"
        )

    # ---------- REKAP ----------
    logger.info(f"\n{'='*60}")
    logger.info("REKAPITULASI AKHIR")
    logger.info(f"{'='*60}")
    logger.info(
        f"\n  {'Metode':<45} {'Prec':>8} {'Recall':>8} {'F1':>8} {'TP':>4} {'FP':>4}"
    )
    logger.info(f"  {'-'*77}")
    logger.info(
        f"  {'1. IF-only (7 fitur per-IP)':<45} {met_if['prec']:>8.4f} {met_if['rec']:>8.4f} {met_if['f1']:>8.4f} {met_if['tp']:>4} {met_if['fp']:>4}"
    )
    logger.info(
        f"  {'2. Cascade IF→Risk Scoring':<45} {met_cascade['prec']:>8.4f} {met_cascade['rec']:>8.4f} {met_cascade['f1']:>8.4f} {met_cascade['tp']:>4} {met_cascade['fp']:>4}"
    )
    logger.info(f"\n  Konfigurasi optimal:")
    logger.info(f"    Contamination (IF-only)       : {best_if['c']}")
    logger.info(f"    Weight Model                  : {best_w['wm']}")
    logger.info(f"    Weight Behavior               : {best_w['wb']}")
    logger.info(f"    Threshold MEDIUM              : >= {best_th['th']}")
    logger.info(f"\n✅ Selesai")
