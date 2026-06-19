"""
Log reader module using pygtail for incremental nginx log reading.
Supports logrotate and maintains a bounded in-memory buffer (sliding window)
for analysis. Integrates with LogAccumulator for disk-based persistence.

Buffer vs Accumulator — perbedaan peran:
  - Accumulator (.accumulated file): persist all raw lines to survive log
    rotation. Unbounded (trimmed at max_size_mb). Purpose: data retention.
  - Buffer (in-memory list[dict]): only holds the latest N entries for
    Isolation Forest analysis. Automatically trimmed (oldest discarded)
    when exceeding buffer_max_lines. Purpose: bounded memory + fast analysis.
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
    Maintains a bounded in-memory buffer (sliding window) and persists
    raw lines to disk via LogAccumulator for rotation resilience.

    Buffer independently bounded by ``buffer_max_lines`` — oldest entries
    are discarded when the buffer exceeds this limit. The disk accumulator
    is unbounded (trimmed only by file size) for data retention.

    LogAccumulator handles its own file-size trim independently.
    Buffer and accumulator are DECOUPLED — buffer is NOT rebuilt from
    disk after trim, avoiding expensive I/O. On restart the buffer is
    restored from the tail of the accumulated file (last N lines only).
    """

    def __init__(self, log_path: str, max_size_mb: int = 200, buffer_max_lines: int = 100000):
        self.log_path = log_path
        self.offset_file = log_path + ".offset"
        self.buffer: list[dict] = []
        self._buffer_max_lines = buffer_max_lines

        # Initialize disk-based accumulator (independent of buffer)
        self._accumulator = LogAccumulator(log_path, max_size_mb)

        # Restore buffer from tail of accumulated log (last N lines only)
        self._restore_from_accumulated()

        logger.info(
            "LogReader initialized for: %s (buffer_max_lines=%d, restored=%d entries)",
            log_path,
            buffer_max_lines,
            len(self.buffer),
        )

    def _restore_from_accumulated(self) -> None:
        """
        Restore the in-memory buffer from the TAIL of the accumulated log.

        Only loads the last ``buffer_max_lines`` entries to bound memory.
        Previously this loaded the entire accumulated file — wasteful since
        we only need recent data for analysis.
        """
        accumulated_lines = self._accumulator.read_tail_lines(self._buffer_max_lines)
        if not accumulated_lines:
            return

        restored_count = 0
        for line in accumulated_lines:
            entry = parse_log_line(line)
            if entry:
                self.buffer.append(entry)
                restored_count += 1

        logger.info(
            "Restored %d entries from accumulated log tail (%d lines parsed)",
            restored_count,
            len(accumulated_lines),
        )

    def _trim_buffer(self) -> None:
        """
        Trim oldest entries to keep buffer within ``buffer_max_lines``.

        Called after every append. Discards from the front (oldest) so the
        buffer always contains the most recent data for Isolation Forest.
        """
        if len(self.buffer) <= self._buffer_max_lines:
            return

        excess = len(self.buffer) - self._buffer_max_lines
        self.buffer = self.buffer[excess:]
        logger.info(
            "Buffer trimmed: removed %d oldest entries (%d remaining)",
            excess,
            len(self.buffer),
        )

    def read_new_lines(self) -> list[dict]:
        """
        Read new log lines since last read using pygtail offset tracking.

        New entries are:
        1. Appended to in-memory buffer (sliding-window trimmed)
        2. Persisted as raw lines to disk accumulator (unbounded)

        The disk accumulator handles its own size-based trim independently.
        No sync/rebuild of buffer from disk — buffer and disk are decoupled.

        Returns list of newly parsed log entries.
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
            # Trim from front (oldest) to stay within limit
            self._trim_buffer()

        # Persist raw lines to disk (buffer and accumulator are independent)
        if raw_lines:
            self._accumulator.append_lines(raw_lines)

        return new_entries

    def get_buffer(self) -> list[dict]:
        """Return the buffered log entries (latest N, bounded)."""
        return self.buffer

    def get_buffer_size(self) -> int:
        """Return the current buffer size (number of entries)."""
        return len(self.buffer)