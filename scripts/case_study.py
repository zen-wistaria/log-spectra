#!/usr/bin/env python3
"""
Case study — jalankan sistem di access.log asli.
Output: distribusi IP, risk category, detail per IP mencurigakan.

Cocok untuk bab 4 laporan — analisis hasil deteksi pada data real.
"""
import sys, os, logging
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "agent"))
import pandas as pd
from collections import Counter
from datetime import datetime
from log_reader import parse_log_line
from analyzer import feature_engineering, detect_anomalies
from risk_scoring import calculate_risk, _calculate_behavior_score

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ACCESS_LOG = os.path.join(BASE_DIR, "datasheet", "access.log")

# Konfigurasi optimal dari evaluasi
CONTAMINATION = 0.08
SAMPLE_SIZE = 100000  # 100 ribu baris

def read_and_parse(path, n):
    start = datetime.now()
    entries = []
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        for i, line in enumerate(f):
            if i >= n: break
            e = parse_log_line(line.strip())
            if e: entries.append(e)
    elapsed = (datetime.now() - start).total_seconds()
    logger.info(f"  Waktu baca & parse: {elapsed:.1f}s")
    return entries

if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("CASE STUDY — DETEKSI ANOMALI ACCESS.LOG")
    logger.info("Sistem: Isolation Forest + Hybrid Risk Scoring")
    logger.info(f"Konfigurasi: contamination={CONTAMINATION}, weight M:B=60:40")
    logger.info("=" * 60)

    # 1. Baca access.log
    logger.info(f"\n--- MEMBACA {SAMPLE_SIZE} BARIS DARI ACCESS.LOG ---")
    entries = read_and_parse(ACCESS_LOG, SAMPLE_SIZE)
    logger.info(f"  Entries ter-parse: {len(entries)}")

    # 2. Feature engineering
    logger.info(f"\n--- FEATURE ENGINEERING ---")
    features = feature_engineering(entries)
    logger.info(f"  IP unik: {len(features)}")

    # 3. Isolation Forest
    logger.info(f"\n--- ISOLATION FOREST ---")
    result = detect_anomalies(features, contamination=CONTAMINATION, api_score_boost=0.15)
    n_if_anom = (result["anomaly"] == -1).sum()
    logger.info(f"  IP terdeteksi anomali oleh IF: {n_if_anom} dari {len(result)}")

    # 4. Risk Scoring
    logger.info(f"\n--- RISK SCORING ---")
    result = calculate_risk(result)
    cat_dist = result["risk_category"].value_counts()
    for cat in ["HIGH", "MEDIUM", "LOW"]:
        n = cat_dist.get(cat, 0)
        pct = n / len(result) * 100
        logger.info(f"  {cat:>8}: {n:>4} IP ({pct:>5.2f}%)")

    # 5. Top suspicious IPs (HIGH + MEDIUM)
    logger.info(f"\n--- TOP 30 IP MENURIGAKAN (HIGH + MEDIUM) ---")
    suspicious = result[result["risk_category"].isin(["HIGH", "MEDIUM"])]\
        .sort_values("risk_score", ascending=False)

    if len(suspicious) > 0:
        logger.info(f"\n  {'No':>3} {'IP':<22} {'Req':>6} {'Error':>5} {'RPS':>6} {'Ratio':>6} {'AnomSc':>8} {'Model':>7} {'Beh':>4} {'Risk':>6} {'Cat':>8} {'Penyebab'}")
        logger.info(f"  {'-'*110}")
        for i, (_, row) in enumerate(suspicious.head(30).iterrows()):
            reasons = row["risk_reasons"]
            penyebab = "; ".join(reasons[:2]) if isinstance(reasons, list) else str(reasons)[:40]
            logger.info(f"  {i+1:>3} {row['ip']:<22} {int(row['request_count']):>6} {int(row['error_count']):>5} "
                        f"{row['request_per_second']:>6.2f} {row['unique_endpoint_ratio']:>6.2f} "
                        f"{row['anomaly_score']:>8.4f} {row['model_risk_score']:>7.1f} "
                        f"{int(row['behavior_risk_score']):>4} {row['risk_score']:>6.1f} "
                        f"{row['risk_category']:>8} {penyebab[:40]}")

    # 6. IP HIGH (paling berbahaya)
    high_ips = result[result["risk_category"] == "HIGH"]
    if len(high_ips) > 0:
        logger.info(f"\n--- IP HIGH-RISK (risk >= 70) ---")
        for _, row in high_ips.sort_values("risk_score", ascending=False).iterrows():
            reasons = "; ".join(row["risk_reasons"][:3]) if isinstance(row["risk_reasons"], list) else str(row["risk_reasons"])
            logger.info(f"  🔴 {row['ip']:<22} risk={row['risk_score']:>6.1f}  req={int(row['request_count']):>5}  "
                        f"error={row['error_rate']:.2f}  rps={row['request_per_second']:.2f}")
            logger.info(f"     Alasan: {reasons}")
            logger.info(f"     model_risk={row['model_risk_score']:.1f}, behavior_risk={row['behavior_risk_score']}")

    # 7. Statistik tambahan
    logger.info(f"\n--- STATISTIK ---")
    logger.info(f"  Total entries di-log        : {SAMPLE_SIZE}")
    logger.info(f"  Total IP unik               : {len(features)}")
    logger.info(f"  IP terdeteksi IF            : {n_if_anom}")
    logger.info(f"  IP MEDIUM + HIGH            : {len(suspicious)}")
    logger.info(f"  IP HIGH                     : {len(high_ips)}")

    # IP dengan error_rate > 0.3 yang lolos IF
    high_error_lolos = result[(result["error_rate"] > 0.3) & (result["anomaly"] == 1)]
    logger.info(f"  IP error_rate>30% lolos IF  : {len(high_error_lolos)}")

    # IP dengan rps > 5 yang lolos IF
    high_rps_lolos = result[(result["request_per_second"] > 5) & (result["anomaly"] == 1)]
    logger.info(f"  IP rps>5 lolos IF           : {len(high_rps_lolos)}")

    # 8. Simpan ke CSV
    out_path = os.path.join(BASE_DIR, "scripts", "hasil_case_study.csv")
    result_sorted = result.sort_values("risk_score", ascending=False)
    result_sorted.to_csv(out_path, index=False,
        columns=["ip","request_count","error_count","error_rate","request_per_second",
                 "unique_endpoint_ratio","anomaly_score","model_risk_score",
                 "behavior_risk_score","risk_score","risk_category","risk_reasons"])
    logger.info(f"\n  Hasil lengkap disimpan ke: scripts/hasil_case_study.csv")
    logger.info(f"\n✅ Selesai")
