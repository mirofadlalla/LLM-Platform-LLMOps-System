from sqlalchemy import Column, Float, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base , uuid_pk

class Experiment(Base):
    __tablename__ = "experiments"

    id = uuid_pk()
    prompt_id = Column(String, ForeignKey("prompts.id"))
    name = Column(String, nullable=False)
    status = Column(String, default="running")  # running, completed, failed
    created_at = Column(DateTime, default=datetime.utcnow)
    
    prompt = relationship("Prompt", back_populates="experiments")
    results = relationship(
        "ExperimentResult",
        back_populates="experiment",
        cascade="all, delete-orphan"
    )


class ExperimentResult(Base):
    __tablename__ = "experiment_results"

    id = uuid_pk()
    experiment_id = Column(String, ForeignKey("experiments.id", ondelete="CASCADE"))
    prompt_version_id = Column(String, ForeignKey("prompt_versions.id", ondelete="CASCADE"))

    avg_score = Column(Float)
    min_score = Column(Float)
    max_score = Column(Float)
    failure_count = Column(Float)
    total_examples = Column(Float)

    created_at = Column(DateTime, default=datetime.utcnow)
    experiment = relationship("Experiment", back_populates="results")