# LLM-Platform-LLMOps-System

## Overview
A comprehensive FastAPI-based LLMOps platform for managing, versioning, and executing LLM prompts with built-in security, rate limiting, asynchronous task execution, and advanced evaluation capabilities. Designed to streamline prompt engineering workflows with experiment tracking, golden examples management, and automated quality assessment.

## ✅ Key Features

### 1. **Core Architecture**
- Modern FastAPI application with modular structure (api, models, schemas, services, core)
- PostgreSQL database integration with SQLAlchemy ORM
- Alembic migrations for database version control
- Asynchronous task processing with Celery for long-running operations

### 2. **Comprehensive Database Models**
- **User**: User management with UUID primary keys and timestamps
- **APIKey**: API key authentication with user relationships and activation status
- **Prompt**: Prompt templates with name, description, and versioning support
- **PromptVersion**: Full version control for prompts with template storage and activation tracking
- **Run**: Execution logs for prompt runs with cost tracking and status monitoring
- **CostLog**: Financial tracking for LLM API calls
- **GoldenExample**: Reference input-output pairs for prompt evaluation
- **Experiment**: Batch evaluation experiments across multiple prompt versions
- **ExperimentResult**: Detailed results with scoring metrics (avg/min/max scores, hallucination rates, failure counts)
- **EvaluationResult**: Individual evaluation results with similarity scores and hallucination detection

### 3. **Comprehensive API Endpoints (v1)**

**Prompt Management:**
- **POST /api/v1/prompts**: Create new prompts with initial template
- **POST /api/v1/prompts/{prompt_id}/versions**: Create new versions of existing prompts
- **GET /api/v1/prompts/{prompt_id}/versions**: List all versions of a prompt with metadata

**Prompt Execution:**
- **POST /api/v1/run**: Execute prompts with specified model (returns immediately, processes asynchronously)
- **GET /api/v1/task-status/{task_id}**: Check execution status and retrieve results

**Golden Examples & Evaluation:**
- **POST /api/v1/golden-examples**: Create golden examples for evaluation
- **POST /api/v1/run-experiment**: Trigger comprehensive experiments across prompt versions
- **GET /api/v1/experiment-results/{experiment_id}**: Retrieve experiment results with metrics

**System Health:**
- **GET /api/v1/health**: Health check endpoint

### 4. **Security & Authentication**
- API key-based authentication system with activation control
- Request ID middleware for request tracking and debugging
- Protected endpoints with API key validation on all critical operations

### 5. **Advanced Rate Limiting**
- Per-API-key rate limiting middleware
- Cost-based tracking for API calls
- Prevents abuse while allowing legitimate usage

### 6. **Intelligent Services**

**PromptRenderer**: 
- Template rendering engine for dynamic prompts with variable substitution
- Support for complex prompt structures with conditional logic

**LLMRunner**: 
- Integration with HuggingFace Inference Client
- Model abstraction for easy switching between different LLM providers
- Support for Qwen models and extensible architecture

**Evaluator**: 
- Semantic similarity scoring between expected and actual outputs
- Hallucination detection and rate calculation
- Configurable evaluation metrics

**Run Experiment**: 
- Batch evaluation across multiple prompt versions
- Golden example-based comparison
- Comprehensive metrics collection and aggregation

**PromptDiffer**: 
- Detailed comparison between prompt versions
- Shows what changed between iterations

### 7. **Asynchronous Task Execution**
- Celery integration for background task processing
- Supports long-running experiments without blocking API responses
- Task status tracking and result retrieval
- Error handling and automatic retries

### 8. **Configuration**
- Environment-based configuration using Pydantic Settings
- Support for PostgreSQL connection pooling
- HuggingFace API integration for model inference
- Weights & Biases integration support for experiment tracking
- .env file support for sensitive credentials

## Tech Stack
- **Framework**: FastAPI (Python async web framework)
- **Web Server**: Uvicorn (ASGI server)
- **Database**: PostgreSQL (relational database)
- **ORM**: SQLAlchemy (Python SQL toolkit)
- **Migration Tool**: Alembic (database migrations)
- **Task Queue**: Celery (distributed task processing)
- **Message Broker**: Redis (task queue broker and cache)
- **Containerization**: Docker & Docker Compose
- **Monitoring**: Celery Flower (task monitoring dashboard)
- **Authentication**: API Key-based (custom implementation)
- **LLM Integration**: HuggingFace Inference Client (model inference)
- **Language**: Python 3.x

