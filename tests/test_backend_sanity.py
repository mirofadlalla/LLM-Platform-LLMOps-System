import pytest
from app.core.config import settings
from app.core.auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    generate_api_key,
)
from app.services.prompt_renderer import render_prompt
from app.services.prompt_diff import diff_templates
from app.llm.registry import llm_registry


def test_settings_defaults():
    assert settings.app_title == "LLMOps Platform"
    assert settings.app_version == "0.1.0"
    assert settings.jwt_algorithm == "HS256"
    assert settings.postgres_port == 5432
    assert settings.redis_port == 6379


def test_auth_password_hashing():
    pwd = "secure_test_password_123"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("wrong_password", hashed) is False


def test_auth_jwt_token_roundtrip():
    user_id = "test-user-id-456"
    token = create_access_token(user_id)
    assert isinstance(token, str)
    decoded_sub = decode_access_token(token)
    assert decoded_sub == user_id


def test_auth_api_key_generation():
    key = generate_api_key()
    assert key.startswith("llmops_")
    assert len(key) > 20


def test_prompt_renderer_success():
    template = "Hello {name}, your task is {task}."
    rendered = render_prompt(template, {"name": "Alice", "task": "coding"})
    assert rendered == "Hello Alice, your task is coding."


def test_prompt_renderer_missing_variable():
    template = "Hello {name}, your task is {task}."
    with pytest.raises(ValueError, match="Missing variable"):
        render_prompt(template, {"name": "Alice"})


def test_prompt_diff():
    old = "Hello world\nLine 2"
    new = "Hello universe\nLine 2"
    diff = diff_templates(old, new)
    assert any("-Hello world" in line for line in diff)
    assert any("+Hello universe" in line for line in diff)


def test_llm_registry_catalog():
    providers = llm_registry.list_providers()
    assert "groq" in providers
    assert "huggingface" in providers

    groq_models = llm_registry.list_models("groq")
    slugs = [m.slug for m in groq_models]
    assert "gpt-oss-20b" in slugs


def test_alembic_single_head():
    import alembic.config
    from alembic.script import ScriptDirectory

    cfg = alembic.config.Config("alembic.ini")
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1
    assert heads[0] == "f6c7b7868853"
