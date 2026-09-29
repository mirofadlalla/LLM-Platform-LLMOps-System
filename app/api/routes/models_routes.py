# app/api/routes/models_routes.py
"""
Models / Providers discovery endpoints.

These endpoints are consumed by the UI to populate provider and model
dropdowns.  No authentication required — model listings are not sensitive.

Endpoints:
  GET /providers                    → list all provider IDs
  GET /providers/{provider_id}/models → models for one provider
  GET /models                       → full catalog for all providers
"""

from dataclasses import asdict

from fastapi import APIRouter, HTTPException

from app.llm.registry import llm_registry

router = APIRouter(tags=["models"])


@router.get("/providers")
def list_providers():
    """Return all registered provider IDs."""
    return {"providers": llm_registry.list_providers()}


@router.get("/providers/{provider_id}/models")
def list_models_for_provider(provider_id: str):
    """Return all models available for a specific provider."""
    try:
        models = llm_registry.list_models(provider_id)
        return {
            "provider": provider_id,
            "models": [asdict(m) for m in models],
        }
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/models")
def all_models():
    """
    Full provider → models catalog.

    Response shape:
    {
      "groq": [
        {"slug": "gpt-oss-20b", "api_id": "openai/gpt-oss-20b",
         "display_name": "GPT OSS 20B", "extra_params": {}},
        ...
      ],
      "huggingface": [ ... ]
    }
    """
    return llm_registry.catalog()
