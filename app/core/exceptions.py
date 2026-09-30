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


class ABTestNotFoundError(Exception):
    """Raised when an A/B test session cannot be found by ID."""


class ABTestAlreadyVotedError(Exception):
    """Raised when a user tries to vote on an already-voted A/B test."""


# ── Auth exceptions ───────────────────────────────────────────────────────────

class InvalidCredentialsError(Exception):
    """Raised when username/password authentication fails."""


class DuplicateUsernameError(Exception):
    """Raised when a registration uses an already-taken username."""


class DuplicateEmailError(Exception):
    """Raised when a registration uses an already-registered email."""


class APIKeyNotFoundError(Exception):
    """Raised when an API key cannot be found (or doesn't belong to the user)."""