## 🐳 Docker Setup (Production)

A production-ready Docker setup with enterprise-grade hardening, security best practices, resource limits, and automatic scaling.

### Architecture Overview

The Docker setup includes:
- **PostgreSQL** - Primary database with health checks and persistent volumes
- **Redis** - Message broker for Celery and caching with AOF persistence
- **FastAPI** - Main API application with multi-worker setup (4 workers)
- **Celery Worker** - Asynchronous task processor for long-running operations
- **Flower** - Celery monitoring dashboard with basic auth protection
- **Migrate Service** - Dedicated database migration runner (prevents race conditions)

### Quick Start

Production setup with security hardening and resource limits:

```bash
# 1. Create secure .env file
cp .env.example .env

# 2. Update .env with strong credentials
# IMPORTANT: Change these values!
#   - POSTGRES_PASSWORD - Use a strong password
#   - API_SECRET_KEY - Generate a secure key
#   - HUGGINGFACE_API_KEY
#   - FLOWER_USERNAME and FLOWER_PASSWORD - For dashboard access

# 3. Start production services
docker-compose -f docker-compose.prod.yml up -d

# 4. Verify services are running
docker-compose -f docker-compose.prod.yml ps
```

**Access Services:**
- **API**: http://localhost:8000/api/v1/*
- **API Docs**: http://localhost:8000/docs
- **Celery Monitoring**: http://localhost:5555 (with basic auth)
- **Health Check**: http://localhost:8000/api/v1/health

### Configuration

#### `.env` (Environment Variables)
```bash
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_strong_password    # CHANGE THIS!
POSTGRES_DB=llmops
POSTGRES_PORT=5432

# API
API_SECRET_KEY=your_secret_key            # CHANGE THIS!

# External Services
HUGGINGFACE_API_KEY=your_hf_key           # Required
WANDB_API_KEY=your_wandb_key              # Optional

# Flower Dashboard Auth
FLOWER_USERNAME=admin
FLOWER_PASSWORD=strong_password           # CHANGE THIS!
```

### Production Features

- ✅ **Multi-worker Uvicorn** (4 workers) for concurrent request handling
- ✅ **Resource Limits** - CPU & memory constraints prevent runaway containers
- ✅ **Restart Policies** - Auto-recovery for failed containers
- ✅ **Logging Rotation** - 10MB max file size with 3-5 file retention
- ✅ **Security** - Basic auth on Flower, non-root containers, immutable images
- ✅ **High Availability** - Health checks, service dependencies, persistent volumes
- ✅ **Database Migrations** - Dedicated migration service prevents race conditions
- ✅ **Redis Persistence** - AOF enabled for data durability

### Quick Start - Development

Development setup with hot-reload for fast iteration:

```bash
# 1. Create environment file from template
cp .env.example .env

# 2. Edit .env with your credentials
# Be sure to set:
#   - POSTGRES_PASSWORD
#   - HUGGINGFACE_API_KEY
#   - API_SECRET_KEY

# 3. Start all services with hot-reload enabled
docker-compose -f docker-compose.dev.yml up -d

# OR use the convenient Makefile command:
make dev

# 4. Verify services are running
docker-compose -f docker-compose.dev.yml ps
```

**Access Development Services:**
- **API Documentation**: http://localhost:8000/docs
- **API OpenAPI JSON**: http://localhost:8000/openapi.json
- **Celery Monitoring**: http://localhost:5555 (username: `admin`, password: `dev123`)
- **Health Check**: http://localhost:8000/api/v1/health

### Quick Start - Production

Optimized production setup with security hardening and resource limits:

```bash
# 1. Create secure .env file
cp .env.example .env

# 2. Update .env with strong credentials
# IMPORTANT: Change these values!
#   - POSTGRES_PASSWORD - Use a strong password
#   - API_SECRET_KEY - Generate a secure key
#   - HUGGINGFACE_API_KEY
#   - FLOWER_USERNAME and FLOWER_PASSWORD - For dashboard access

# 3. Start production services
docker-compose -f docker-compose.prod.yml up -d

# OR use the convenient Makefile command:
make prod

# 4. Verify services
docker-compose -f docker-compose.prod.yml ps
```

