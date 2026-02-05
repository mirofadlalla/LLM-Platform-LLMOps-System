from pydantic import BaseModel
from typing import Dict

# Golden Example = test case
# Input  → Expected -> Output

class GoldenExampleCreate(BaseModel):
    input_variables: Dict
    expected_output: str


class EvaluationResponse(BaseModel):
    prompt_version_id: str
    average_score: float
    total_tests: int


