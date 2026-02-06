from pydantic import BaseModel
from typing import Dict

# Golden Example = test case
# Input  → Expected -> Output

# Why are Golden Examples tied to the Prompt, not the Version?
class GoldenExampleCreate(BaseModel):
    input_data: Dict
    expected_output: str

# EvaluationResult = the evaluation of a single test case (Golden Example) for a specific prompt version and run
class EvaluationResponse(BaseModel):
    prompt_version_id: str
    average_score: float
    total_tests: int