**Access Production Services:**
- **API**: http://localhost:8000/api/v1/*
- **Celery Monitoring**: http://localhost:5555 (with basic auth)

### Configuration Files

#### `.env` (Environment Variables)
```bash
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password      # CHANGE THIS!
POSTGRES_DB=llmops
POSTGRES_PORT=5432

# API
API_SECRET_KEY=your_secret_key       # CHANGE THIS!

# External Services
HUGGINGFACE_API_KEY=your_hf_key      # Required
WANDB_API_KEY=your_wandb_key         # Optional

# Flower Dashboard (Production)
FLOWER_USERNAME=admin
FLOWER_PASSWORD=strong_password      # CHANGE THIS!
```

### Compose Files Explained

| File | Purpose | Use Case | Key Feature |
|------|---------|----------|-------------|
| `docker-compose.yml` | Default production-like setup | Default for deployment | No hot-reload, safe for production |
| `docker-compose.dev.yml` | Development with hot-reload | Local development | `--reload` enabled, debug logging |
| `docker-compose.prod.yml` | Full production hardening | Production deployment | Multi-workers, resource limits, logging rotation |

## Architecture Overview

### Using Makefile Commands

A `Makefile` is included with convenient commands for Docker operations:

```bash
# Development
make dev              # Start with hot-reload
make dev-down         # Stop development environment
make dev-logs         # View development logs

# Production
make prod             # Start production (optimized)
make prod-down        # Stop production environment
make prod-logs        # View production logs

# Common Commands
make up               # Start default configuration
make down             # Stop all services
make build            # Build Docker images
make logs             # View logs from all services
make logs-api         # View API logs only
make restart          # Restart all services

# Database Management
make migrate          # Run pending database migrations
make migrate-history  # View migration history
make db-shell         # Open PostgreSQL shell
make redis-cli        # Open Redis CLI

# Monitoring & Debugging
make health           # Check service health status
make stats            # View container resource usage
make flower           # Open Flower dashboard in browser
make api-docs         # Open API documentation in browser

# Maintenance
make clean            # Stop all services and remove volumes (⚠️  DATA LOSS)
make lint             # Validate docker-compose files
make env-check        # Check .env file exists
make quickstart       # Show quick start guide

# View all available commands
make help
```

### Service Management

#### Basic Commands

```bash
# Start services (default/production)
docker-compose up -d

# Start with development config
docker-compose -f docker-compose.dev.yml up -d

# Stop all services
docker-compose down

# View running services
docker-compose ps

# View logs
docker-compose logs -f                    # All services
docker-compose logs -f api                # Specific service
docker-compose logs -f celery-worker      # Celery logs
```

#### Advanced Commands

```bash
# Rebuild images after code changes
docker-compose build --no-cache

# Run migrations manually
docker-compose exec api alembic upgrade head

# Access database shell
docker-compose exec postgres psql -U postgres -d llmops

# Access Redis CLI
docker-compose exec redis redis-cli

# View specific service logs
docker-compose logs --tail=100 api        # Last 100 lines
docker-compose logs -f --since=10m api    # Last 10 minutes

# Restart a service
docker-compose restart api

# Remove volumes and clean up
docker-compose down -v                    # ⚠ Deletes all data!
```

### Database Migrations

Migrations run automatically on startup, but you can manage them manually:

```bash
# View migration history
docker-compose exec api alembic history

# Create new migration
docker-compose exec api alembic revision --autogenerate -m "description"

# Apply migrations
docker-compose exec api alembic upgrade head

# Rollback migrations
docker-compose exec api alembic downgrade -1

# Check current database version
docker-compose exec api alembic current
```

### Performance & Security Features

#### Development (docker-compose.dev.yml)
- ✅ Hot-reload enabled for code changes
- ✅ Debug logging (level=debug for Celery)
- ✅ Volume mounts for live code editing
- ✅ Development-friendly Flower password

