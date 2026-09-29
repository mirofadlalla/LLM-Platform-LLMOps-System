# app/services/llm_runner.py
"""
DEPRECATED — superseded by app/llm/runner.py

This file is kept to avoid breaking any direct imports that may exist outside
the refactored application code.  New code must import from:

    from app.llm.runner import call_llm
"""
import warnings

warnings.warn(
    "app.services.llm_runner.call_llama is deprecated. "
    "Use app.llm.runner.call_llm instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.llm.runner import call_llm as call_llama  # noqa: F401 – backward-compat alias