from pydantic import BaseModel
from typing import Dict, Any, Optional

# Run Schemas

# Run Request and Response Schemas
class RunRequest(BaseModel):
    prompt_version_id: str
    variables: Dict[str, Any]
    model: str
    
class RunResponse(BaseModel):
    run_id: str
    status: str
    output: Optional[str] = None
    latency_ms: Optional[int] = None
    tokens_in: Optional[int] = None
    tokens_out: Optional[int] = None
    cost_usd: Optional[float] = None