#### Production (docker-compose.prod.yml)
- ✅ **Multi-worker Uvicorn** (4 workers) for concurrent requests
- ✅ **Resource Limits** - Memory & CPU constraints per service (prevents runaway containers)
- ✅ **Restart Policies** - Automatically restart failed containers for high availability
- ✅ **Logging Rotation** - 10MB max file size, max 3-5 files (prevents disk fill-up)
- ✅ **No hot-reload** - Optimized for performance
- ✅ **Basic Auth** - Protected Flower dashboard access
- ✅ **No volume mounts** - Uses COPY for immutable containers
- ✅ **AOF Persistence** - Redis data persists across restarts
- ✅ **Dedicated Migration Service** - Prevents race conditions when scaling

### Docker Files Overview

| File | Purpose |
|------|---------|
| [`Dockerfile`](Dockerfile) | Base image for all services with Python 3.11, security best practices |
| [`docker-compose.yml`](docker-compose.yml) | Default balanced configuration with migrate service |
| [`docker-compose.dev.yml`](docker-compose.dev.yml) | Development configuration with hot-reload |
| [`docker-compose.prod.yml`](docker-compose.prod.yml) | Production configuration with hardening |
| [`Makefile`](Makefile) | Convenient commands for Docker operations |
| [`.dockerignore`](.dockerignore) | Excludes unnecessary files from Docker image |
| [`.env.example`](.env.example) | Template for environment variables |
| [`DOCKER_BEST_PRACTICES.md`](DOCKER_BEST_PRACTICES.md) | Detailed explanations of all improvements made |
| [`DOCKER_CHANGELOG.md`](DOCKER_CHANGELOG.md) | Summary of changes and enhancements |

### Troubleshooting

#### Services won't start

```bash
# Check if ports are already in use
netstat -an | findstr LISTEN          # Windows
lsof -i -P -n | grep LISTEN           # macOS/Linux

# Check service logs
docker-compose logs postgres
docker-compose logs redis
```

#### Database connection errors

```bash
# Verify PostgreSQL is healthy
docker-compose exec postgres pg_isready -U postgres -d llmops

# Check connection string
docker-compose exec api echo $DATABASE_URL
```

#### Celery tasks not processing

```bash
# Check Redis is working
docker-compose exec redis redis-cli ping     # Should return PONG

# View Celery worker logs
docker-compose logs celery-worker

# Check Celery Flower dashboard
# Visit http://localhost:5555 and check active tasks
```

#### Flower dashboard access denied

- **Development**: Username `admin`, Password `dev123`
- **Production**: Use credentials from your `.env` file

#### Permissions issues on Linux

```bash
# Fix volume permissions
sudo chown -R $(id -u):$(id -g) .

# Build with buildkit for better caching
DOCKER_BUILDKIT=1 docker-compose build
```

### Advanced Configuration

#### Scaling Celery Workers

In `docker-compose.yml`, add multiple worker replicas:

```yaml
services:
  celery-worker:
    # ... existing config ...
    deploy:
      replicas: 3  # Run 3 worker instances
```

#### Custom Database Initialization

To run custom SQL on startup, add to PostgreSQL service:

```yaml
postgres:
  volumes:
    - postgres_data:/var/lib/postgresql/data
    - ./init.sql:/docker-entrypoint-initdb.d/init.sql  # Runs once on first start
```

#### Using Docker Secrets (for Swarm mode)

```yaml
services:
  api:
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

### Monitoring & Health Checks

All services include health checks in the Docker configuration:

```bash
# View health status
docker-compose ps

# Check specific service health
docker inspect $(docker-compose ps -q api) | jq '.[0].State.Health'
```

The `migrate` service uses `service_completed_successfully` condition to ensure database is ready before API starts.

### Network Isolation

Services communicate via the `llmops-network` bridge network:

```bash
# View network details
docker network inspect llmops_llmops-network

# Services are accessible by hostname (e.g., postgres, redis) within the network
```

### Environment-Specific Secrets

For different deployment environments:

```bash
# Development
cp .env.example .env.dev
# Edit .env.dev with dev values
docker-compose -f docker-compose.dev.yml --env-file .env.dev up -d

# Production
cp .env.example .env.prod
# Edit .env.prod with prod values (STRONG PASSWORDS!)
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

### Next Steps

After starting with Docker:

1. **Create API Key**: Use `/api/v1/` endpoints to set up your first user
2. **Create Prompt**: POST to `/api/v1/prompts` with your prompt template
3. **Monitor Tasks**: Visit Flower dashboard at `http://localhost:5555`
4. **View Logs**: Use `docker-compose logs` for debugging
5. **Run Experiments**: Use `/api/v1/run-experiment` endpoint

### Additional Resources

- **[DOCKER_BEST_PRACTICES.md](DOCKER_BEST_PRACTICES.md)** - Comprehensive guide explaining all Docker improvements
- **[DOCKER_CHANGELOG.md](DOCKER_CHANGELOG.md)** - Detailed summary of changes and enhancements
- **[Makefile](Makefile)** - Convenient command shortcuts (`make help` for full list)
- **[.env.example](.env.example)** - Environment variable template

## Project Structure
```
alembic/                          # Database migrations and version control
  └── versions/                   # Individual migration files
app/
  ├── api/v1/                     # API endpoints (v1)
  │   ├── health.py              # Health check endpoint
  │   ├── run.py                 # Main execution and experiment endpoints
  │   └── protected.py           # Protected/internal endpoints
  ├── core/                       # Core configuration and utilities
  │   ├── config.py              # Pydantic settings and configuration
  │   ├── database.py            # SQLAlchemy session management
  │   ├── security.py            # API key authentication logic
  │   ├── middleware.py          # Request ID and logging middleware
  │   ├── rate_limit.py          # Rate limiting implementation
  │   ├── llm_singleton.py       # HuggingFace client initialization
  │   └── celery_app.py          # Celery task queue configuration
  ├── models/                     # SQLAlchemy ORM models
  │   ├── base.py                # Base model class and utilities
  │   ├── user.py                # User model
  │   ├── prompt.py              # Prompt and PromptVersion models
  │   ├── run.py                 # Run and CostLog models
  │   ├── evaluation.py          # GoldenExample and EvaluationResult models
  │   └── experiment.py          # Experiment and ExperimentResult models
  ├── schemas/                    # Pydantic request/response schemas
  │   ├── prompt.py              # Prompt creation and versioning schemas
  │   ├── run.py                 # Run request/response schemas
  │   └── evaluation.py          # Golden example and evaluation schemas
  └── services/                   # Business logic and integrations
      ├── llm_runner.py          # LLM inference wrapper
      ├── prompt_renderer.py     # Template rendering engine
      ├── evaluator.py           # Evaluation and scoring logic
      ├── prompt_diff.py         # Prompt version comparison
      ├── run_task.py            # Async task implementation
      └── run_experiment.py      # Experiment execution logic
database_design.py                # Schema and database design documentation
main.py                           # FastAPI application entry point
```


## 🔧 Recent Fixes & Improvements

### Critical Fixes (Feb 4-6, 2026)

