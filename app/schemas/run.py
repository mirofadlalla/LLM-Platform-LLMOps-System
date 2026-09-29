from pydantic import BaseModel
from typing import Dict, Any, Optional


class RunRequest(BaseModel):
    prompt_version_id: str
    variables: Dict[str, Any]
    provider: str = "groq"          # registry provider key, e.g. "groq" | "huggingface"
    model: str = "gpt-oss-20b"      # registry model slug,    e.g. "gpt-oss-20b" | "reasoning"


class RunResponse(BaseModel):
    run_id: str
    task_id: Optional[str] = None
    status: str
    output: Optional[str] = None
    latency_ms: Optional[int] = None
    tokens_in: Optional[int] = None
    tokens_out: Optional[int] = None
    cost_usd: Optional[float] = None
