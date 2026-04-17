"""
Feature engineering and anomaly detection using Isolation Forest.

Fitur yang digunakan per IP address:
+---------------------+--------------------------------------------------+
| Fitur               | Alasan Pemilihan                                 |
+---------------------+--------------------------------------------------+
| request_count       | Volume traffic — baseline aktivitas IP           |
| error_rate          | Proporsi error (4xx/5xx) — scanner/fuzzer        |
|                     | cenderung memiliki error rate tinggi             |
| avg_response_size   | Scanner/crawler cenderung mendapat respons kecil |
|                     | (403/404) sehingga rata-rata ukuran rendah       |
| response_size_std   | Konsistensi ukuran respons — scanner otomatis    |
|                     | biasanya sangat konsisten (std mendekati 0)      |
| avg_url_length      | URL panjang berkorelasi dengan path traversal,   |
|                     | injection attempt, atau parameter fuzzing        |
| request_per_second  | Indikator burst traffic / rate-based attack      |
| unique_endpoint_ratio | Rasio eksplorasi endpoint — crawling/scanning  |
|                     | memiliki rasio tinggi (banyak endpoint berbeda)  |
+---------------------+--------------------------------------------------+

Catatan: is_api_user_agent tidak dimasukkan sebagai fitur model karena
bersifat kontekstual dan dapat menyebabkan bias. Digunakan sebagai
post-processing score adjustment.

Referensi pendekatan:
- Liu, F.T., Ting, K.M., Zhou, Z.H. (2008). Isolation Forest. ICDM.
- Chandola, V., Banerjee, A., Kumar, V. (2009). Anomaly Detection: A Survey. ACM.
"""

import logging
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import RobustScaler

logger = logging.getLogger(__name__)

# User-agent patterns considered as API/bot clients
API_USER_AGENTS = ["Dart", "curl", "Postman", "python", "Go-http-client"]
API_UA_PATTERN = "|".join(API_USER_AGENTS)

# Fitur yang digunakan sebagai input model Isolation Forest
MODEL_FEATURE_COLS = [
    "request_count",
    "error_rate",
    "avg_response_size",
    "response_size_std",
    "avg_url_length",
    "request_per_second",
    "unique_endpoint_ratio",
]


def feature_engineering(log_entries: list[dict]) -> pd.DataFrame:
    """
    Ekstraksi fitur per IP address dari raw log entries.

    Setiap IP direpresentasikan sebagai satu baris fitur yang
    merangkum seluruh perilakunya dalam window waktu analisis.

    Parameters
    ----------
    log_entries : list[dict]
        List log entry hasil parsing nginx log.

    Returns
    -------
    pd.DataFrame
        DataFrame dengan satu baris per IP dan kolom-kolom fitur.
    """
    if not log_entries:
        return pd.DataFrame()

    df = pd.DataFrame(log_entries)
    df = df.sort_values("timestamp")

    grouped = []

    for ip, group in df.groupby("ip"):
        request_count = len(group)

        # --- Error metrics ---
        error_count = int((group["status"] >= 400).sum())
        error_rate = error_count / request_count  # proporsi, bukan absolut

        # --- Response size metrics ---
        # std=0 dengan ddof=0 agar tidak NaN saat hanya 1 request
        avg_response_size = float(group["size"].mean())
        response_size_std = float(group["size"].std(ddof=0))

        # --- URL characteristics ---
        avg_url_length = float(group["url_length"].mean())

        # --- Request rate ---
        time_diff = (
            group["timestamp"].max() - group["timestamp"].min()
        ).total_seconds()
        # Jika semua request dalam waktu bersamaan (time_diff=0),
        # gunakan request_count sebagai proxy burst rate
        if time_diff == 0:
            request_per_second = float(request_count)
        else:
            request_per_second = request_count / time_diff

        # --- Endpoint diversity ---
        unique_url_count = int(group["url"].nunique())
        # Rasio: seberapa besar proporsi endpoint unik dari total request
        # Nilai tinggi (mendekati 1.0) mengindikasikan eksplorasi/scanning
        unique_endpoint_ratio = unique_url_count / request_count

        # --- User agent context (tidak masuk model, hanya metadata) ---
        is_api_user_agent = int(
            group["user_agent"]
            .str.contains(API_UA_PATTERN, case=False, regex=True)
            .any()
        )

        grouped.append({
            "ip": ip,
            # Metadata (tidak masuk model)
            "request_count": request_count,
            "error_count": error_count,
            "is_api_user_agent": is_api_user_agent,
            # Fitur model
            "error_rate": round(error_rate, 4),
            "avg_response_size": round(avg_response_size, 2),
            "response_size_std": round(response_size_std, 2),
            "avg_url_length": round(avg_url_length, 2),
            "request_per_second": round(request_per_second, 4),
            "unique_endpoint_ratio": round(unique_endpoint_ratio, 4),
        })

    result = pd.DataFrame(grouped)
    logger.info("Feature engineering complete: %d IPs extracted", len(result))
    return result


