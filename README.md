# LLM Operations Platform

A comprehensive platform for managing, testing, and optimizing language model prompts with experiment tracking and evaluation capabilities.

---

## 🚀 Key Features

### Real LLM Pain Points Addressed 🎯
- **Prompt Regression** - Track how prompt changes affect model output across versions
- **Hallucinations** - Detect and measure hallucination rates in LLM responses  
- **Cost Tracking** - Monitor token usage and compute costs per run
- **Silent Degradation** - Catch performance drops with automated testing against golden examples

### Core Capabilities ✅
- **✅ LLM-based Evaluation Engine** - Automated scoring with hallucination detection
- **✅ Prompt Regression Testing** - Test all prompt versions against consistent golden examples
- **✅ Prompt Versioning & Experiments** - Track and compare multiple prompt versions
- **✅ Cost & Token Tracking** - Monitor latency, tokens, and cost for every run
- **✅ Clear API Design + DB Models** - Well-structured SQLAlchemy models and FastAPI endpoints
- **✅ Celery + Async Workloads** - Background processing for long-running LLM operations
- **✅ Golden Examples** - Reference test cases for regression detection

### Backend
- **FastAPI** - Modern Python web framework for the API
- **PostgreSQL** - Reliable database with Alembic migrations
- **Celery** - Async task processing with Redis message broker
- **LLM Integration** - Singleton pattern for efficient LLM usage (HuggingFace Inference API)
- **Rate Limiting** - Built-in rate limiting via Redis and API keys
- **API Key Authentication** - Bearer token authentication for secure API access

### Frontend
- **React + Vite** - Fast, modern UI with Vite build tool
- **Tailwind CSS** - Responsive and clean styling
- **Interactive Pages**:
  - Dashboard - Overview of all experiments
  - Experiments - Create and manage experiments
  - Prompts - Prompt library and management
  - Run Playground - Test prompts interactively
  - Evaluation Results - View detailed evaluation metrics
  - Analytics - Performance insights
  - Settings - Configuration management

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  ┌──────────────┬──────────────┬──────────────────────────┐  │
│  │  Dashboard   │ Experiments  │ Prompts │ Playground    │  │
│  │  Analytics   │ Evaluations  │ Settings                │  │
│  └──────────────┴──────────────┴──────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                         │ HTTP/REST
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   FastAPI Backend                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  API Routes (v1)                                      │   │
│  │  • /health         - Health check                    │   │
│  │  • /prompts        - Prompt management               │   │
│  │  • /experiments    - Experiment operations           │   │
│  │  • /runs           - Run management                  │   │
│  │  • /evaluations    - Evaluation results              │   │
│  │  • /protected      - Protected endpoints             │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Core Services                                        │   │
│  │  • LLM Singleton    - LLM integration                │   │
│  │  • Database         - PostgreSQL connection          │   │
│  │  • Security         - API Key authentication         │   │
│  │  • Rate Limiting    - API protection                 │   │
│  │  • Middleware       - Request/response handling      │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Business Logic Services                              │   │
│  │  • llm_runner       - Execute prompts with LLM       │   │
│  │  • evaluator        - Evaluation & scoring           │   │
│  │  • prompt_renderer  - Template rendering             │   │
│  │  • prompt_diff      - Version comparison             │   │
│  │  • run_experiment   - Orchestrate experiments        │   │
│  │  • run_task         - Background task manager        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         │                     │                  │
         ▼                     ▼                  ▼
    ┌─────────┐          ┌──────────┐       ┌──────────┐
    │PostgreSQL│          │ Celery   │       │  Docker  │
    │Database  │          │  Queue   │       │Container │
    │          │          │ Workers  │       │          │
    └─────────┘          └──────────┘       └──────────┘
