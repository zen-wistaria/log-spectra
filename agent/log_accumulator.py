"""
Disk-based log accumulation module.

Persists raw nginx log lines to a file on disk so that data survives
log rotation by the OS. Implements size-based trimming: when the
accumulated file exceeds the configured maximum, the oldest lines
are removed to keep the file at approximately 80% of the max size.
"""

import os
import shutil
import tempfile
import logging

logger = logging.getLogger(__name__)

# Trim target: when trimming, reduce to this fraction of max size
# to avoid trimming on every single append cycle.
_TRIM_TARGET_RATIO = 0.80


class LogAccumulator:
    """
    Manages a persistent accumulated log file on disk.

    The accumulated file is stored alongside the original log file
    as ``<log_path>.accumulated``. Raw log lines (unparsed) are
    appended to this file, and trimming is performed when the file
    exceeds the configured maximum size.
    """

    def __init__(self, log_path: str, max_size_mb: int) -> None:
        self._accumulated_path = log_path + ".accumulated"
        self._max_size_bytes = max_size_mb * 1024 * 1024
        self._trim_target_bytes = int(self._max_size_bytes * _TRIM_TARGET_RATIO)

        logger.info(
            "LogAccumulator initialized: path=%s, max_size=%dMB",
            self._accumulated_path,
            max_size_mb,
        )

    @property
    def path(self) -> str:
        """Return the path of the accumulated log file."""
        return self._accumulated_path

    def append_lines(self, raw_lines: list[str]) -> None:
        """
        Append raw log lines to the accumulated file.

        After appending, checks whether the file exceeds the maximum
        size and trims if necessary.
        """
        if not raw_lines:
            return

        try:
            with open(self._accumulated_path, "a", encoding="utf-8") as f:
                for line in raw_lines:
                    stripped = line.rstrip("\n\r")
                    if stripped:
                        f.write(stripped + "\n")
        except OSError as e:
            logger.error("Failed to append to accumulated log: %s", e)
            return

        # Check and trim after appending
        self._trim_if_needed()

    def read_all_lines(self) -> list[str]:
        """
        Read and return all lines from the accumulated log file.

        Returns an empty list if the file does not exist or is empty.
        Each returned line has its trailing newline stripped.
        """
        if not os.path.isfile(self._accumulated_path):
            return []

        try:
            lines = []
            with open(self._accumulated_path, "r", encoding="utf-8") as f:
                for line in f:
                    stripped = line.rstrip("\n\r")
                    if stripped:
                        lines.append(stripped)
            logger.info(
                "Loaded %d lines from accumulated log (%s)",
                len(lines),
                self._accumulated_path,
            )
            return lines
        except OSError as e:
            logger.error("Failed to read accumulated log: %s", e)
            return []

    def get_file_size_bytes(self) -> int:
        """Return the current file size in bytes, or 0 if not found."""
        try:
            return os.path.getsize(self._accumulated_path)
        except OSError:
            return 0

    def _trim_if_needed(self) -> None:
        """
        Trim oldest lines if the accumulated file exceeds max size.

        Uses a temporary file and atomic rename to avoid data
        corruption. After trimming, the file is reduced to
        approximately 80% of max size.
        """
        current_size = self.get_file_size_bytes()
        if current_size <= self._max_size_bytes:
            return

        logger.info(
            "Accumulated log size (%dMB) exceeds max (%dMB), trimming...",
            current_size // (1024 * 1024),
            self._max_size_bytes // (1024 * 1024),
        )

        try:
            self._perform_trim(current_size)
        except Exception as e:
            logger.error("Failed to trim accumulated log: %s", e)

    def _perform_trim(self, current_size: int) -> None:
        """
        Perform the actual trimming by discarding oldest lines.

        Strategy:
        1. Calculate how many bytes to skip from the beginning.
        2. Read the file, skip bytes, then find the next newline
           to avoid cutting a line in half.
        3. Write remaining content to a temp file.
        4. Atomically replace the original file.
        """
        bytes_to_skip = current_size - self._trim_target_bytes

        dir_name = os.path.dirname(self._accumulated_path) or "."
        fd, tmp_path = tempfile.mkstemp(
            dir=dir_name, prefix=".accumulated_trim_"
        )
        fd_closed = False

        try:
            with open(self._accumulated_path, "r", encoding="utf-8") as src:
                # Skip bytes_to_skip worth of content
                skipped = 0
                for line in src:
                    skipped += len(line.encode("utf-8"))
                    if skipped >= bytes_to_skip:
                        # We've skipped enough; this line is partially
                        # in the "skip" zone, so we discard it and
                        # start writing from the next line.
                        break

                # Write remaining lines to temp file
                with os.fdopen(fd, "w", encoding="utf-8") as dst:
                    fd_closed = True  # fd is now owned by the file object
                    for line in src:
                        dst.write(line)

            # Atomic replace
            shutil.move(tmp_path, self._accumulated_path)

            new_size = self.get_file_size_bytes()
            logger.info(
                "Trim complete: %dMB → %dMB",
                current_size // (1024 * 1024),
                new_size // (1024 * 1024),
            )

        except Exception:
            # Clean up temp file on failure
            if not fd_closed:
                try:
                    os.close(fd)
                except OSError:
                    pass
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
            raise

