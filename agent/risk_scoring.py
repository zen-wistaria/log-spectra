"""
Risk scoring system for anomaly detection results.

Menggabungkan model-based anomaly score dari Isolation Forest dengan
rule-based behavior scoring untuk menghasilkan risk score final (0-100).

Pendekatan Hybrid (Model + Rules + Cascade Boost):
Isolation Forest menghasilkan anomaly score berbasis distribusi data
(unsupervised), namun tidak mengetahui konteks domain seperti
"burst traffic > X req/s adalah berbahaya". Rule-based scoring
melengkapi kelemahan ini dengan pengetahuan domain eksplisit.
Pendekatan hybrid ini umum digunakan dalam sistem IDS/SIEM seperti
yang dijelaskan pada Patcha & Park (2007), "An overview of anomaly
detection techniques".

Alur deteksi:
  1. Isolation Forest → anomaly_score (-1/1)
  2. Model risk score (min-max normalisasi anomaly_score ke 0-100)
  3. Behavior risk score (rules: burst, error rate, endpoint, volume)
  4. Final risk score = (60% model) + (40% behavior)
  5. Cascade boost: jika behavior_risk >= 20 (ada bukti kuat dari rules)
     tapi final_risk < 40, naikkan ke minimal MEDIUM.
     Ini memastikan IP dengan error_rate tinggi atau burst tidak
     terlewat hanya karena model_risk_score rendah.

Formula Final Risk Score:
    risk_score = (W_model × model_risk) + (W_behavior × behavior_risk)
    W_model = 0.6, W_behavior = 0.4

Pemilihan bobot:
- Model Isolation Forest diberikan bobot lebih besar (60%) karena
  bersifat data-driven dan mampu mendeteksi pola kompleks yang tidak
  bisa dikodifikasi dalam rules.
- Behavior rules (40%) memberikan boost berbasis pengetahuan domain
  yang eksplisit dan dapat dijelaskan kepada pengguna.

Kategorisasi Risk:
- LOW    (0–39)  : Traffic normal, tidak memerlukan tindakan
- MEDIUM (40–69) : Perlu dimonitor, kemungkinan false positive
- HIGH   (70–100): Perlu tindakan segera (block/investigasi)
"""

import logging
import pandas as pd

logger = logging.getLogger(__name__)

# Bobot formula hybrid
WEIGHT_MODEL = 0.6
WEIGHT_BEHAVIOR = 0.4

# Batas kategorisasi
THRESHOLD_HIGH = 70
THRESHOLD_MEDIUM = 40

# Batas rule behavior (dapat dikonfigurasi sesuai karakteristik server)
BURST_RPS_THRESHOLD = 5.0  # req/s di atas ini dianggap burst
HIGH_ERROR_RATE_THRESHOLD = 0.3  # 30% error rate
HIGH_ENDPOINT_RATIO_THRESHOLD = 0.7  # 70% unique endpoint ratio
MIN_REQUESTS_FOR_RATIO_RULE = 25  # minimum request agar ratio rule bermakna
MIN_REQUESTS_FOR_ERROR_RULE = 10  # minimum request agar error rule tidak noise


