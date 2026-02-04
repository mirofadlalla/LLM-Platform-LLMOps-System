from pydantic import BaseModel
from typing import Optional

# Prompt Schemas

# Prompt Creation and Versioning Schemas
class PromptCreate(BaseModel):
    name: str
    description: Optional[str] = None
    template: str

class PromptCreateResponse(BaseModel):
    prompt_id: str
    version: str

class PromptVersionCreate(BaseModel):
    template: str

class PromptVersionResponse(BaseModel):
    prompt_id: str
    version: str
    template: str
