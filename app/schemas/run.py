from pydantic import BaseModel
from typing import Dict, Any, Optional

# Run Schemas

# Run Request and Response Schemas
class RunRequest(BaseModel):
    prompt_version_id: str
    variables: Dict[str, Any]
    model: str
    
# Optional fields for future use (e.g., for tracking tokens, latency, etc.)
class RunResponse(BaseModel):
    run_id: str
    task_id: Optional[str] = None
    status: str
    output: Optional[str] = None
    latency_ms: Optional[int] = None
    tokens_in: Optional[int] = None
    tokens_out: Optional[int] = None
    cost_usd: Optional[float] = None