#### 1. **Database Query Null Check Issue**
- **Problem**: Celery task was failing with `'NoneType' object has no attribute 'status'` because the database query was returning `None`
- **Fix**: Added proper error handling in [app/services/run_task.py](app/services/run_task.py#L14-L17) to validate that the run exists before accessing its attributes
- **Impact**: Celery tasks now safely handle database lookups with proper error messages

#### 2. **Invalid HuggingFace Model Name Format**
- **Problem**: HuggingFace Inference Client was receiving invalid model ID `'Qwen/Qwen2.5-1.5B-Instruct:featherless-ai'` with forbidden `:featherless-ai` suffix
- **Fix**: Corrected model name to valid format `'Qwen/Qwen2.5-1.5B-Instruct'` in [app/core/llm_singleton.py](app/core/llm_singleton.py#L16)
- **Impact**: Tasks now successfully authenticate and communicate with HuggingFace API

#### 3. **Enhanced Error Logging & Debugging**
- **Improvement**: Added comprehensive exception handling with stack traces and context logging
- **Locations**: 
  - [app/services/run_task.py](app/services/run_task.py#L51-L57) - Task execution logging
  - [app/services/run_experiment.py](app/services/run_experiment.py) - Experiment error handling
- **Benefit**: Enhanced visibility into task failures for faster troubleshooting and debugging

### Feature Implementation Summary

#### Experiment Framework (Completed)
- ✅ Golden example creation and storage
- ✅ Batch experiments across multiple prompt versions
- ✅ Comprehensive scoring metrics (average, min, max scores)
- ✅ Hallucination detection and rate calculation
- ✅ Failure tracking per experiment
- ✅ Experiment status tracking (pending, running, completed, failed)

#### Asynchronous Task Processing (Completed)
- ✅ Celery background task queue integration
- ✅ Non-blocking API responses with immediate return of task ID
- ✅ Task status polling endpoint with state tracking
- ✅ Result persistence and retrieval
- ✅ Error recovery and retry mechanisms

#### Evaluation System (Completed)
- ✅ Semantic similarity scoring between outputs
- ✅ Hallucination rate calculation
- ✅ Multi-metric evaluation framework
- ✅ Individual and aggregate result tracking

## 📋 Setup & Installation

### Prerequisites
- Python 3.8+
- PostgreSQL 12+
- Redis (for Celery task queue)
- HuggingFace API key

### Environment Setup

1. **Clone and install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure environment variables:**
   Create a `.env` file in the project root:
   ```
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=your_password
   POSTGRES_DB=llmops
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   HUGGINGFACE_API_KEY=your_hf_key
   WANDB_API_KEY=your_wandb_key
   API_SECRET_KEY=your_secret_key
   ```

3. **Initialize the database:**
   ```bash
   alembic upgrade head
   ```

4. **Start Celery worker:**
   ```bash
   celery -A app.core.celery_app worker --loglevel=info
   ```

5. **Start the API server:**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

The API will be available at `http://localhost:8000` with interactive docs at `/docs`.

## 🚀 Usage Examples

### Create a Prompt
```bash
curl -X POST "http://localhost:8000/api/v1/prompts" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "sentiment-analysis",
    "description": "Analyze sentiment of text",
    "template": "Analyze the sentiment of this text: {input}"
  }'
```

### Create Golden Examples
```bash
curl -X POST "http://localhost:8000/api/v1/golden-examples" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "prompt_id": "example-id",
    "input_data": "{\"input\": \"I love this!\"}",
    "expected_output": "Positive sentiment"
  }'
```

### Run an Experiment
```bash
curl -X POST "http://localhost:8000/api/v1/run-experiment" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "prompt_id": "example-id",
    "experiment_name": "v1-baseline"
  }'
```

## 📊 Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| Database integration | ✅ Working | Full SQLAlchemy ORM setup |
| Celery task queue | ✅ Functional | Async processing operational |
| HuggingFace API | ✅ Operational | Qwen models integrated |
| Error handling | ✅ Enhanced | Comprehensive logging in place |
| Rate limiting | ✅ Working | Per-API-key implementation |
| Evaluation system | ✅ Complete | Scoring and hallucination detection |
| Experiment framework | ✅ Complete | Batch evaluation with metrics |
| API endpoints | ✅ Complete | All v1 endpoints implemented |

## 🔄 Workflow

1. **Create Prompt** → Upload a new prompt template with variables
2. **Create Versions** → Iterate and create multiple versions of the same prompt
3. **Create Golden Examples** → Define input/output pairs for evaluation
4. **Run Experiments** → Execute experiments across prompt versions using golden examples
5. **Analyze Results** → Review metrics including similarity scores and hallucination rates
6. **Compare & Refine** → Use diff view to understand version changes and iterate

## 🔮 Future Enhancements

- [ ] Advanced visualization dashboard for experiment results
- [ ] Multi-model comparison framework
- [ ] Automatic hyperparameter optimization
- [ ] Integration with additional LLM providers (OpenAI, Anthropic, etc.)
- [ ] Batch processing for large-scale experiments
- [ ] Export functionality for results and reports
- [ ] Webhook integrations for CI/CD pipelines
- [ ] Advanced RBAC (Role-Based Access Control)

## 📝 Database Migrations

View all available migrations:
```bash
alembic history
```

Create a new migration:
```bash
alembic revision --autogenerate -m "description of change"
```

Apply/revert migrations:
```bash
alembic upgrade head        # Apply all pending migrations
alembic downgrade -1        # Revert last migration
```
- Add comprehensive monitoring and performance metrics
- Implement task result storage and retrieval
- Expand API features (batch processing, webhooks)
- Add comprehensive test coverage
- Set up production monitoring and alerting
