"""
Risk scoring system for anomaly detection results.
Combines model-based anomaly score with rule-based behavior scoring.
"""

import logging
import pandas as pd

logger = logging.getLogger(__name__)


def calculate_risk(result: pd.DataFrame) -> pd.DataFrame:
    """
    Calculate risk score (0-100) for each IP.

    Formula: 60% model_risk_score + 40% behavior_risk_score

    Behavior rules:
    - +25 if request_per_second > 3 (burst traffic)
    - +20 if error_rate > 0.3 (high error rate)
    - +20 if unique_endpoint_ratio > 0.6 (high endpoint variation)
    - +15 if is_api_user_agent == 1 (suspicious user agent)
    - +10 if request_count > 150 AND unique_endpoint_ratio > 0.4 (high volume with diverse endpoints)

    Categories:
    - LOW:    0-39
    - MEDIUM: 40-69
    - HIGH:   70-100
    """
    if result.empty:
        return result

    result = result.copy()

    # Normalize anomaly score to 0-100 (model risk)
    min_score = result["anomaly_score"].min()
    max_score = result["anomaly_score"].max()
    score_range = max_score - min_score + 1e-6

    result["model_risk_score"] = (
        (max_score - result["anomaly_score"]) / score_range
    ) * 100

    risk_scores = []
    risk_categories = []
    risk_reasons_list = []

    for _, row in result.iterrows():
        behavior_risk = 0
        reasons = []

        # Rule 1: Burst traffic (lowered threshold to catch real spikes sooner)
        if row["request_per_second"] > 3:
            behavior_risk += 25
            reasons.append("Burst traffic (>3 req/s)")

        # Rule 2: High error rate
        if row["error_rate"] > 0.3:
            behavior_risk += 20
            reasons.append("High error rate")

        # Rule 3: High endpoint variation
        if row["unique_endpoint_ratio"] > 0.6:
            behavior_risk += 20
            reasons.append("High endpoint variation (>0.6 ratio)")

        # Rule 4: Suspicious user agent
        if row["is_api_user_agent"] == 1:
            behavior_risk += 15
            reasons.append("Suspicious user agent")

        # Rule 5: High volume with diverse endpoints
        # Avoids penalizing normal users who repeatedly call a small set of endpoints
        if row["request_count"] > 150 and row["unique_endpoint_ratio"] > 0.4:
            behavior_risk += 10
            reasons.append("High volume with diverse endpoints (>150 reqs, ratio>0.4)")

        # Combine: 60% model + 40% behavior
        final_risk = 0.6 * row["model_risk_score"] + 0.4 * behavior_risk
        final_risk = min(100, round(final_risk, 2))

        # Categorize
        if final_risk >= 70:
            category = "HIGH"
        elif final_risk >= 40:
            category = "MEDIUM"
        else:
            category = "LOW"

        risk_scores.append(final_risk)
        risk_categories.append(category)
        risk_reasons_list.append(reasons if reasons else ["Normal pattern"])

    result["risk_score"] = risk_scores
    result["risk_category"] = risk_categories
    result["risk_reasons"] = risk_reasons_list

    high_count = sum(1 for c in risk_categories if c == "HIGH")
    medium_count = sum(1 for c in risk_categories if c == "MEDIUM")
    logger.info(
        "Risk scoring complete: %d HIGH, %d MEDIUM, %d LOW",
        high_count,
        medium_count,
        len(risk_categories) - high_count - medium_count,
    )

    return result
