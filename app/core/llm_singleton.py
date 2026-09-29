# app/core/llm_singleton.py
"""
DEPRECATED — superseded by app/llm/providers/huggingface_provider.py

This file is kept to avoid breaking any direct imports that may exist outside
the refactored application code.  New code must import from:

    from app.llm.runner import call_llm
"""
import warnings

warnings.warn(
    "app.core.llm_singleton is deprecated. "
    "Use app.llm.runner.call_llm instead.",
    DeprecationWarning,
    stacklevel=2,
)
