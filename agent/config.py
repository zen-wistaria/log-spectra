"""
Configuration management for the log anomaly detection agent.
Priority: CLI args > environment variables > config.yaml > defaults
"""

import argparse
import os
import logging

logger = logging.getLogger(__name__)

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
        "log_level": cli.log_level,
    }
    for config_key, cli_val in cli_map.items():
        if cli_val is not None:
            config[config_key] = cli_val

    return config
