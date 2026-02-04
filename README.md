# LLM-Platform-LLMOps-System

## Overview
A FastAPI-based LLMOps platform for managing, versioning, and executing LLM prompts with built-in security, rate limiting, and database persistence.

## ✅ Accomplishments

### 1. **Core Architecture**
- FastAPI application with modular structure (api, models, schemas, services, core)
- PostgreSQL database integration with SQLAlchemy ORM
- Alembic migrations for database version control

### 2. **Database Models**
- **User**: User management with UUID primary keys and timestamps
- **APIKey**: API key authentication with user relationships and activation status
- **Prompt**: Prompt templates with name, description, and versioning support
- **PromptVersion**: Version control for prompts with template storage
- **Run**: Execution logs for prompt runs with cost tracking
- **CostLog**: Financial tracking for LLM API calls

### 3. **API Endpoints (v1)**
- **POST /api/v1/prompts**: Create new prompts with initial template
- **POST /api/v1/prompts/{prompt_id}/versions**: Create new versions of existing prompts
- **POST /api/v1/run**: Execute prompts with LLM integration
- **GET /api/v1/health**: Health check endpoint

### 4. **Security & Authentication**
- API key-based authentication system
- Request ID middleware for tracking
- Protected endpoints with API key validation

### 5. **Rate Limiting**
- Rate limiting middleware implemented
- Cost-based tracking for API calls

### 6. **Services**
- **PromptRenderer**: Template rendering for dynamic prompts
- **LLMRunner**: LLM integration for executing prompts

### 7. **Configuration**
- Environment-based configuration using Pydantic Settings
- Support for PostgreSQL connection pooling
- Hugging Face API and W&B integration support

### 8. **Dependencies**
- FastAPI & Uvicorn for web server
- SQLAlchemy for ORM
- Psycopg2 for PostgreSQL
- Alembic for database migrations
- Pydantic for data validation

## Tech Stack
- **Framework**: FastAPI
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy
- **Migration Tool**: Alembic
- **Authentication**: API Key-based
- **Language**: Python 3.x

## Project Structure
```
alembic/                 # Database migrations
app/
  ├── api/v1/           # API endpoints (health, run, protected)
  ├── core/             # Core config, database, security, middleware
  ├── models/           # SQLAlchemy models
  ├── schemas/          # Pydantic schemas for request/response
  └── services/         # Business logic (LLM runner, prompt renderer)
database_design.py      # Schema definitions
```

## 🔧 Recent Fixes & Improvements

### Bug Fixes (Feb 4, 2026)

#### 1. **Database Query Null Check Issue**
- **Problem**: Celery task was failing with `'NoneType' object has no attribute 'status'` because the database query was returning `None`
- **Fix**: Added proper error handling in `run_task.py` to validate that the run exists before accessing its attributes
- **Location**: [app/services/run_task.py](app/services/run_task.py#L14-L17)
- **Change**: Added null check and informative error logging when a run is not found

#### 2. **Invalid Model Name Format**
- **Problem**: HuggingFace Inference Client was receiving invalid model ID `'Qwen/Qwen2.5-1.5B-Instruct:featherless-ai'` with forbidden `:featherless-ai` suffix
- **Fix**: Corrected model name to valid format `'Qwen/Qwen2.5-1.5B-Instruct'`
- **Location**: [app/core/llm_singleton.py](app/core/llm_singleton.py#L16)
- **Impact**: Tasks now successfully authenticate and communicate with HuggingFace API

#### 3. **Enhanced Error Logging**
- **Improvement**: Added comprehensive error logging with stack traces for debugging
- **Location**: [app/services/run_task.py](app/services/run_task.py#L51-L57)
- **Benefit**: Better visibility into task failures for troubleshooting

### Current Status
✅ Database integration working
✅ Celery task queue functional
✅ HuggingFace API integration operational
✅ Error handling and logging in place

## Next Steps
- Complete end-to-end LLM prompt execution testing
- Add comprehensive monitoring and performance metrics
- Implement task result storage and retrieval
- Expand API features (batch processing, webhooks)
- Add comprehensive test coverage
- Set up production monitoring and alerting