def _calculate_behavior_score(row: pd.Series) -> tuple[int, list[str]]:
    """
    Hitung behavior risk score (0-100) berdasarkan aturan domain.

    Setiap rule bersifat independen dan additive, namun total
    di-clamp pada 100 sebelum dikombinasikan ke formula akhir.

    Rules dan justifikasinya:
    +---------+----------------------------------------+-------+-----------------------------+
    | Rule    | Kondisi                                | Poin  | Justifikasi                 |
    +---------+----------------------------------------+-------+-----------------------------+
    | Burst   | req/s > 5.0 (BURST_RPS_THRESHOLD)      | +35   | DDoS / rate-based attack    |
    | Error   | error_rate > 0.3 AND req >= 10         | +30   | Scanning / fuzzing aktif    |
    | Endpoint| ratio > 0.7 AND req >= 25              | +25   | Crawling / path enumeration |
    | Volume  | req_count > 500 AND req/s > 1          | +10   | Volume + intensitas abnormal|
    | IoC     | URL/Body contains SQLi/XSS/etc patterns| +60   | Explicit attack attempt     |
    | User-Ag | Suspicious UA (Scanner/Bot/Empty)      | +20   | Attack tool / Bare client   |
    +---------+----------------------------------------+-------+-----------------------------+

    Catatan: Rule endpoint disyaratkan minimum 25 request agar
    tidak memflagging IP baru yang kebetulan akses 2 endpoint berbeda
    (ratio=1.0 hanya dari 2 request). Rule error disyaratkan minimum
    10 request agar IP dengan 1-2 request error tidak kena false positive.

    Parameters
    ----------
    row : pd.Series
        Satu baris dari result DataFrame.

    Returns
    -------
    tuple[int, list[str]]
        (behavior_risk score 0-100, list alasan yang terpicu)
    """
    behavior_risk = 0
    reasons = []

    # Rule 1: Burst traffic
    # Threshold 5 req/s dipilih sebagai titik di mana traffic burst
    # sulit dijelaskan sebagai browsing normal (sumber: analisis baseline traffic)
    if row["request_per_second"] > BURST_RPS_THRESHOLD:
        behavior_risk += 35
        reasons.append(
            f"Burst traffic ({row['request_per_second']:.2f} req/s > {BURST_RPS_THRESHOLD})"
        )

    # Rule 2: High error rate
    # Error rate >30% mengindikasikan scanning endpoint yang tidak valid
    # atau brute-force yang menghasilkan banyak 401/403/404
    # Minimum request (MIN_REQUESTS_FOR_ERROR_RULE) diperlukan karena IP
    # dengan 1-2 request saja dan salah satunya error akan memiliki error_rate
    # tinggi secara kebetulan, bukan karena aktivitas mencurigakan.
    if (
        row["error_rate"] > HIGH_ERROR_RATE_THRESHOLD
        and row["request_count"] >= MIN_REQUESTS_FOR_ERROR_RULE
    ):
        behavior_risk += 30
        reasons.append(
            f"High error rate ({row['error_rate']:.1%} > {HIGH_ERROR_RATE_THRESHOLD:.0%}, "
            f"n={int(row['request_count'])})"
        )

    # Rule 3: High endpoint variation dengan minimum request yang cukup
    # Ratio tinggi hanya bermakna jika dibarengi volume request yang memadai
    if (
        row["unique_endpoint_ratio"] > HIGH_ENDPOINT_RATIO_THRESHOLD
        and row["request_count"] >= MIN_REQUESTS_FOR_RATIO_RULE
    ):
        behavior_risk += 25
        reasons.append(
            f"High endpoint variation "
            f"(ratio={row['unique_endpoint_ratio']:.2f} > {HIGH_ENDPOINT_RATIO_THRESHOLD}, "
            f"n={int(row['request_count'])})"
        )

    # Rule 4: Volume tinggi disertai intensitas
    # request_count saja tidak cukup karena accumulated buffer bikin
    # semua IP aktif punya count tinggi. Kombinasikan dengan rps
    # untuk membedakan akumulasi umur vs burst nyata.
    if row["request_count"] > 500 and row["request_per_second"] > 1:
        behavior_risk += 10
        reasons.append(
            f"High traffic intensity "
            f"({int(row['request_count'])} requests, "
            f"{row['request_per_second']:.2f} req/s)"
        )

    # Rule 5: IoC Detection (SQLi, XSS, Path Traversal, Code Injection)
    if row.get("has_ioc", False):
        behavior_risk += 60  # Poin tinggi karena merupakan indikator serangan eksplist
        reasons.append("IoC detected (SQLi/XSS/Path Traversal/etc)")

    # Rule 6: Suspicious User-Agent (Scanner / Bot Tools)
    if row.get("has_susp_ua", False):
        behavior_risk += 20
        reasons.append("Suspicious User-Agent (Scanner/Bot)")

    # Clamp ke 0-100 sebelum dikombinasikan
    behavior_risk = min(100, behavior_risk)

    return behavior_risk, reasons


