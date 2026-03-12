"""
Feature engineering and anomaly detection using Isolation Forest.
Adapted from agent/analyzer.py for use in the FastAPI manual analysis service.
"""

import logging
import pandas as pd
from sklearn.ensemble import IsolationForest

logger = logging.getLogger(__name__)

# User-agent patterns considered as API/bot clients
API_USER_AGENTS = ["Dart", "curl", "Postman", "python", "Go-http-client"]
API_UA_PATTERN = "|".join(API_USER_AGENTS)


def feature_engineering(log_entries: list[dict]) -> pd.DataFrame:
    """
    Extract per-IP features from raw log entries.

    Features per IP:
    - request_count
    - error_count
    - error_rate
    - avg_response_size
    - avg_url_length
    - request_per_second
    - unique_url_count
    - unique_endpoint_ratio
    - is_api_user_agent
    """
    if not log_entries:
        return pd.DataFrame()

    df = pd.DataFrame(log_entries)
    df = df.sort_values("timestamp")

    grouped = []

    for ip, group in df.groupby("ip"):
        request_count = len(group)
        error_count = int((group["status"] >= 400).sum())
        avg_response_size = float(group["size"].mean())
        avg_url_length = float(group["url_length"].mean())

        # Request per second
        time_diff = (
            group["timestamp"].max() - group["timestamp"].min()
        ).total_seconds()
        if time_diff == 0:
            request_per_second = float(request_count)
        else:
            request_per_second = request_count / time_diff

        # Unique URL and endpoint ratio
        unique_url_count = int(group["url"].nunique())
        unique_endpoint_ratio = unique_url_count / request_count

        # API user agent detection
        is_api_user_agent = int(
            group["user_agent"]
            .str.contains(API_UA_PATTERN, case=False, regex=True)
            .any()
        )

        error_rate = error_count / request_count

        grouped.append({
            "ip": ip,
            "request_count": request_count,
            "error_count": error_count,
            "error_rate": error_rate,
            "avg_response_size": avg_response_size,
            "avg_url_length": avg_url_length,
            "request_per_second": round(request_per_second, 4),
            "unique_url_count": unique_url_count,
            "unique_endpoint_ratio": round(unique_endpoint_ratio, 4),
            "is_api_user_agent": is_api_user_agent,
        })

    result = pd.DataFrame(grouped)
    logger.info("Feature engineering complete: %d IPs extracted", len(result))
    return result


def detect_anomalies(
    features: pd.DataFrame,
    n_estimators: int = 200,
    contamination: float = 0.02,
) -> pd.DataFrame:
    """
    Run Isolation Forest on the feature matrix.
    Adds 'anomaly' and 'anomaly_score' columns to the DataFrame.
    """
    if features.empty:
        return features

    # Select only numeric feature columns for the model
    feature_cols = [
        "request_count",
        "error_count",
        "error_rate",
        "avg_response_size",
        "avg_url_length",
        "request_per_second",
        "unique_url_count",
        "unique_endpoint_ratio",
        "is_api_user_agent",
    ]

    X = features[feature_cols].copy()

    model = IsolationForest(
        n_estimators=n_estimators,
        contamination=contamination,
        random_state=42,
    )

    model.fit(X)

    features = features.copy()
    features["anomaly"] = model.predict(X)
    features["anomaly_score"] = model.decision_function(X)

    anomaly_count = (features["anomaly"] == -1).sum()
    logger.info(
        "Anomaly detection complete: %d anomalies found out of %d IPs",
        anomaly_count,
        len(features),
    )

    return features
