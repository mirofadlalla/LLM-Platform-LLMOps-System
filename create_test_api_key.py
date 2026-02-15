#!/usr/bin/env python3
"""
Script to create a test API key for development.
Usage: python create_test_api_key.py
"""
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.base import Base
from app.models.user import User, APIKey
from app.core.config import settings

# Create engine and session
engine = create_engine(settings.DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

# Create tables if they don't exist
Base.metadata.create_all(engine)

# Check if test user exists
test_user = session.query(User).filter(User.email == "dev@example.com").first()
if not test_user:
    test_user = User(
        id=str(uuid.uuid4()),
        email="dev@example.com",
    )
    session.add(test_user)
    session.commit()
    print(f"Created test user: {test_user.email}")
else:
    print(f"Test user already exists: {test_user.email}")

# Check if dev-key already exists
existing_key = session.query(APIKey).filter(APIKey.key == "dev-key").first()
if existing_key:
    print(f"API key 'dev-key' already exists (active: {existing_key.is_active})")
else:
    # Create API key
    api_key = APIKey(
        id=str(uuid.uuid4()),
        user_id=test_user.id,
        key="dev-key",
        is_active=True,
    )
    session.add(api_key)
    session.commit()
    print(f"Created API key: 'dev-key' for user {test_user.email}")

session.close()
print("\nFrontend should now be able to authenticate with 'dev-key'")