def calculate_risk(result: pd.DataFrame) -> pd.DataFrame:
    """
    Hitung risk score final untuk setiap IP.

    Formula:
        model_risk = normalisasi anomaly_score ke 0-100
                     (score lebih negatif = model_risk lebih tinggi)
        behavior_risk = rule-based scoring 0-100
        risk_score = (WEIGHT_MODEL × model_risk) + (WEIGHT_BEHAVIOR × behavior_risk)

    Normalisasi model_risk menggunakan min-max scaling pada
    anomaly_score dari Isolation Forest. Score yang lebih negatif
    (lebih anomali menurut model) akan menghasilkan model_risk lebih tinggi.

    Parameters
    ----------
    result : pd.DataFrame
        Output dari detect_anomalies() — harus memiliki kolom:
        anomaly_score, request_per_second, error_rate,
        unique_endpoint_ratio, request_count.

    Returns
    -------
    pd.DataFrame
        DataFrame dengan tambahan kolom:
        - model_risk_score  : komponen risiko dari model (0-100)
        - behavior_risk_score: komponen risiko dari rules (0-100)
        - risk_score        : risk score final (0-100)
        - risk_category     : "LOW" / "MEDIUM" / "HIGH"
        - risk_reasons      : list alasan behavior rule yang terpicu
    """
    if result.empty:
        return result

    result = result.copy()

    # --- Normalisasi anomaly_score ke model_risk_score (0-100) ---
    # anomaly_score dari Isolation Forest: semakin negatif = semakin anomali
    # Kita invert: score paling negatif → model_risk paling tinggi (100)
    min_score = result["anomaly_score"].min()
    max_score = result["anomaly_score"].max()
    score_range = max_score - min_score

    if score_range < 1e-6:
        # Semua score sama (edge case) — assign 50 sebagai nilai tengah
        result["model_risk_score"] = 50.0
    else:
        result["model_risk_score"] = (
            (max_score - result["anomaly_score"]) / score_range
        ) * 100

    risk_scores = []
    risk_categories = []
    risk_reasons_list = []
    behavior_risk_scores = []

    for _, row in result.iterrows():
        behavior_risk, reasons = _calculate_behavior_score(row)

        # Formula hybrid: 60% model + 40% behavior
        final_risk = (
            WEIGHT_MODEL * row["model_risk_score"] + WEIGHT_BEHAVIOR * behavior_risk
        )

        # BOOST: Jika behavior rules menunjukkan aktivitas mencurigakan
        # (behavior_risk >= 20), naikkan risk score minimal ke MEDIUM.
        # Ini mencegah IP anomali (error rate tinggi, burst, scanner)
        # lolos hanya karena model_risk_score rendah.
        if behavior_risk >= 20 and final_risk < THRESHOLD_MEDIUM:
            final_risk = THRESHOLD_MEDIUM + (final_risk * 0.1)

        final_risk = min(100.0, round(final_risk, 2))

        # Kategorisasi
        if final_risk >= THRESHOLD_HIGH:
            category = "HIGH"
        elif final_risk >= THRESHOLD_MEDIUM:
            category = "MEDIUM"
        else:
            category = "LOW"

        risk_scores.append(final_risk)
        risk_categories.append(category)
        risk_reasons_list.append(reasons if reasons else ["Normal pattern"])
        behavior_risk_scores.append(behavior_risk)

    result["model_risk_score"] = result["model_risk_score"].round(2)
    result["behavior_risk_score"] = behavior_risk_scores
    result["risk_score"] = risk_scores
    result["risk_category"] = risk_categories
    result["risk_reasons"] = risk_reasons_list

    high_count = sum(1 for c in risk_categories if c == "HIGH")
    medium_count = sum(1 for c in risk_categories if c == "MEDIUM")
    low_count = len(risk_categories) - high_count - medium_count

    logger.info(
        "Risk scoring complete: %d HIGH, %d MEDIUM, %d LOW",
        high_count,
        medium_count,
        low_count,
    )

    return result
