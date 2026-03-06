"""
Main agent runner for log anomaly detection.
Reads nginx logs, runs analysis on a configurable interval,
and sends results to the central server via HTTP POST.
"""

import time
import json
import logging
import requests
from datetime import datetime, timedelta

from config import load_config
from log_reader import LogReader
from analyzer import feature_engineering, detect_anomalies
from risk_scoring import calculate_risk

logger = logging.getLogger("agent")


def setup_logging(level: str) -> None:
    """Configure logging format and level."""
    numeric_level = getattr(logging, level.upper(), logging.INFO)
    logging.basicConfig(
        level=numeric_level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def build_payload(server_id: str, result_df) -> dict:
    """Build the JSON payload to send to the main server."""
    results = []

    for _, row in result_df.iterrows():
        results.append({
            "ip": row["ip"],
            "request_count": int(row["request_count"]),
            "error_count": int(row["error_count"]),
            "request_per_second": round(float(row["request_per_second"]), 4),
            "unique_endpoint_ratio": round(float(row["unique_endpoint_ratio"]), 4),
            "risk_score": float(row["risk_score"]),
            "risk_category": row["risk_category"],
            "risk_reasons": row["risk_reasons"],
        })

    return {
        "server_id": server_id,
        "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "results": results,
    }


def send_to_server(
    url: str,
    payload: dict,
    auth_token: str = "",
    retry_max: int = 3,
    retry_backoff: int = 2,
) -> bool:
    """
    Send analysis results to the main server via HTTP POST.
    Implements retry with exponential backoff.
    Includes Bearer token in Authorization header.
    """
    headers = {"Content-Type": "application/json"}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"

    for attempt in range(1, retry_max + 1):
        try:
            logger.info(
                "Sending results to %s (attempt %d/%d)...",
                url, attempt, retry_max,
            )
            response = requests.post(
                url,
                data=json.dumps(payload),
                headers=headers,
                timeout=30,
            )

            if response.status_code == 200:
                logger.info("Results sent successfully: %s", response.json())
                return True
            else:
                logger.warning(
                    "Server returned status %d: %s",
                    response.status_code,
                    response.text,
                )

        except requests.exceptions.ConnectionError:
            logger.error("Connection failed to %s", url)
        except requests.exceptions.Timeout:
            logger.error("Request timed out to %s", url)
        except Exception as e:
            logger.error("Unexpected error sending results: %s", e)

        if attempt < retry_max:
            wait_time = retry_backoff ** attempt
            logger.info("Retrying in %d seconds...", wait_time)
            time.sleep(wait_time)

    logger.error("Failed to send results after %d attempts", retry_max)
    return False


def filter_window(buffer: list[dict], window_seconds: int) -> list[dict]:
    """Filter log entries to only include the last N seconds."""
    if not buffer:
        return []

    cutoff = datetime.now() - timedelta(seconds=window_seconds)
    return [entry for entry in buffer if entry["timestamp"] >= cutoff]


def run_analysis(
    log_entries: list[dict],
    n_estimators: int,
    contamination: float,
) -> object:
    """Run the full analysis pipeline: features → anomaly detection → risk scoring."""
    if not log_entries:
        logger.info("No log entries to analyze")
        return None

    if len(log_entries) < 5:
        logger.info("Too few log entries (%d) for meaningful analysis, skipping", len(log_entries))
        return None

    # 1. Feature engineering
    logger.info("Running feature engineering on %d log entries...", len(log_entries))
    features = feature_engineering(log_entries)

    if features.empty:
        logger.info("No features extracted")
        return None

    # 2. Anomaly detection
    logger.info("Running Isolation Forest...")
    result = detect_anomalies(features, n_estimators, contamination)

    # 3. Risk scoring
    logger.info("Calculating risk scores...")
    result = calculate_risk(result)

    return result


def main():
    """Main agent loop."""
    config = load_config()
    setup_logging(config["log_level"])

    logger.info("=" * 60)
    logger.info("Log Anomaly Detection Agent Starting")
    logger.info("=" * 60)
    logger.info("Configuration:")
    for key, value in config.items():
        # Mask sensitive values in logs
        display_val = "****" if key == "auth_token" and value else value
        logger.info("  %s: %s", key, display_val)

    # Initialize log reader
    reader = LogReader(config["log_path"])
    api_url = f"{config['server_url'].rstrip('/')}{config['api_endpoint']}"
    is_first_run = True

    logger.info("Agent ready. API URL: %s", api_url)
    logger.info("Analysis interval: %d seconds", config["analysis_interval"])

    while True:
        try:
            # Read new log lines (incremental)
            new_entries = reader.read_new_lines()
            buffer = reader.get_buffer()

            if is_first_run:
                # First run: analyze all accumulated log data
                logger.info("First run — analyzing full buffer (%d entries)", len(buffer))
                analysis_entries = buffer
                is_first_run = False
            else:
                # Subsequent runs: analyze only the last 5-minute window
                analysis_entries = filter_window(
                    buffer, config["analysis_interval"]
                )
                logger.info(
                    "Window analysis: %d entries in last %d seconds (buffer total: %d)",
                    len(analysis_entries),
                    config["analysis_interval"],
                    len(buffer),
                )

            # Run analysis pipeline
            result = run_analysis(
                analysis_entries,
                config["n_estimators"],
                config["contamination"],
            )

            if result is not None and not result.empty:
                # Build and send payload
                payload = build_payload(config["server_id"], result)

                logger.info(
                    "Analysis complete: %d IPs analyzed, sending to server...",
                    len(result),
                )

                send_to_server(
                    api_url,
                    payload,
                    auth_token=config["auth_token"],
                    retry_max=config["retry_max"],
                    retry_backoff=config["retry_backoff"],
                )
            else:
                logger.info("No results to send this cycle")

        except KeyboardInterrupt:
            logger.info("Agent stopped by user")
            break
        except Exception as e:
            logger.error("Error in analysis cycle: %s", e, exc_info=True)

        # Wait for next analysis window
        logger.info(
            "Next analysis in %d seconds...", config["analysis_interval"]
        )
        try:
            time.sleep(config["analysis_interval"])
        except KeyboardInterrupt:
            logger.info("Agent stopped by user")
            break

    logger.info("Agent shutdown complete")


if __name__ == "__main__":
    main()