```

### Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Tailwind CSS, ESLint |
| **Backend** | Python 3.9+, FastAPI, Pydantic |
| **Database** | PostgreSQL with SQLAlchemy ORM |
| **Migrations** | Alembic |
| **Task Queue** | Celery + Redis |
| **Containerization** | Docker, Docker Compose |
| **Authentication** | API Key with Bearer Token |
| **LLM Provider** | HuggingFace Inference API |

---

## 📋 Project Structure & Files

```
llmops/
│
├── 📄 Core Configuration Files
│   ├── alembic.ini              # Alembic database migration config
│   ├── requirements.txt          # Python dependencies
│   ├── docker-compose.prod.yml  # Production Docker Compose setup
│   ├── Dockerfile               # Docker image definition
│   └── README.md                # Project documentation
│
├── 📁 app/                       # FastAPI Backend Application
│   ├── main.py                  # FastAPI app entry point
│   │
│   ├── api/v1/                  # API Routes (Version 1)
│   │   ├── __init__.py
│   │   ├── health.py            # Health check endpoint
│   │   ├── protected.py         # Protected/authenticated endpoints
│   │   ├── run.py               # Run management endpoints
│   │   └── __pycache__/
│   │
│   ├── core/                    # Core Application Setup
│   │   ├── config.py            # Configuration settings
│   │   ├── database.py          # Database connection & sessions
│   │   ├── celery_app.py        # Celery configuration
│   │   ├── llm_singleton.py     # LLM instance management
│   │   ├── security.py          # API Key & authentication logic
│   │   ├── middleware.py        # Request/response middleware
│   │   ├── rate_limit.py        # Rate limiting logic
│   │   └── __pycache__/
│   │
│   ├── models/                  # Database Models (SQLAlchemy)
│   │   ├── __init__.py
│   │   ├── base.py              # Base model class
│   │   ├── user.py              # User model
│   │   ├── prompt.py            # Prompt model with versioning
│   │   ├── experiment.py        # Experiment configuration model
│   │   ├── run.py               # Experiment run model
│   │   ├── evaluation.py        # Evaluation results model
│   │   └── __pycache__/
│   │
│   ├── schemas/                 # Pydantic Request/Response Schemas
│   │   ├── prompt.py            # Prompt request/response schemas
│   │   ├── experiments.py       # Experiment schemas
│   │   ├── run.py               # Run schemas
│   │   ├── evaluation.py        # Evaluation schemas
│   │   └── __pycache__/
│   │
│   ├── services/                # Business Logic Services
│   │   ├── __init__.py
│   │   ├── llm_runner.py        # Execute prompts with LLM
│   │   ├── evaluator.py         # Evaluation & scoring logic
│   │   ├── prompt_renderer.py   # Template rendering
│   │   ├── prompt_diff.py       # Version comparison
│   │   ├── run_experiment.py    # Experiment orchestration
│   │   ├── run_task.py          # Background task management
│   │   └── __pycache__/
│   │
│   └── __pycache__/
│
├── 📁 frontend/                 # React Frontend Application
│   ├── package.json             # Node.js dependencies
│   ├── vite.config.js           # Vite build configuration
│   ├── tailwind.config.js       # Tailwind CSS configuration
│   ├── postcss.config.js        # PostCSS configuration
│   ├── eslint.config.js         # ESLint configuration
│   ├── index.html               # HTML entry point
│   │
│   ├── src/
│   │   ├── main.jsx             # React entry point
│   │   ├── App.jsx              # Main App component
│   │   ├── App.css              # App styles
│   │   ├── index.css            # Global styles
│   │   │
│   │   ├── components/          # Reusable Components
│   │   │   ├── Layout.jsx       # Main layout wrapper
│   │   │   ├── Modal.jsx        # Modal component
│   │   │   ├── ExperimentResultsModal.jsx    # Experiment results
│   │   │   ├── RunPromptModal.jsx            # Run prompt form
│   │   │   ├── EvaluationResults.jsx         # Evaluation display
│   │   │   └── GoldenExamples.jsx            # Golden examples UI
│   │   │
│   │   ├── pages/               # Page Components
│   │   │   ├── Dashboard.jsx    # Overview dashboard
│   │   │   ├── Experiments.jsx  # Experiments management
│   │   │   ├── Prompts.jsx      # Prompt library
│   │   │   ├── RunPlayground.jsx # Interactive testing
│   │   │   ├── Analytics.jsx    # Performance analytics
│   │   │   └── Settings.jsx     # Configuration
│   │   │
│   │   ├── services/            # API Client
│   │   │   └── api.js           # REST API wrapper
│   │   │
│   │   ├── assets/              # Static assets
│   │   │
│   │   └── (other frontend files)
│   │
│   ├── public/                  # Static files served directly
│   └── node_modules/           # NPM packages
│
├── 📁 alembic/                  # Database Migrations
│   ├── env.py                   # Alembic environment config
│   ├── alembic.ini             # Migration settings
│   ├── script.py.mako          # Migration template
│   │
│   ├── versions/               # Migration Files
│   │   ├── c6633d3a19a7_initial_schema.py
│   │   ├── add_status_to_runs.py
│   │   ├── add_avg_hallucination_rate_to_experiment_results.py
│   │   ├── add_golden_examples_and_evaluation*.py
│   │   ├── add_is_active_and_created_at_to_prompt*.py
│   │   ├── add_status_for_experiment.py
│   │   ├── add_reason_to_evaluation_result.py
│   │   └── __pycache__/
│   │
│   ├── README
│   └── __pycache__/
│
├── 📁 tasks/                    # Standalone Background Tasks
│   └── run_prompt_task.py       # Celery task for running prompts
│
├── 📁 diagrams/                 # Architecture diagrams
│
└── 📁 digrams/                  # (Alternative diagrams folder)
```

---

## 🐳 Docker Setup

### Docker Files

**Dockerfile** - Production Image
```dockerfile
# Contains multi-stage build for backend services
# Installs Python dependencies
# Exposes port 8000 for FastAPI
```

**docker-compose.prod.yml** - Production Orchestration
```yaml
# Services defined:
# - FastAPI Backend (port 8000)
# - PostgreSQL Database (port 5432)
# - Celery Worker (background tasks)
# - Redis/Message Broker (if needed)
```

### Docker Commands

```bash
# Build images and start all services
docker-compose -f docker-compose.prod.yml up --build

