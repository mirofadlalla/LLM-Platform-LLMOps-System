from .base import Base , uuid_pk
from sqlalchemy import Column, Integer, String, ForeignKey , DateTime , Float
from datetime import datetime
from sqlalchemy import Index
from sqlalchemy.orm import relationship


from .prompt import PromptVersion

# Run
class Run(Base):
    __tablename__ = "runs"

    id = uuid_pk()
    prompt_version_id = Column(
        String,
        ForeignKey("prompt_versions.id", ondelete="CASCADE")
    )

    input = Column(String)
    output = Column(String)
    model = Column(String)
    latency_ms = Column(Integer)
    tokens_in = Column(Integer)
    tokens_out = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="pending")

    prompt_version = relationship(
        "PromptVersion",
        back_populates="runs"
    )

    cost = relationship(
        "CostLog",
        back_populates="run",
        uselist=False,
        cascade="all, delete-orphan"
    )

# CostLog
class CostLog(Base):
    __tablename__ = "cost_logs"

    id = uuid_pk()
    run_id = Column(
        String,
        ForeignKey("runs.id", ondelete="CASCADE"),
        unique=True
    )
    cost_usd = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

    run = relationship("Run", back_populates="cost")


Index("idx_runs_created_at", Run.created_at)
Index("idx_cost_run_id", CostLog.run_id)