from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy import Column, Integer, String, ForeignKey , DateTime , Float
from datetime import datetime
import uuid
from sqlalchemy import Index


class Base(DeclarativeBase):
    pass 

# defie a new and unique id
def uuid_pk():
    return Column(String , primary_key=True , default=lambda: str(uuid.uuid4()))

# User
class User(Base):
    __tablename__ = "users"
    id = uuid_pk()
    email = Column(String , unique=True , nullable=False)
    created_at = Column(DateTime , default=datetime.utcnow)

    # دي علاثه بين البايثون اوبكجتس وبعضها مش زي اني اعمل علاقه تفها قاعده البيانات بس 
    api_keys = relationship(
        "APIKey",
        back_populates="user",
        cascade="all, delete-orphan"
    ) 

# APIKey 
class APIKey(Base):
    __tablename__ = "api_keys"

    id = uuid_pk()
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"))
    key = Column(String, unique=True, nullable=False)
    is_active = Column(bool, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="api_keys")

# Prompt 
class Prompt(Base):
    __tablename__ = "Prompt"
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

# PromptVersion
class PromptVersion(Base):
    __tablename__ = "prompt_versions"

    id = uuid_pk()
    prompt_id = Column(String, ForeignKey("prompts.id", ondelete="CASCADE"))
    version = Column(String, nullable=False)
    template = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    prompt = relationship("Prompt", back_populates="versions")

    runs = relationship(
        "Run",
        back_populates="prompt_version",
        cascade="all, delete-orphan"
    )

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

from sqlalchemy import UniqueConstraint

__table_args__ = (
    UniqueConstraint("prompt_id", "version", name="uq_prompt_version"),
)


'''
Cascade Rules : 
----------------------------------------------------------
Relation	     |        Cascade	   |    Why
----------------------------------------------------------
User → APIKey	 |  all, delete-orphan | Security
Prompt → Version |	all, delete-orphan | Versioning logic
Version → Run	 |  all, delete-orphan | Observability
Run → CostLog    |	all, delete-orphan | Atomic cost


I use delete-orphan only when the child has no business meaning without the parent.


❓ ليه Run immutable؟
✔ Auditing
✔ Debugging
✔ ML evaluation reproducibility

❓ ليه CostLog مش column في Run؟
✔ Pricing logic ممكن يتغير
✔ Multi-cost sources later

❓ ليه relationships في ORM مش بس FK؟
✔ Cleaner domain model
✔ Easier querying
✔ Business logic أوضح
'''