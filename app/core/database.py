from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine( # - create_engine: دي الطريقة اللي SQLAlchemy بيستخدمها عشان يتصل بقاعدة البيانات.
    settings.DATABASE_URL, 
    pool_pre_ping=True # - pool_pre_ping=True: بيخلي SQLAlchemy يتأكد إن الاتصال شغال قبل ما يستخدمه (مفيد لو 
)

SessionLocal = sessionmaker( # -  SQLAlchemy هو factory (مصنع) بيبني لك كائنات Session
    autocommit=False, # - معناها إن أي عملية (INSERT, UPDATE, DELETE) مش هتتسجل في قاعدة البيانات إلا لما 
    autoflush=False, # - الـ flush معناها إن التغييرات اللي في الـ session تتبعت للـ DB قبل الاستعلامات

    bind=engine
)

# Dependency دي بتستخدم في FastAPI عشان توفرلك جلسة قاعدة بيانات لكل طلب (request)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
