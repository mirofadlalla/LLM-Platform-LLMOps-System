from pydantic import BaseModel
from typing import Dict, Any

# Run Schemas

# Run Request and Response Schemas
class RunRequest(BaseModel):
    prompt_version_id: str
    variables: Dict[str, Any]
    model: str
    
class RunResponse(BaseModel):
    run_id: str
    output: str
    latency_ms: int
    tokens_in: int
    tokens_out: int
    cost_usd: float
