# app/services/prompt_diff.py
import difflib
from typing import List


def diff_templates(old: str, new: str) -> List[str]:
    """
    Return a unified-diff list between two prompt templates.

    :param old: Original template string.
    :param new: New template string.
    :return: List of unified-diff lines.
    """
    old_lines = old.splitlines()
    new_lines = new.splitlines()

    diff = difflib.unified_diff(old_lines, new_lines, lineterm="")
    return list(diff)