# Run in background
docker-compose -f docker-compose.prod.yml up -d

# Stop services
docker-compose -f docker-compose.prod.yml down

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Execute command in container
docker-compose -f docker-compose.prod.yml exec api alembic upgrade head

# Remove volumes (clean slate)
docker-compose -f docker-compose.prod.yml down -v
```

---

## 🔧 Configuration Files

### Backend Configuration

**alembic.ini**
- Database migration configuration
- SQLAlchemy URL setup
- Migration logging settings

**requirements.txt**
- Python dependencies
- Versions pinned for stability
- Includes: FastAPI, SQLAlchemy, Celery, Pydantic, etc.

**app/core/config.py**
- Environment variables
- Database URL
- LLM API keys
- API Key authentication settings
- Celery settings

### Frontend Configuration

**frontend/vite.config.js**
- Vite dev server setup
- Build optimization
- Plugin configuration

**frontend/tailwind.config.js**
- Tailwind CSS customization
- Color schemes
- Component styling

**frontend/package.json**
- Node.js dependencies
- Scripts for dev/build/preview
- Dev server configuration

---

## 🚀 Installation & Setup

### Prerequisites
- **Python 3.9+** - Backend runtime
- **Node.js 16+** - Frontend runtime  
- **PostgreSQL 12+** - Database
- **Docker & Docker Compose** - For containerized deployment
- **Git** - Version control

### Step 1: Install Backend

```bash
# Install Python dependencies
pip install -r requirements.txt

# Set up environment variables
# Create a `.env` file with:
# DATABASE_URL=postgresql://user:password@localhost/llmops
# HF_API_TOKEN=your_huggingface_token_here
# REDIS_URL=redis://localhost:6379/0
```

### Step 2: Setup Database

```bash
# Run migrations
alembic upgrade head

# Create test API key (optional)
python create_test_api_key.py
```

### Step 3: Install Frontend

```bash
cd frontend
npm install
```

### Step 4: Create `.env.local` in frontend/
```
VITE_API_URL=http://localhost:8000
```

---

## 🏃 Running the Application

### Development Setup (Multiple Terminals)

**Terminal 1: FastAPI Backend**
```bash
# From root directory
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- Access: http://localhost:8000
- Docs: http://localhost:8000/docs

**Terminal 2: React Frontend**
```bash
cd frontend
npm run dev
```
- Access: http://localhost:5173

**Terminal 3: Celery Worker** (for async tasks)
```bash
celery -A app.core.celery_app worker -l info
```

**Terminal 4: Celery Beat** (for scheduled tasks - optional)
```bash
celery -A app.core.celery_app beat -l info
```

