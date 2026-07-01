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
import re
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import RobustScaler

logger = logging.getLogger(__name__)

# Pola-pola Indikator Kompromi (IoC) di URL dan User-Agent
# Untuk perbandingan
# Referensi: Chua et al. (2024) — URI_occurrences, IOC_occurrences
IOC_PATTERNS = [
    r"(%27|%22|%3C|%3E|%3D|%3B)",
    r"\b(union\s+select|select\s+.*\s+from|insert\s+into|drop\s+table)",
    r"(--|#|;)\s*$",
    r"(<script|alert\(|onerror=|onload=|onclick=|javascript:)",
    r"(%3Cscript|%3E%3C|%3Ciframe)",
    r"(\.\./|\.\.\\){2,}",
    r"(/etc/passwd|/proc/self|/boot/grub|/windows/system32)",
    r"(cmd=|exec=|eval=|system\(|passthru\(|shell_exec)",
    r"(`.*`|\$\(.*\))",
    r"(\x00|\x04|\x08|\x0d|\x1b|\x7f)",
]
IOC_REGEX = re.compile("|".join(IOC_PATTERNS), re.IGNORECASE)

# Suspicious User-Agent patterns (headless, empty, or unusual)
SUSPICIOUS_UA_PATTERNS = [
    # r"^$",
    # r"^[\s\-]*$",
    # r"^[A-Z]+/\d+\.\d+",
    # r"curl/\d+",
    # r"Wget/\d+",
    # r"(Go-http-client|okhttp|axios|aiohttp|httpx|requests)",
    r"(masscan|nmap|zgrab|Nikto|sqlmap|acunetix|dirb|gobuster|hydra)",
]
SUSPICIOUS_UA_REGEX = re.compile("|".join(SUSPICIOUS_UA_PATTERNS), re.IGNORECASE)

# User-agent patterns considered as API/bot clients (legitimate)
API_USER_AGENTS = [
    "Dart",
    "curl",
    "Postman",
    "python",
    "Go-http-client",
    "Googlebot",
    "bingbot",
    "Bingbot",
    "Slurp",
    "YandexBot",
    "DuckDuckBot",
    "Baiduspider",
    "facebot",
    "facebookexternalhit",
    "GPTBot",
    "Claude-Web",
    "CCBot",
    "anthropic-ai",
    "PerplexityBot",
    "UptimeRobot",
    "Pingdom",
    "Datadog",
    "Feedfetcher",
    "W3C_Validator",
]
API_UA_PATTERN = "|".join(API_USER_AGENTS)

# Fitur yang digunakan sebagai input model Isolation Forest per-IP
MODEL_FEATURE_COLS = [
    "request_count",
    "error_rate",
    "avg_response_size",
    "response_size_std",
    "avg_url_length",
    "request_per_second",
    "unique_endpoint_ratio",
]


def _detect_ioc(text: str) -> bool:
    """Cek apakah string mengandung pola Indikator Kompromi."""
    if not text:
        return False
    return bool(IOC_REGEX.search(text))


def _is_suspicious_ua(ua: str) -> bool:
    """Cek apakah User-Agent mencurigakan (headless, empty, scan tool)."""
    if not ua or not ua.strip():
        return True
    return bool(SUSPICIOUS_UA_REGEX.search(ua))


# ============================================================
# FITUR TAMBAHAN PER-IP (dari agregasi raw request)
# ============================================================


def feature_engineering(log_entries: list[dict]) -> pd.DataFrame:
    """
    Ekstraksi fitur per IP address dari raw log entries.

    Setiap IP direpresentasikan sebagai satu baris fitur yang merangkum
    seluruh perilakunya.
    - error_rate dan unique_endpoint_ratio menggunakan nilai agregat global
      agar tahan terhadap spike kecil yang biasa terjadi pada user normal.
    - request_per_second menggunakan peak 1-minute bin agar terhindar
      dari dilusi waktu saat memproses rentang log yang panjang.
    """
    if not log_entries:
        return pd.DataFrame()

    df = pd.DataFrame(log_entries)
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)

    # Deteksi IoC di URL atau Suspicious UA
    df["has_ioc"] = df["url"].fillna("").astype(str).str.contains(IOC_REGEX)
    df["has_susp_ua"] = (
        df["user_agent"].fillna("").astype(str).str.contains(SUSPICIOUS_UA_REGEX)
    )

    # 1. Global aggregates per IP
    ip_stats = df.groupby("ip").agg(
        request_count=("url", "size"),
        unique_url_count=("url", "nunique"),
        error_count=("status", lambda x: (x >= 400).sum()),
        avg_response_size=("size", "mean"),
        response_size_std=("size", lambda x: x.std(ddof=0)),
        avg_url_length=("url_length", "mean"),
        is_api_user_agent=(
            "user_agent",
            lambda x: int(
                x.fillna("").str.contains(API_UA_PATTERN, case=False, regex=True).any()
            ),
        ),
        has_ioc=("has_ioc", "max"),
        has_susp_ua=("has_susp_ua", "max"),
    )

    # Hitung error rate dan unique ratio secara global (seperti code asli yang dapet 90%)
    ip_stats["error_rate"] = ip_stats["error_count"] / ip_stats["request_count"]
    ip_stats["unique_endpoint_ratio"] = (
        ip_stats["unique_url_count"] / ip_stats["request_count"]
    )

    # 2. Peak RPS feature (1-minute bin)
    df_ts = df.set_index("timestamp")

    bin_stats = (
        df_ts.groupby([pd.Grouper(freq="1min"), "ip"])
        .agg(req_count=("url", "size"))
        .reset_index()
    )

    # Cari peak requests per menit untuk menghindari dilusi waktu
    max_req_stats = bin_stats.groupby("ip").agg(max_req_1m=("req_count", "max"))

    # 3. Gabungkan
    result = ip_stats.join(max_req_stats).reset_index()

    # 4. Format sesuai ekspektasi model
    result["error_rate"] = result["error_rate"].round(4)
    result["unique_endpoint_ratio"] = result["unique_endpoint_ratio"].round(4)
    result["request_per_second"] = (result["max_req_1m"] / 60.0).round(4)

    result["avg_response_size"] = result["avg_response_size"].round(2)
    result["response_size_std"] = result["response_size_std"].round(2)
    result["avg_url_length"] = result["avg_url_length"].round(2)

    # Drop kolom sementara
    result = result.drop(columns=["unique_url_count", "max_req_1m"])

    logger.info("Feature engineering complete: %d IPs extracted", len(result))
    return result


