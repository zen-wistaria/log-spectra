"""
Log reader module using pygtail for incremental nginx log reading.
Supports logrotate and maintains an in-memory buffer for accumulated analysis.
"""

import re
import logging
from datetime import datetime
from pygtail import Pygtail

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


class LogReader:
    """
    Reads nginx access logs incrementally using pygtail.
    Maintains an in-memory buffer of all parsed log entries.
    Supports logrotate — pygtail tracks file offsets automatically.
    """

    def __init__(self, log_path: str):
        self.log_path = log_path
        self.offset_file = log_path + ".offset"
        self.buffer: list[dict] = []
        logger.info("LogReader initialized for: %s", log_path)

    def read_new_lines(self) -> list[dict]:
        """
        Read new log lines since last read.
        Returns list of newly parsed log entries.
        Also appends them to the internal buffer.
        """
        new_entries = []

        try:
            pygtail = Pygtail(self.log_path, offset_file=self.offset_file)

            for line in pygtail:
                line = line.strip()
                if not line:
                    continue

                entry = parse_log_line(line)
                if entry:
                    new_entries.append(entry)

        except FileNotFoundError:
            logger.warning("Log file not found: %s", self.log_path)
        except Exception as e:
            logger.error("Error reading log file: %s", e)

        if new_entries:
            self.buffer.extend(new_entries)
            logger.info(
                "Read %d new log entries (buffer total: %d)",
                len(new_entries),
                len(self.buffer),
            )

        return new_entries

    def get_buffer(self) -> list[dict]:
        """Return the full accumulated buffer."""
        return self.buffer

    def get_buffer_size(self) -> int:
        """Return the current buffer size."""
        return len(self.buffer)
