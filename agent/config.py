"""
Configuration management for the log anomaly detection agent.
Priority: CLI args > environment variables > config.yaml > defaults
"""

import argparse
import os
import logging

logger = logging.getLogger(__name__)

# ─── Constants ──────────────────────────────────────────────
ACCUMULATED_LOG_MAX_CAP_MB = 500  # Hard cap for accumulated log size
MAX_IPS_PER_REPORT_CAP = 50       # Hard cap for IPs sent per report

# ─── Defaults ───────────────────────────────────────────────
DEFAULTS = {
    "log_path": "/var/log/nginx/access.log",
    "server_url": "http://localhost:3000",
    "api_endpoint": "/api/log-analysis",
    "server_id": "server-01",
    "auth_token": "",
    "contamination": 0.02,
    "n_estimators": 200,
    "analysis_interval": 300,  # seconds (5 minutes)
    "retry_max": 3,
    "retry_backoff": 2,
    "log_level": "INFO",
    "min_log_lines": 100,                # Minimum lines before first analysis
    "accumulated_log_max_size_mb": 200,   # Max accumulated log file size (MB)
    "max_ips_per_report": 10,             # Number of top-risk IPs to send per report
}


def load_yaml_config(path: str) -> dict:
    """Load configuration from YAML file if it exists."""
    try:
        import yaml

        if os.path.exists(path):
            with open(path, "r") as f:
                data = yaml.safe_load(f)
            if data and isinstance(data, dict):
                logger.info("Loaded config from %s", path)
                return data
    except ImportError:
        logger.warning("pyyaml not installed, skipping config.yaml")
    except Exception as e:
        logger.warning("Failed to load %s: %s", path, e)
    return {}


def parse_cli_args() -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Log Anomaly Detection Agent"
    )
    parser.add_argument("--log-path", type=str, help="Path to nginx access log")
    parser.add_argument("--server-url", type=str, help="Main server base URL")
    parser.add_argument("--api-endpoint", type=str, help="API endpoint path")
    parser.add_argument("--server-id", type=str, help="Unique server identifier")
    parser.add_argument("--auth-token", type=str, help="Bearer token for API authentication")
    parser.add_argument("--contamination", type=float, help="IsolationForest contamination (0.0-1.0)")
    parser.add_argument("--n-estimators", type=int, help="IsolationForest n_estimators")
    parser.add_argument("--analysis-interval", type=int, help="Analysis interval in seconds")
    parser.add_argument("--min-log-lines", type=int, help="Minimum log lines before first analysis")
    parser.add_argument("--accumulated-log-max-size-mb", type=int, help="Max accumulated log file size in MB (max: 500)")
    parser.add_argument("--max-ips-per-report", type=int, help="Number of top-risk IPs to send per report (max: 50)")
    parser.add_argument("--config", type=str, default="config.yaml", help="Path to YAML config file")
    parser.add_argument("--log-level", type=str, help="Logging level (DEBUG, INFO, WARNING, ERROR)")
    return parser.parse_args()


def load_config() -> dict:
    """
    Build final configuration by merging sources.
    Priority: CLI args > env vars > config.yaml > defaults
    """
    # 1) Start with defaults
    config = dict(DEFAULTS)

    # 2) Parse CLI args to get config file path
    cli = parse_cli_args()

    # 3) Overlay YAML config
    yaml_config = load_yaml_config(cli.config)
    for key, value in yaml_config.items():
        normalized_key = key.replace("-", "_")
        if normalized_key in config and value is not None:
            config[normalized_key] = type(config[normalized_key])(value)

    # 4) Overlay environment variables
    env_map = {
        "AGENT_LOG_PATH": "log_path",
        "AGENT_SERVER_URL": "server_url",
        "AGENT_API_ENDPOINT": "api_endpoint",
        "AGENT_SERVER_ID": "server_id",
        "AGENT_AUTH_TOKEN": "auth_token",
        "AGENT_CONTAMINATION": "contamination",
        "AGENT_N_ESTIMATORS": "n_estimators",
        "AGENT_ANALYSIS_INTERVAL": "analysis_interval",
        "AGENT_MIN_LOG_LINES": "min_log_lines",
        "AGENT_ACCUMULATED_LOG_MAX_SIZE_MB": "accumulated_log_max_size_mb",
        "AGENT_MAX_IPS_PER_REPORT": "max_ips_per_report",
        "AGENT_LOG_LEVEL": "log_level",
    }
    for env_key, config_key in env_map.items():
        env_val = os.environ.get(env_key)
        if env_val is not None:
            config[config_key] = type(config[config_key])(env_val)

    # 5) Overlay CLI args (highest priority)
    cli_map = {
        "log_path": cli.log_path,
        "server_url": cli.server_url,
        "api_endpoint": cli.api_endpoint,
        "server_id": cli.server_id,
        "auth_token": cli.auth_token,
        "contamination": cli.contamination,
        "n_estimators": cli.n_estimators,
        "analysis_interval": cli.analysis_interval,
        "min_log_lines": cli.min_log_lines,
        "accumulated_log_max_size_mb": cli.accumulated_log_max_size_mb,
        "max_ips_per_report": cli.max_ips_per_report,
        "log_level": cli.log_level,
    }
    for config_key, cli_val in cli_map.items():
        if cli_val is not None:
            config[config_key] = cli_val

    # ─── Validation ─────────────────────────────────────────
    if config["accumulated_log_max_size_mb"] > ACCUMULATED_LOG_MAX_CAP_MB:
        logger.warning(
            "accumulated_log_max_size_mb=%d exceeds maximum %dMB, clamping to %dMB",
            config["accumulated_log_max_size_mb"],
            ACCUMULATED_LOG_MAX_CAP_MB,
            ACCUMULATED_LOG_MAX_CAP_MB,
        )
        config["accumulated_log_max_size_mb"] = ACCUMULATED_LOG_MAX_CAP_MB

    if config["min_log_lines"] < 1:
        logger.warning(
            "min_log_lines=%d is invalid, setting to 1",
            config["min_log_lines"],
        )
        config["min_log_lines"] = 1

    if config["max_ips_per_report"] > MAX_IPS_PER_REPORT_CAP:
        logger.warning(
            "max_ips_per_report=%d exceeds maximum %d, clamping to %d",
            config["max_ips_per_report"],
            MAX_IPS_PER_REPORT_CAP,
            MAX_IPS_PER_REPORT_CAP,
        )
        config["max_ips_per_report"] = MAX_IPS_PER_REPORT_CAP

    if config["max_ips_per_report"] < 1:
        logger.warning(
            "max_ips_per_report=%d is invalid, setting to 1",
            config["max_ips_per_report"],
        )
        config["max_ips_per_report"] = 1

    return config