# ============================================================
# DETEKSI PER-REQUEST (seperti paper Chua et al. 2024) Untuk perbandingan
# ============================================================

REQUEST_FEATURE_COLS = [
    "url_length",
    "response_size_kb",
    "ua_length",
    "has_ioc",
    "has_suspicious_ua",
    "hour_sin",
    "hour_cos",
    "method_get",
    "method_post",
    "status_2xx",
    "status_3xx",
    "status_4xx",
    "status_5xx",
    "uri_log_freq",
    "ua_log_freq",
    "uri_length_ratio",
]


def _compute_global_frequencies(df: pd.DataFrame) -> tuple:
    uri_freq = df.groupby("url")["ip"].transform("count")
    ua_freq = df.groupby("user_agent")["ip"].transform("count")
    return uri_freq, ua_freq


def feature_engineering_request_level(log_entries: list[dict]) -> pd.DataFrame:
    """Fitur per-request. Setiap baris = 1 sampel (mirip paper Chua et al. 2024)."""
    if not log_entries:
        return pd.DataFrame()

    df = pd.DataFrame(log_entries)
    result = df[["ip", "url", "user_agent"]].copy()

    uri_freq, ua_freq = _compute_global_frequencies(df)
    result["uri_log_freq"] = np.log1p(uri_freq.values)
    result["ua_log_freq"] = np.log1p(ua_freq.values)

    result["url_length"] = df["url_length"].values
    result["ua_length"] = df["user_agent"].str.len().values
    mean_ul = df["url_length"].mean() + 1
    result["uri_length_ratio"] = df["url_length"] / mean_ul

    result["response_size_kb"] = (df["size"] / 1024).values
    result["has_ioc"] = df["url"].apply(_detect_ioc).astype(int)
    result["has_suspicious_ua"] = df["user_agent"].apply(_is_suspicious_ua).astype(int)

    s = df["status"]
    result["status_2xx"] = ((s >= 200) & (s < 300)).astype(int)
    result["status_3xx"] = ((s >= 300) & (s < 400)).astype(int)
    result["status_4xx"] = ((s >= 400) & (s < 500)).astype(int)
    result["status_5xx"] = (s >= 500).astype(int)

    m = df["method"].str.upper()
    result["method_get"] = (m == "GET").astype(int)
    result["method_post"] = (m == "POST").astype(int)

    h = df["hour"].values
    result["hour_sin"] = np.sin(2 * np.pi * h / 24)
    result["hour_cos"] = np.cos(2 * np.pi * h / 24)

    logger.info(
        "Request-level features: %d entries, %d cols", len(result), len(result.columns)
    )
    return result


def detect_anomalies_request_level(
    request_features: pd.DataFrame,
    contamination: float = 0.03,
    n_estimators: int = 200,
    max_samples: float = 0.25,
) -> pd.DataFrame:
    """IF per-request (parameter sesuai paper Chua et al. 2024)."""
    if request_features.empty:
        return request_features

    X = request_features[REQUEST_FEATURE_COLS].copy()
    scaler = RobustScaler()
    X_scaled = scaler.fit_transform(X)

    model = IsolationForest(
        n_estimators=n_estimators,
        contamination=contamination,
        max_samples=max_samples,
        random_state=42,
    )
    model.fit(X_scaled)

    raw_scores = model.decision_function(X_scaled)
    predictions = model.predict(X_scaled)

    result = request_features.copy()
    result["req_anomaly_raw"] = raw_scores
    result["req_anomaly"] = predictions

    anom = int((predictions == -1).sum())
    logger.info(
        "Request-level IF: %d/%d anomalous (%.2f%%)",
        anom,
        len(result),
        100 * anom / len(result),
    )
    return result


# ============================================================
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