def _adjust_scores_for_known_clients(
    features: pd.DataFrame,
    scores: np.ndarray,
    boost: float = 0.15,
) -> np.ndarray:
    """
    Geser anomaly score ke arah 'lebih normal' untuk IP dengan
    user-agent yang teridentifikasi sebagai API/bot client legitimate.

    Latar belakang: Isolation Forest tidak mengetahui konteks bahwa
    API client (curl, Postman, SDK) secara inheren memiliki pola
    request_per_second dan request_count tinggi yang berbeda dari
    browser biasa. Tanpa penyesuaian ini, client legitimate akan
    sering menjadi false positive.

    Nilai boost 0.15 dipilih berdasarkan observasi bahwa gap antara
    cluster normal dan anomali pada decision_function umumnya berada
    di rentang 0.1–0.3.

    Parameters
    ----------
    features : pd.DataFrame
        DataFrame fitur dengan kolom 'is_api_user_agent'.
    scores : np.ndarray
        Raw anomaly scores dari model.decision_function().
    boost : float
        Nilai penambahan score (positif = lebih normal).

    Returns
    -------
    np.ndarray
        Scores yang telah disesuaikan.
    """
    adjusted = scores.copy()
    api_mask = features["is_api_user_agent"].values == 1
    adjusted[api_mask] += boost

    if api_mask.sum() > 0:
        logger.info(
            "Score adjustment applied to %d API client IPs (boost=+%.2f)",
            api_mask.sum(),
            boost,
        )

    return adjusted


def detect_anomalies(
    features: pd.DataFrame,
    n_estimators: int = 200,
    contamination: float = 0.02,
    api_score_boost: float = 0.15,
) -> pd.DataFrame:
    """
    Jalankan Isolation Forest pada feature matrix dan hasilkan
    label anomali serta anomaly score per IP.

    Alur:
    1. Pilih kolom fitur model (MODEL_FEATURE_COLS)
    2. Scaling dengan RobustScaler
    3. Fit dan predict dengan Isolation Forest
    4. Adjust score untuk API client (post-processing)
    5. Tentukan threshold dari percentile adjusted score

    Mengapa RobustScaler?
    Isolation Forest secara teoritis tidak memerlukan scaling karena
    bekerja dengan binary splitting. Namun dalam praktik, fitur dengan
    skala sangat berbeda (misalnya avg_response_size dalam ribuan vs
    error_rate dalam 0-1) dapat mempengaruhi kedalaman pemisahan.
    RobustScaler menggunakan median dan IQR sehingga lebih tahan
    terhadap outlier dibanding StandardScaler.

    Mengapa threshold dari percentile, bukan predict() langsung?
    model.predict() menggunakan contamination sebagai batas tetap,
    yang berarti selalu ada sejumlah IP yang dianggap anomali meski
    semua traffic normal. Dengan threshold manual dari percentile
    pada adjusted score, kita bisa lebih fleksibel.

    Parameters
    ----------
    features : pd.DataFrame
        Output dari feature_engineering().
    n_estimators : int
        Jumlah pohon Isolation Forest.
    contamination : float
        Proporsi anomali yang diharapkan (0-0.5).
    api_score_boost : float
        Nilai boost score untuk API client legitimate.

    Returns
    -------
    pd.DataFrame
        DataFrame dengan tambahan kolom:
        - anomaly: 1 (normal) atau -1 (anomali)
        - anomaly_score: adjusted decision function score
        - anomaly_score_raw: raw score sebelum adjustment (untuk debug)
    """
    if features.empty:
        return features

    X = features[MODEL_FEATURE_COLS].copy()

    # RobustScaler: scaling berbasis median & IQR, tahan outlier
    scaler = RobustScaler()
    X_scaled = scaler.fit_transform(X)

    model = IsolationForest(
        n_estimators=n_estimators,
        contamination=contamination,
        random_state=42,
    )
    model.fit(X_scaled)

    # decision_function: semakin negatif = semakin anomali
    raw_scores = model.decision_function(X_scaled)

    # Post-processing: adjust score untuk API client legitimate
    adjusted_scores = _adjust_scores_for_known_clients(
        features, raw_scores, boost=api_score_boost
    )

    # Threshold dari percentile adjusted score
    # Misal contamination=0.02 → threshold di percentile ke-2
    threshold = np.percentile(adjusted_scores, contamination * 100)
    predictions = np.where(adjusted_scores < threshold, -1, 1)

    result = features.copy()
    result["anomaly"] = predictions
    result["anomaly_score"] = adjusted_scores
    result["anomaly_score_raw"] = raw_scores  # simpan untuk debugging/analisis

    anomaly_count = (result["anomaly"] == -1).sum()
    logger.info(
        "Anomaly detection complete: %d anomalies out of %d IPs "
        "(threshold=%.4f, contamination=%.2f%%)",
        anomaly_count,
        len(result),
        threshold,
        contamination * 100,
    )

    return result