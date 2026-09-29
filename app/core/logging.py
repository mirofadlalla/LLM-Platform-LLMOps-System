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

from app.core.config import settings


def setup_logging(
    log_level: int | None = None,
    log_file: str | None = None,
) -> None:
    """
    Configure root logger with a console handler and a file handler.

    Parameters fall back to settings.log_level and settings.log_file when
    not explicitly provided, making them overridable via the .env file or
    environment variables (LOG_LEVEL, LOG_FILE).
    """
    effective_level = log_level if log_level is not None else getattr(
        logging, settings.log_level.upper(), logging.INFO
    )
    effective_file = log_file if log_file is not None else settings.log_file

    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
    )

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)

    file_handler = logging.FileHandler(effective_file, encoding="utf-8")
    file_handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.setLevel(effective_level)

    # Avoid duplicate handlers on hot-reload
    if not root_logger.handlers:
        root_logger.addHandler(console_handler)
        root_logger.addHandler(file_handler)
