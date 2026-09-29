# app/llm/registry.py
"""
LLM Registry (Factory).

This is the single source of truth for:
  • which providers exist
  • which models each provider supports
  • how to instantiate a provider on first use

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Adding a NEW MODEL to an existing provider
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. Add a ModelInfo entry to PROVIDER_CATALOG[provider_id].
  → Done. No other file needs to change.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Adding a NEW PROVIDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. Create app/llm/providers/myprovider.py  (subclass BaseLLMProvider)
  2. Add its dotted class path to _PROVIDER_CLASS_MAP below.
  3. Add its models to PROVIDER_CATALOG below.
  → Done. PromptService / RunService / EvaluationService / ExperimentService
    do NOT need to change.
"""

import importlib
import logging
from dataclasses import asdict

from app.llm.base import BaseLLMProvider, ModelInfo

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Model Catalog
# ─────────────────────────────────────────────────────────────────────────────
#
# slug        → key used in RunRequest.model and the UI dropdown
# api_id      → exact string passed to the provider SDK
# display_name→ human-friendly label rendered in the UI
# extra_params→ provider-specific kwargs merged into every API call for this
#               model entry (e.g. {"reasoning_effort": "medium"})
#
PROVIDER_CATALOG: dict[str, dict[str, ModelInfo]] = {
    "groq": {
        "gpt-oss-20b": ModelInfo(
            slug="gpt-oss-20b",
            api_id="openai/gpt-oss-20b",
            display_name="GPT OSS 20B",
        ),
        "gpt-oss-120b": ModelInfo(
            slug="gpt-oss-120b",
            api_id="openai/gpt-oss-120b",
            display_name="GPT OSS 120B",
        ),
        "qwen3-27b": ModelInfo(
            slug="qwen3-27b",
            api_id="qwen/qwen3-27b",   # verify slug in Groq dashboard if needed
            display_name="Qwen 3 27B",
        ),
        # Reasoning variant: same underlying model as gpt-oss-20b but with
        # reasoning_effort injected automatically via extra_params.
        # "reasoning": ModelInfo(
        #     slug="reasoning",
        #     api_id="openai/gpt-oss-20b",
        #     display_name="Reasoning",
        #     extra_params={"reasoning_effort": "medium"},
        # ),
    },
    "huggingface": {
        "qwen-2.5-1.5b": ModelInfo(
            slug="qwen-2.5-1.5b",
            api_id="Qwen/Qwen2.5-1.5B-Instruct",
            display_name="Qwen 2.5 1.5B",
        ),
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# Provider class map  (dotted import path — loaded lazily)
# ─────────────────────────────────────────────────────────────────────────────
# Adding a provider = adding one line here + one entry in PROVIDER_CATALOG.
# Maps provider IDs → dotted Python class paths.
# This allows lazy loading of provider classes via importlib.
_PROVIDER_CLASS_MAP: dict[str, str] = {
    "groq": "app.llm.providers.groq_provider.GroqProvider",
    "huggingface": "app.llm.providers.huggingface_provider.HuggingFaceProvider",
}

# Provider singleton instances — created on first use, reused afterwards
_provider_instances: dict[str, BaseLLMProvider] = {}


def _load_provider(provider_id: str) -> BaseLLMProvider:
    """Lazy-load and cache a provider instance by its ID."""
    if provider_id in _provider_instances:
        return _provider_instances[provider_id]

    if provider_id not in _PROVIDER_CLASS_MAP:
        raise ValueError(
            f"No provider class registered for {provider_id!r}. "
            f"Registered providers: {list(_PROVIDER_CLASS_MAP)}"
        )

    dotted = _PROVIDER_CLASS_MAP[provider_id]
    module_path, class_name = dotted.rsplit(".", 1)
    module = importlib.import_module(module_path)
    cls: type[BaseLLMProvider] = getattr(module, class_name)

    instance = cls()
    _provider_instances[provider_id] = instance
    logger.debug(f"Loaded LLM provider: {provider_id!r} ({cls.__name__})")
    return instance


# ─────────────────────────────────────────────────────────────────────────────
# Public Registry facade
# ─────────────────────────────────────────────────────────────────────────────
# public facade for business services to access providers and models without
# needing to know about the underlying class map or lazy loading.
class LLMRegistry:
    """
    Factory + directory for all LLM providers and models.

    Typical usage inside call_llm():
        provider  = llm_registry.get_provider("groq")
        model     = llm_registry.get_model("groq", "gpt-oss-20b")
        response  = provider.generate(prompt, model)
    """

    # ── Resolution ────────────────────────────────────────────────────────────

    def get_provider(self, provider_id: str) -> BaseLLMProvider:
        """Return the singleton provider instance for the given ID."""
        self._assert_known_provider(provider_id)
        return _load_provider(provider_id)

    def get_model(self, provider_id: str, model_slug: str) -> ModelInfo:
        """Return the ModelInfo for a (provider, model_slug) pair."""
        self._assert_known_provider(provider_id)
        models = PROVIDER_CATALOG[provider_id]
        if model_slug not in models:
            raise ValueError(
                f"Unknown model {model_slug!r} for provider {provider_id!r}. "
                f"Available: {list(models)}"
            )
        return models[model_slug]

    # ── Discovery (for UI / API) ───────────────────────────────────────────────

    def list_providers(self) -> list[str]:
        """Return all registered provider IDs."""
        return list(PROVIDER_CATALOG.keys())

    def list_models(self, provider_id: str) -> list[ModelInfo]:
        """Return all ModelInfo objects for a given provider."""
        self._assert_known_provider(provider_id)
        return list(PROVIDER_CATALOG[provider_id].values())

    def catalog(self) -> dict[str, list[dict]]:
        """
        Full provider → models catalog, serialised for JSON responses.
        Used by the /models API endpoint consumed by the UI.
        """
        return {
            pid: [asdict(m) for m in models.values()]
            for pid, models in PROVIDER_CATALOG.items()
        }

    # ── Internal ──────────────────────────────────────────────────────────────

    def _assert_known_provider(self, provider_id: str) -> None:
        if provider_id not in PROVIDER_CATALOG:
            raise ValueError(
                f"Unknown provider {provider_id!r}. "
                f"Available: {list(PROVIDER_CATALOG)}"
            )


llm_registry = LLMRegistry()
