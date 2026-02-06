from pydantic import BaseModel
from typing import List, Optional

from datetime import datetime
from pydantic import BaseModel
from uuid import UUID

### Prompt Management + Versioning ###

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


class PromptVersionHistoryItem(BaseModel):
    id: str
    version: str
    is_active: bool
    created_at: datetime


class PromptVersionHistoryResponse(BaseModel):
    prompt_id: str
    versions: List[PromptVersionHistoryItem]

class ActivatePromptVersionResponse(BaseModel):
    prompt_id: str
    activated_version_id: str
    version: str


# Diff Schemas
class DiffRequest(BaseModel):
    prompt_id: UUID
    from_version_id: UUID
    to_version_id: UUID

# Diff Response
class PromptDiffResponse(BaseModel):
    prompt_id: str
    from_version_id: str
    to_version_id: str
    diff: List[str]