"""
Nginx access log parser.
Extracts structured data from standard nginx combined log format lines.
"""

import re
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Nginx combined log format pattern
LOG_PATTERN = re.compile(
    r'(?P<ip>\S+) - - \[(?P<time>.*?)\] '
    r'"(?P<method>\S+) (?P<url>\S+) .*?" '
    r'(?P<status>\d+) (?P<size>\d+) '
    r'".*?" "(?P<user_agent>.*?)"'
)


def parse_log_line(line: str) -> dict | None:
    """Parse a single nginx log line into a structured dict."""
    match = LOG_PATTERN.search(line)
    if not match:
        return None

    data = match.groupdict()

    try:
        time_obj = datetime.strptime(
            data["time"].split()[0], "%d/%b/%Y:%H:%M:%S"
        )
    except ValueError:
        logger.warning("Failed to parse timestamp: %s", data["time"])
        return None

    return {
        "ip": data["ip"],
        "timestamp": time_obj,
        "method": data["method"],
        "url": data["url"],
        "status": int(data["status"]),
        "size": int(data["size"]),
        "url_length": len(data["url"]),
        "hour": time_obj.hour,
        "user_agent": data["user_agent"],
    }


def parse_log_content(content: str) -> list[dict]:
    """
    Parse entire log file content into a list of structured dicts.
    Skips lines that don't match the nginx combined log format.
    """
    entries = []
    skipped = 0

    for line in content.splitlines():
        line = line.strip()
        if not line:
            continue

        entry = parse_log_line(line)
        if entry:
            entries.append(entry)
        else:
            skipped += 1

    logger.info(
        "Parsed %d log entries (%d lines skipped)", len(entries), skipped
    )
    return entries
