from .base import Base , uuid_pk
from sqlalchemy import Column, String, ForeignKey , DateTime , Boolean
from datetime import datetime
from sqlalchemy.orm import relationship
from sqlalchemy import UniqueConstraint


# Prompt 
class Prompt(Base):
    __tablename__ = "prompts"
    id = uuid_pk()
    name = Column(String , unique=True , nullable=False )
    description = Column(String)
    created_at = Column(DateTime , default=datetime.utcnow)

    versions = relationship(
        "PromptVersion",
        back_populates="prompt",
        cascade="all, delete-orphan",
        order_by="PromptVersion.created_at"
    )

    golden_examples = relationship("GoldenExample", back_populates="prompt")

# PromptVersion
class PromptVersion(Base):
    __tablename__ = "prompt_versions"

    id = uuid_pk()
    prompt_id = Column(String, ForeignKey("prompts.id", ondelete="CASCADE"))
    version = Column(String, nullable=False)
    template = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=False)
    prompt = relationship("Prompt", back_populates="versions")

    runs = relationship(
        "Run",
        back_populates="prompt_version",
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("prompt_id", "version", name="uq_prompt_version"),
    )