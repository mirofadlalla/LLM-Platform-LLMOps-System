from sqlalchemy import Column, String, Text, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from .base import Base , uuid_pk


class GoldenExample(Base):
    __tablename__ = "golden_examples"

    id = uuid_pk()
    prompt_id = Column(String, ForeignKey("prompts.id", ondelete="CASCADE"))
    input_data = Column(Text, nullable=False)
    expected_output = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


    prompt = relationship("Prompt", back_populates="golden_examples")


class EvaluationResult(Base):
    __tablename__ = "evaluation_results"

    id = uuid_pk()
    run_id = Column(String, ForeignKey("runs.id", ondelete="CASCADE"))
    prompt_version_id = Column(String, ForeignKey("prompt_versions.id"))
    golden_example_id = Column(String, ForeignKey("golden_examples.id", ondelete="CASCADE"))
    score = Column(Float, nullable=False)
    output  = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    run = relationship("Run", back_populates="evaluations")
    golden_example = relationship("GoldenExample")


'''
    Why are Golden Examples tied to the Prompt, not the Version?

    Let’s think about the semantics:

    Prompt = the task (identity)
    Example:
    "Summarize text"
    → This is a fixed identity, it doesn’t change when we rephrase.

    Prompt Version = the way of phrasing/implementing the task
    Example:
    v1: "Summarize the following text"
    v2: "Give a concise summary of the text below"
    → These are implementation details.

    Golden Example = test case
    Input → Expected Output

    What does it test?
    → "Did the task itself break?"

    ❗ Golden Examples should NOT change with every version.
    Otherwise:
    - Each version would have different tests
    - No real regression testing
    - That’s an architectural mistake
    
    By tying Golden Examples to the Prompt, we ensure consistent testing across all versions.
    We can evaluate each version against the same set of Golden Examples to track improvements or regressions
'''