### Production Deployment with Docker

```bash
# Build images and start services
docker-compose -f docker-compose.prod.yml up -d --build

# Run database migrations in container
docker-compose -f docker-compose.prod.yml exec api alembic upgrade head

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop all services
docker-compose -f docker-compose.prod.yml down
```

---

## 📚 API Documentation

### Interactive API Docs
When backend is running:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### API Endpoints

#### Health Check
```
GET /api/v1/health
```

#### Prompt Management
```
POST   /api/v1/prompts                          # Create prompt
GET    /api/v1/prompts                          # List all prompts
GET    /api/v1/prompts/{prompt_id}/versions     # List prompt versions
POST   /api/v1/prompts/{prompt_id}/versions     # Create new version
POST   /api/v1/prompts/{prompt_id}/versions/{version_id}/activate   # Activate version
GET    /api/v1/prompts/diff                     # Compare versions
```

#### Golden Examples (for regression testing)
```
POST   /api/v1/prompts/{prompt_id}/golden-examples        # Add test case
GET    /api/v1/prompts/{prompt_id}/golden-examples        # List test cases
POST   /api/v1/prompts/{prompt_id}/versions/{version_id}/evaluate  # Evaluate version
```

#### Runs (LLM Execution)
```
POST   /api/v1/run               # Execute prompt (returns pending, processes async)
GET    /api/v1/runs              # List runs
GET    /api/v1/task-status/{task_id}   # Check execution status
```

#### Experiments (Batch Testing)
```
POST   /api/v1/experiments/run                # Trigger experiment run
GET    /api/v1/experiments                   # List experiments
GET    /api/v1/experiments/{experiment_id}/status  # Get results
```

#### Protected Endpoints
```
GET    /api/v1/protected         # Example protected route (requires API key)
```

---

## 🗄️ Database

### Database Migrations

**Configuration**
- Alembic handles all schema changes
- Located in `alembic/versions/`
- Each migration is timestamped and versioned

**Create New Migration**
```bash
alembic revision --autogenerate -m "description of changes"
```

**Apply Migrations**
```bash
# Upgrade to latest
alembic upgrade head

# Downgrade
alembic downgrade -1

# Check current version
alembic current
```

**Migration History**
```
- c6633d3a19a7 - Initial schema (users, prompts, experiments, runs, evaluations)
- add_status_to_runs - Added status field to runs table
- add_avg_hallucination_rate_to_experiment_results - Hallucination tracking
- add_golden_examples_and_evaluation* - Golden examples & evaluation enhancements
- add_is_active_and_created_at_to_prompt* - Timestamp and status features
- add_reason_to_evaluation_result - Enhanced evaluation details
```

### Database Models

| Model | Table | Purpose |
|-------|-------|---------|
| **User** | users | User account for API key management |
| **APIKey** | api_keys | Bearer token keys linked to users |
| **Prompt** | prompts | Prompt templates with versioning support |
| **PromptVersion** | prompt_versions | Individual prompt version with template |
| **Run** | runs | Single LLM execution with metrics (latency, tokens) |
| **CostLog** | cost_logs | Cost tracking per run in USD |
| **GoldenExample** | golden_examples | Test cases for regression testing |
| **Experiment** | experiments | Batch testing run configuration |
| **ExperimentResult** | experiment_results | Aggregated metrics (avg score, hallucination rate) |
| **EvaluationResult** | evaluation_results | Individual evaluation score with hallucination detection |

---

## 🔧 Core Services

### Backend Services (`app/services/`)

| Service | Purpose |
|---------|---------|
| **llm_runner.py** | Call HuggingFace Inference API, estimate token counts |
| **evaluator.py** | LLM-based comparison of output vs expected, detects hallucinations |
| **prompt_renderer.py** | Template filling with variables (simple .format() style) |
| **prompt_diff.py** | Generate unified diff between prompt versions |
| **run_experiment.py** | Celery task: tests all versions against all golden examples |
| **run_task.py** | Celery task: executes single prompt, tracks metrics |

### Core Module (`app/core/`)

| Module | Responsibility |
|--------|---------------| 
| **config.py** | Environment variables, app settings |
| **database.py** | SQLAlchemy session management |
| **llm_singleton.py** | Single LLM instance for efficiency |
| **security.py** | API key validation, Bearer token verification |
| **middleware.py** | Request logging, error handling, request IDs |
| **rate_limit.py** | Redis-backed rate limiting (60 req/min per key) |
| **celery_app.py** | Celery configuration with Redis broker |

