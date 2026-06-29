"""
Main agent runner for log anomaly detection.
Reads nginx logs, runs analysis on accumulated data,
and sends results to the central server via HTTP POST.
Heartbeat runs on a separate thread with its own interval.
"""

import time
import logging
import threading
import requests
from datetime import datetime

from config import load_config
from log_reader import LogReader
from analyzer import feature_engineering, detect_anomalies
from risk_scoring import calculate_risk
from system_info import collect_system_info

logger = logging.getLogger("agent")


def setup_logging(level: str) -> None:
    """Configure logging format and level."""
    numeric_level = getattr(logging, level.upper(), logging.INFO)
    logging.basicConfig(
        level=numeric_level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def build_payload(result_df, max_ips: int, sys_info: dict) -> dict:
    """Build the JSON payload to send to the main server.

    Hanya IP dengan risk_category MEDIUM atau HIGH yang dikirim.
    Jika tidak ada, kirim top N tetap sebagai informasi — tapi tandai
    sebagai LOW_RISK agar dashboard bisa filter.

    ``sys_info`` must contain the keys returned by
    :func:`system_info.collect_system_info`:
    ``version``, ``machine_id``, ``os``, ``hostname``, ``ip_address``.
    """
    # Filter: hanya MEDIUM/HIGH
    suspicious = result_df[result_df["risk_category"].isin(["MEDIUM", "HIGH"])]

    # Kalau ada, kirim semua (atau top N, mana yg lebih kecil)
    if len(suspicious) > 0:
        selected = suspicious.sort_values("risk_score", ascending=False)
        if len(selected) > max_ips:
            selected = selected.head(max_ips)
    else:
        # Fallback: kirim top N biar server tetap liat data
        selected = result_df.sort_values("risk_score", ascending=False).head(max_ips)

    results = []
    for _, row in selected.iterrows():
        results.append({
            "ip": row["ip"],
            "request_count": int(row["request_count"]),
            "error_count": int(row["error_count"]),
            "error_rate": round(float(row["error_rate"]), 4),
            "avg_response_size": round(float(row["avg_response_size"]), 2),
            "response_size_std": round(float(row["response_size_std"]), 2),
            "avg_url_length": round(float(row["avg_url_length"]), 2),
            "has_ioc": bool(row.get("has_ioc", False)),
            "has_susp_ua": bool(row.get("has_susp_ua", False)),
            "request_per_second": round(float(row["request_per_second"]), 4),
            "unique_endpoint_ratio": round(float(row["unique_endpoint_ratio"]), 4),
            "anomaly_score": round(float(row["anomaly_score"]), 4),
            "model_risk_score": round(float(row["model_risk_score"]), 2),
            "behavior_risk_score": int(row["behavior_risk_score"]),
            "risk_score": float(row["risk_score"]),
            "risk_category": row["risk_category"],
            "risk_reasons": row["risk_reasons"],
        })

    return {
        "machine_id": sys_info["machine_id"],
        "version": sys_info["version"],
        "os": sys_info["os"],
        "hostname": sys_info["hostname"],
        "ip_address": sys_info["ip_address"],
        "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "results": results,
    }


def _http_post(
    url: str,
    payload: dict,
    auth_token: str = "",
    retry_max: int = 3,
    retry_backoff: int = 2,
) -> bool:
    """
    Send a JSON payload via HTTP POST with retry and exponential backoff.
    Includes Bearer token in Authorization header.
    """
    headers = {"Content-Type": "application/json"}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"

    for attempt in range(1, retry_max + 1):
        try:
            logger.info(
                "POST %s (attempt %d/%d)...",
                url, attempt, retry_max,
            )
            response = requests.post(
                url,
                json=payload,
                headers=headers,
                timeout=30,
            )

            if response.status_code == 200:
                logger.info("POST %s successful: %s", url, response.json())
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
            logger.error("Unexpected error sending POST to %s: %s", url, e)

        if attempt < retry_max:
            wait_time = retry_backoff ** attempt
            logger.info("Retrying in %d seconds...", wait_time)
            time.sleep(wait_time)

    logger.error("Failed POST to %s after %d attempts", url, retry_max)
    return False


def send_to_server(
    url: str,
    payload: dict,
    auth_token: str = "",
    retry_max: int = 3,
    retry_backoff: int = 2,
) -> bool:
    """Send analysis results to the main server."""
    return _http_post(url, payload, auth_token, retry_max, retry_backoff)


def send_heartbeat(
    url: str,
    sys_info: dict,
    buffer_size: int,
    auth_token: str = "",
    retry_max: int = 3,
    retry_backoff: int = 2,
) -> bool:
    """
    Send a lightweight heartbeat to signal the agent is alive.
    Runs on a separate thread, independent of the analysis cycle.
    """
    payload = {
        "machine_id": sys_info["machine_id"],
        "version": sys_info["version"],
        "os": sys_info["os"],
        "hostname": sys_info["hostname"],
        "ip_address": sys_info["ip_address"],
        "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "buffer_size": buffer_size,
    }
    return _http_post(url, payload, auth_token, retry_max, retry_backoff)


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


def _heartbeat_loop(
    stop_event: threading.Event,
    heartbeat_url: str,
    heartbeat_interval: int,
    config: dict,
    sys_info: dict,
    reader: "LogReader",
) -> None:
    """
    Background loop that sends heartbeat at a fixed interval.
    Runs as a daemon thread — exits automatically when the main thread ends.
    """
    logger.info(
        "Heartbeat thread started (interval: %d seconds)", heartbeat_interval
    )

    # Send first heartbeat immediately on startup
    while not stop_event.is_set():
        try:
            buffer_size = reader.get_buffer_size()
            logger.info("Sending heartbeat (buffer_size=%d)...", buffer_size)
            send_heartbeat(
                heartbeat_url,
                sys_info,
                buffer_size,
                auth_token=config["auth_token"],
                retry_max=config["retry_max"],
                retry_backoff=config["retry_backoff"],
            )
        except Exception as e:
            logger.error("Error in heartbeat: %s", e)

        # Wait for the interval, but check stop_event periodically
        # so the thread can exit promptly on shutdown
        stop_event.wait(timeout=heartbeat_interval)

    logger.info("Heartbeat thread stopped")


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

    # Collect system info once (public IP lookup happens here)
    logger.info("Collecting system information...")
    sys_info = collect_system_info()

    # Initialize log reader with bounded buffer + disk accumulation
    reader = LogReader(
        config["log_path"],
        max_size_mb=config["accumulated_log_max_size_mb"],
        buffer_max_lines=config["buffer_max_lines"],
    )

    api_url = f"{config['server_url'].rstrip('/')}{config['api_endpoint']}"
    heartbeat_url = f"{config['server_url'].rstrip('/')}{config['heartbeat_endpoint']}"

    logger.info("Agent ready. API URL: %s", api_url)
    logger.info("Heartbeat URL: %s", heartbeat_url)
    logger.info("Analysis interval: %d seconds", config["analysis_interval"])
    logger.info("Heartbeat interval: %d seconds", config["heartbeat_interval"])

    # Start heartbeat on a separate daemon thread
    stop_event = threading.Event()
    heartbeat_thread = threading.Thread(
        target=_heartbeat_loop,
        args=(
            stop_event,
            heartbeat_url,
            config["heartbeat_interval"],
            config,
            sys_info,
            reader,
        ),
        daemon=True,
        name="heartbeat",
    )
    heartbeat_thread.start()

    # Main analysis loop
    while True:
        try:
            # 1. Read new log lines (incremental, appends to buffer)
            reader.read_new_lines()
            buffer = reader.get_buffer()
            buffer_size = reader.get_buffer_size()

            # 2. Run analysis on full accumulated buffer if enough data
            if buffer_size < config["min_log_lines"]:
                logger.info(
                    "Waiting for minimum log lines: %d/%d collected, skipping analysis",
                    buffer_size,
                    config["min_log_lines"],
                )
            else:
                logger.info(
                    "Analyzing full accumulated buffer (%d entries)...",
                    buffer_size,
                )
                result = run_analysis(
                    buffer,
                    config["n_estimators"],
                    config["contamination"],
                )

                if result is not None and not result.empty:
                    # Build and send payload (sorted HIGH → LOW, top N IPs)
                    payload = build_payload(
                        result,
                        max_ips=config["max_ips_per_report"],
                        sys_info=sys_info,
                    )

                    logger.info(
                        "Analysis complete: %d IPs analyzed, sending top %d to server...",
                        len(result),
                        len(payload["results"]),
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

    # Signal heartbeat thread to stop and wait for it
    stop_event.set()
    heartbeat_thread.join(timeout=5)
    logger.info("Agent shutdown complete")


if __name__ == "__main__":
    main()