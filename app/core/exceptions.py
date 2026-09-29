# app/core/exceptions.py
"""
Domain / application-level exceptions.

These are raised by the service layer and translated into HTTP responses
by the controller / API layer.  They MUST NOT import anything from FastAPI.
"""


class PromptNotFoundError(Exception):
    """Raised when a prompt cannot be found by ID."""


class PromptVersionNotFoundError(Exception):
    """Raised when a prompt version cannot be found."""


class GoldenExamplesNotFoundError(Exception):
    """Raised when no golden examples exist for a prompt."""


class ExperimentNotFoundError(Exception):
    """Raised when an experiment cannot be found by ID."""


class RunNotFoundError(Exception):
    """Raised when a run record cannot be found by ID."""


class TaskQueueError(Exception):
    """Raised when enqueueing a Celery task fails."""