---

## 📦 Utility Scripts

### Standalone Scripts (Root Level)

**create_test_api_key.py**
```bash
python create_test_api_key.py
```
Creates test API key for development/testing

**database_design.py**
Database schema documentation and planning

### Background Tasks (`tasks/`)

**run_prompt_task.py**
- Celery task for prompt execution
- Handles long-running operations
- Integrates with LLM runner

---

## 🎨 Frontend Components

### Page Components (`frontend/src/pages/`)

| Page | Features |
|------|----------|
| **Dashboard.jsx** | Overview, recent experiments, stats |
| **Experiments.jsx** | Create, list, manage experiments |
| **Prompts.jsx** | Prompt library, versioning |
| **RunPlayground.jsx** | Interactive prompt testing |
| **Analytics.jsx** | Performance metrics, charts |
| **Settings.jsx** | Configuration, preferences |

### Reusable Components (`frontend/src/components/`)

| Component | Purpose |
|-----------|---------|
| **Layout.jsx** | Navigation, sidebar, wrapper |
| **Modal.jsx** | Generic modal container |
| **ExperimentResultsModal.jsx** | Display experiment results |
| **RunPromptModal.jsx** | Form to run prompt |
| **EvaluationResults.jsx** | Show evaluation metrics |
| **GoldenExamples.jsx** | Manage golden examples |

### API Service (`frontend/src/services/api.js`)
```javascript
// Wraps all backend API calls
// Handles authentication, errors
// Base URL: VITE_API_URL environment variable
```

---

## 📊 Data Flows

### Single Run Execution Flow
```
1. User calls: POST /api/v1/run with prompt_version_id & variables
   ↓
2. API validates API key and rate limits
   ↓
3. Creates Run record with status="pending"
   ↓
4. Queues Celery task (run_prompt_task)
   ↓
5. Returns task_id to client
   ↓
6. [Async] Celery worker:
   → prompt_renderer.py renders template with variables
   → llm_runner.py calls LLM (HuggingFace Inference API)
   → Tracks latency_ms, tokens_in, tokens_out
   → Calculates cost: (tokens_in + tokens_out) * 0.00001
   → Stores in Run & CostLog tables
   → Updates status="completed"
   ↓
7. User polls: GET /api/v1/task-status/{task_id}
   ↓
8. Returns result when task completes
```

### Experiment (Regression Testing) Flow
```
1. User calls: POST /api/v1/experiments/run with prompt_id & experiment_name
   ↓
2. API validates API key and rate limits
   ↓
3. Creates Experiment record with status="running"
   ↓
4. Queues Celery task (run_experiment)
   ↓
5. Returns immediately with message
   ↓
6. [Async] Celery worker fetches:
   → All PromptVersion records for this prompt
   → All GoldenExample test cases for this prompt
   ↓
7. For each version × golden_example:
   → prompt_renderer.py renders template with input_data
   → llm_runner.py calls LLM
   → evaluator.py compares output vs expected_output
   → Calculates: score, hallucination_rate, reason
   → Stores EvaluationResult
   ↓
8. Aggregates per version:
   → avg_score, min_score, max_score
   → avg_hallucination_rate
   → failure_count (scores < 0.5)
   → Stores ExperimentResult
   ↓
9. Updates Experiment status="completed"
   ↓
10. User views: GET /api/v1/experiments/{experiment_id}/status
    → Gets full results with all metrics
```

### Prompt Evaluation Flow (Single Version)
```
1. User calls: POST /api/v1/prompts/{prompt_id}/versions/{version_id}/evaluate
   ↓
2. Fetches PromptVersion & all GoldenExamples
   ↓
3. For each golden example:
   → Renders template with input_data
   → Calls LLM
   → Evaluates against expected_output
   → Stores EvaluationResult
   ↓
4. Returns average_score & total_tests performed
```

---

## 🔐 Security Features

### Authentication
- **API Key Authentication** - Bearer token based API keys stored in database
- **Rate Limiting** - Prevent API abuse with Redis-backed rate limiting (60 requests/minute per API key)
- **Protected Routes** - Secured endpoints require valid API key (in `api/v1/protected.py`)
- **Active/Inactive Status** - API keys can be deactivated without deletion

