from pydantic import BaseModel

class ExperimentRunCreate(BaseModel):
    experiment_name: str
    prompt_id: str
