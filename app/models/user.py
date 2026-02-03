from .base import Base , uuid_pk
from sqlalchemy import Column, Integer, String, ForeignKey , DateTime , Float , Boolean
from datetime import datetime
from sqlalchemy import Index
from sqlalchemy.orm import relationship

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
    is_active = Column(Boolean, default=True) # can'd use bool pytthon 
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="api_keys")