### Authorization
- **User-based access control** - Each API key linked to a user
- **Middleware** - Request validation and logging (in `core/middleware.py`)

### API Key Setup
```python
# In core/security.py
HTTPBearer(auto_error=False) - Validates Bearer tokens
get_api_key() - Dependency for protecting routes
```

---

## 🧪 Development Tips

### Best Practices

1. **API Key Authentication**
   - Generate test key: `python create_test_api_key.py`
   - Use in requests: `Authorization: Bearer {api_key}`
   - Rate limited to 60 requests/minute per key

2. **Database Changes**
   - Always create migrations for schema changes
   - Test migrations locally first
   - Keep migrations simple and focused

3. **New API Endpoints**
   - Add to `app/api/v1/`
   - Create schemas in `app/schemas/`
   - Add business logic in `app/services/`
   - Protect endpoints with `Depends(get_api_key)` if needed
   - Apply rate limiting: `rate_limit(api_key)`

4. **Frontend Development**
   - Run `npm run dev` for hot reload
   - Use ESLint for code quality: `npm run lint`
   - Check components in isolation
   - Pass API key via Authorization header in API service

5. **Task Management (Celery)**
   - Monitor Celery with: `celery -A app.core.celery_app inspect active`
   - Check task status via: `GET /api/v1/task-status/{task_id}`
   - Logs go to `app.log`

---

## 🐛 Troubleshooting

### Common Issues

**401 Unauthorized / Invalid API Key**
```
Generate test key: python create_test_api_key.py
Verify Authorization header: Authorization: Bearer {api_key}
Check API key is active in database
```

**Database Connection Error**
```
Check DATABASE_URL in .env
Verify PostgreSQL is running
Run: alembic upgrade head
```

**Frontend API Errors**
```
Check VITE_API_URL in frontend/.env.local
Verify backend is running on port 8000
Check CORS configuration in app/core/middleware.py
Ensure Authorization header is being sent with API key
```

**Celery Tasks Not Running**
```
Ensure Celery worker is running
Check celery logs for errors
Verify Redis is running and REDIS_URL is correct in .env
Check queue routing in app/core/celery_app.py
```

**Rate Limit Exceeded (429)**
```
Too many requests with same API key
Check Redis is running for rate limiting
Rate limit: 60 requests per minute per API key
```

**HuggingFace API Errors**
```
Check HF_API_TOKEN is valid in .env
Verify internet connection
Check HuggingFace API status
```

**Docker Issues**
```
docker-compose -f docker-compose.prod.yml down -v  # Remove volumes
docker-compose -f docker-compose.prod.yml up --build  # Fresh build
```

---

## 📈 Performance Optimization

### Implemented Features

- **LLM Singleton** - Reuse LLM instance across requests
- **Database Connection Pooling** - SQLAlchemy session management
- **Celery Queue** - Offload long-running tasks
- **Rate Limiting** - Prevent API abuse
- **Vite Build** - Optimized frontend bundles

### Monitoring

- **Health Check**: `GET /api/v1/health` - System status
- **Celery Monitoring**: Built-in Celery inspection tools
- **Database Metrics**: SQLAlchemy query logs

---

## 📝 Environment Variables

### Backend (.env file)

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/llmops

# Redis (for Celery message broker and rate limiting)
REDIS_URL=redis://localhost:6379/0

# LLM Provider (HuggingFace Inference API)
HF_API_TOKEN=hf_xxxxxxxxxxxx

# App
DEBUG=True
ENVIRONMENT=development
LOG_LEVEL=INFO
```

### Frontend (frontend/.env.local)

```bash
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=LLM Operations Platform
```

---

## 🤝 Contributing

### Development Workflow

1. Create feature branch
2. Make changes following code style
3. Add/update database migrations if needed
4. Test locally with all services running
5. Commit and push

### Code Quality

- Backend: Follow PEP 8, use type hints
- Frontend: ESLint enabled, Tailwind for styling
- Both: Descriptive variable/function names

---

## 📄 License

MIT

---

## 🤝 Support

For issues and questions, please refer to the project documentation or create an issue in the repository.
