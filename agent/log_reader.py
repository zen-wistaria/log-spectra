"""
Log reader module using pygtail for incremental nginx log reading.
Supports logrotate and maintains an in-memory buffer for accumulated analysis.
Integrates with LogAccumulator for disk-based persistence.
"""

import re
import logging
from datetime import datetime
from pygtail import Pygtail

from log_accumulator import LogAccumulator

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
    Uses LogAccumulator for disk persistence across log rotations.
    """

    def __init__(self, log_path: str, max_size_mb: int = 200):
        self.log_path = log_path
        self.offset_file = log_path + ".offset"
        self.buffer: list[dict] = []

        # Initialize disk-based accumulator
        self._accumulator = LogAccumulator(log_path, max_size_mb)

        # Restore buffer from accumulated log on startup
        self._restore_from_accumulated()

        logger.info(
            "LogReader initialized for: %s (buffer restored: %d entries)",
            log_path,
            len(self.buffer),
        )

    def _restore_from_accumulated(self) -> None:
        """
        Restore the in-memory buffer from the accumulated log file.
        Called once during initialization to recover data after restart.
        """
        accumulated_lines = self._accumulator.read_all_lines()
        if not accumulated_lines:
            return

        restored_count = 0
        for line in accumulated_lines:
            entry = parse_log_line(line)
            if entry:
                self.buffer.append(entry)
                restored_count += 1

        logger.info(
            "Restored %d entries from accumulated log (%d lines parsed)",
            restored_count,
            len(accumulated_lines),
        )

    def read_new_lines(self) -> list[dict]:
        """
        Read new log lines since last read.
        Returns list of newly parsed log entries.
        Also appends them to the internal buffer and persists
        raw lines to the accumulated log file.
        """
        new_entries = []
        raw_lines = []

        try:
            pygtail = Pygtail(self.log_path, offset_file=self.offset_file)

            for line in pygtail:
                line = line.strip()
                if not line:
                    continue

                raw_lines.append(line)
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

        # Persist raw lines to disk (even if some failed parsing,
        # so we don't lose data for future re-parsing)
        if raw_lines:
            self._accumulator.append_lines(raw_lines)

        return new_entries

    def get_buffer(self) -> list[dict]:
        """Return the full accumulated buffer."""
        return self.buffer

    def get_buffer_size(self) -> int:
        """Return the current buffer size (number of entries)."""
        return len(self.buffer)
