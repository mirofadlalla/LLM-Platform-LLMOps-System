# app/core/logging.py
"""
Centralised logging configuration for the LLMOps Platform.

Call ``setup_logging()`` once from ``app/main.py``.  All other modules
should obtain a logger with the standard pattern::

    import logging
    logger = logging.getLogger(__name__)

and rely on this central configuration – they must NOT add their own
FileHandlers or Formatters.
"""

import logging
import sys
from pathlib import Path


def setup_logging(
    log_level: int = logging.INFO,
    log_file: str = "app.log",
) -> None:
    """Configure root logger with a console handler and a file handler."""

    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
    )

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)

    # File handler
    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Avoid duplicate handlers on hot-reload
    if not root_logger.handlers:
        root_logger.addHandler(console_handler)
        root_logger.addHandler(file_handler)
