# LLMOps Platform — Technical Architecture & Implementation Details

This document provides a comprehensive technical reference for the **LLMOps Platform**, an enterprise-grade LLM operations and prompt lifecycle management platform. It covers the end-to-end design, implementation architecture, execution flows, and infrastructure verified against the codebase.

---

## 1. Overview

Deploying Large Language Models in production introduces challenges not addressed by traditional software engineering pipelines:
- **Prompt Regression:** Modifying prompt phrasing to fix an edge case frequently breaks previously working behaviors.
- **Silent Degradation & Hallucinations:** Model updates or prompt alterations can introduce subtle hallucinations or degrade output faithfulness without throwing runtime errors.
- **Cost & Latency Volatility:** Dynamic prompt lengths and unpredictable generation tokens impact cost and response times.
- **Evaluation Bottlenecks:** Evaluating prompt iterations manually does not scale; automated regression testing against reference test cases ("Golden Examples") is essential.

The **LLMOps Platform** addresses these challenges by providing:
1. **Prompt Version Control & Lifecycle Management:** Semantic versioning (`v1`, `v2`, etc.), template rendering, active version assignment, and line-by-line unified diff inspection.
2. **Automated Regression Testing & Experiments:** Evaluation of prompt versions against fixed Golden Examples using an LLM-as-a-judge scoring engine (task correctness, completeness, and hallucination rate).
3. **Asynchronous LLM Execution Pipeline:** Decoupled prompt execution powered by Celery and Redis to handle model latency without blocking API workers.
4. **Pairwise A/B Testing:** Side-by-side prompt execution running both candidates in parallel via thread workers, complete with human voting and qualitative feedback.
5. **Observability & Analytics:** Real-time tracking of latency, token consumption (input/output), compute cost, and model usage distributions.
6. **Dual-Token Security Model:** JWT authentication for user accounts and API key management, coupled with Bearer API keys and Redis sliding-window rate limiting for platform operations.

---

## 2. System Architecture

The platform is designed around strict separation of concerns, decoupling the presentation, API routing, business logic, persistence, and background task execution layers.

```mermaid
flowchart TD
    Client["Client (Browser / React 19 UI)"]
    Proxy["Vercel / Vite Dev Proxy (/api/v1)"]
    API["FastAPI Application (app.main)"]
    AuthMW["Security & Rate Limiting (Redis 60 req/min)"]
    
    subgraph LayeredArchitecture["Backend Layered Architecture"]
        Router["API Routers (app/api/routes)"]
        Controller["Controllers (app/api/controllers)"]
        Service["Services (app/services)"]
        Repo["Repositories (app/repositories)"]
        DB[("PostgreSQL Database")]
    end

    subgraph LLMLayer["LLM Strategy & Registry Engine"]
        Runner["Runner: call_llm()"]
        Registry["LLMRegistry Factory"]
        Groq["GroqProvider (Official SDK)"]
        HF["HuggingFaceProvider (InferenceClient)"]
        HTTPPool["Shared HTTPX Connection Pool"]
    end

    subgraph AsyncPipeline["Asynchronous Processing"]
        RedisBroker[("Redis Broker & Result Backend")]
        CeleryWorker["Celery Worker (llm_tasks_queue)"]
    end

    Client -->|HTTP / REST| Proxy
    Proxy -->|Forward| API
    API --> AuthMW
    AuthMW --> Router
    Router --> Controller
    Controller --> Service
    Service --> Repo
    Repo --> DB
    
    Service -->|Sync LLM / ThreadPool| Runner
    Service -->|Enqueue Task .delay()| RedisBroker
    RedisBroker --> CeleryWorker
    CeleryWorker --> Runner
    CeleryWorker --> DB
    
    Runner --> Registry
    Registry --> Groq
    Registry --> HF
    Groq --> HTTPPool
    HF --> HTTPPool
    HTTPPool -->|Outbound HTTPS| ExternalLLM["External LLM Providers (Groq / HuggingFace)"]
```

### Request Flow Pattern
1. **Request Ingestion & Middleware:** Incoming requests pass through `request_id_middleware` (injecting a unique `X-Request-ID` header) and CORS validation.
2. **Security & Rate Limiting:**
   - Auth routes validate JWT tokens via `get_current_user`.
   - Platform routes validate API keys (`llmops_*`) via `get_api_key` and enforce per-key sliding-window rate limits via Redis (`rate_limit(api_key)`).
3. **Router Layer (`app/api/routes`):** Declares endpoint paths, HTTP verbs, dependencies, and Pydantic response models. Delegates immediately to controllers without business logic.
4. **Controller Layer (`app/api/controllers`):** Validates input contracts, executes service methods, and catches domain-specific exceptions, translating them to standard HTTP status codes (`400`, `401`, `404`, `409`, `500`).
5. **Service Layer (`app/services`):** Encapsulates business rules (e.g., prompt template rendering, unified diff calculation, pairwise thread-pool orchestration, evaluation scoring). Services never import FastAPI or raise HTTP exceptions.
6. **Repository Layer (`app/repositories`):** Handles raw SQLAlchemy queries, additions, flushes, and commits. No business logic or external integrations exist in this layer.
7. **Database:** PostgreSQL stores all relational state with ACID compliance and transactional consistency.

---

## 3. Backend Architecture

The backend is built with **FastAPI** running on Python 3.11 with an asynchronous ASGI architecture.

### Directory Structure & Responsibilities
- `app/api/routes/`: Declarative HTTP routing definitions:
  - `auth_routes.py`: Account registration, login, and API key management (`/api/v1/auth/*`).
  - `prompt_routes.py`: Prompt and version CRUD, activation, and diffing (`/api/v1/prompts/*`).
  - `run_routes.py`: Prompt execution trigger and status polling (`/api/v1/run`, `/api/v1/runs`, `/api/v1/task-status/{id}`).
  - `evaluation_routes.py`: Golden example registration and single-version evaluation (`/api/v1/prompts/{id}/golden-examples`, `/api/v1/prompts/{id}/versions/{id}/evaluate`).
  - `experiment_routes.py`: Multi-version batch regression test runs (`/api/v1/experiments/*`).
  - `ab_test_routes.py`: Pairwise testing execution and user voting (`/api/v1/ab-tests/*`).
  - `models_routes.py`: Provider catalog and model discovery (`/api/v1/models`, `/api/v1/providers/*`).
  - `app/api/v1/health.py`: Health verification probe (`/api/v1/health`).
  - `app/api/v1/protected.py`: Authenticated smoke test endpoint (`/api/v1/protected`).
- `app/api/controllers/`: Translators between HTTP and domain logic:
  - `auth_controller.py`, `prompt_controller.py`, `run_controller.py`, `evaluation_controller.py`, `experiment_controller.py`, `ab_test_controller.py`.
- `app/services/`: Pure business logic and workflow engines:
  - `auth_service.py`, `prompt_service.py`, `run_service.py`, `evaluation_service.py`, `experiment_service.py`, `ab_test_service.py`.
  - `prompt_renderer.py`: Python string format renderer with variable extraction and KeyError validation.
  - `prompt_diff.py`: Line-by-line unified diff generator using Python's `difflib`.
  - `evaluator.py`: LLM-as-a-judge comparison engine with robust multi-pass JSON extraction.
  - `run_task.py`: Celery task for async single-run prompt execution.
  - `run_experiment.py`: Celery task for batch regression matrix evaluation.
- `app/repositories/`: Data access objects:
  - `user_repository.py`, `prompt_repository.py`, `run_repository.py`, `evaluation_repository.py`, `experiment_repository.py`, `ab_test_repository.py`.
- `app/models/`: SQLAlchemy declarative ORM models.
- `app/schemas/`: Pydantic models for request validation and response serialization.
- `app/core/`: Application infrastructure:
  - `config.py`: Pydantic `BaseSettings` reading environment variables with computed URLs.
  - `database.py`: SQLAlchemy `create_engine` with `pool_pre_ping=True`, `SessionLocal`, and `get_db` dependency.
  - `security.py`: FastAPI security dependencies (`get_api_key`, `get_current_user`).
  - `auth.py`: Password hashing with `bcrypt` (72-byte truncation safe), JWT encode/decode with `python-jose`, and `llmops_*` API key generation.
  - `rate_limit.py`: Sliding-window rate limiter using Redis atomic `INCR` and `EXPIRE`. Fails open if Redis is unreachable.
  - `logging.py`: Centralized logging configuration outputting structured logs to stdout and `app.log`.
  - `middleware.py`: Injects unique UUID `X-Request-ID` into every HTTP transaction.
  - `exceptions.py`: Custom domain exception hierarchy.

### Error Handling & Exception Translation
Services raise domain exceptions defined in `app/core/exceptions.py`. Controllers translate them into HTTP exceptions:

| Domain Exception | HTTP Status | Rationale |
|---|---|---|
| `InvalidCredentialsError` | `401 Unauthorized` | Invalid username or password on login |
| `DuplicateUsernameError` / `DuplicateEmailError` | `409 Conflict` | User registration collisions |
| `APIKeyNotFoundError` | `404 Not Found` | Key does not exist or does not belong to user |
| `PromptNotFoundError` / `PromptVersionNotFoundError` | `404 Not Found` | Requested prompt or version missing |
| `GoldenExamplesNotFoundError` | `400 Bad Request` | Evaluating a prompt with zero golden test cases |
| `ExperimentNotFoundError` / `ABTestNotFoundError` | `404 Not Found` | Requested test session not found |
| `ABTestAlreadyVotedError` | `409 Conflict` | Attempting to cast multiple votes on one A/B test |
| `TaskQueueError` | `500 Internal Server Error` | Celery broker communication failure |

---

## 4. Frontend Architecture

The frontend is a single-page application built with **React 19**, **Vite 7**, and **Tailwind CSS v4**.

### State Management & Context
- **`AuthContext.jsx`:** Manages authentication state:
  - Stores JWT token in `localStorage['llmops_jwt']` for account management.
  - Stores active API key in `localStorage['llmops_api_key']` for platform calls.
  - Exposes `user`, `login()`, `register()`, `logout()`, `isLogged`, and `hasKey`.
- **`ThemeContext.jsx`:** Controls visual theme (Light, Dark, System) and persists preference in `localStorage`.
- **API Client (`frontend/src/services/api.js`):** Single Axios instance with request and response interceptors:
  - **Dynamic Token Selection:** Routes starting with `/auth/api-keys` automatically receive the JWT Bearer token; all other routes receive the platform API key.
  - **Automatic Base URL Resolution:** Resolves from `VITE_API_URL` or defaults to `/api/v1` to prevent Mixed Content issues in browser-to-cloud deployments.
  - **Response Error Normalization:** Extracts backend exception detail strings and surfaces human-friendly messages.

### Pages & User Flows
1. **Login & Registration (`Login.jsx`):** Allows creating accounts or authenticating with username and password. Stores JWT and redirects to the dashboard.
2. **Dashboard (`Dashboard.jsx`):** High-level operational overview polling data every 15 seconds. Displays active models, run counts, success rates, latency trends via Recharts area charts, status breakdown pie charts, and recent activity tables.
3. **Prompt Management (`Prompts.jsx`):**
   - Browse prompts and version histories.
   - Create new prompts and append incremental versions (`v1`, `v2`, ...).
   - Activate specific versions for production routing.
   - Side-by-side template diffing with syntax highlighting.
   - Embedded Golden Examples management tab.
4. **Run Playground (`RunPlayground.jsx`):**
   - Interactively select a prompt, version, provider, and model.
   - Enter JSON variable inputs and fire async runs.
   - Polls execution status every 5 seconds until completed, displaying generated output, token counts, and compute costs.
5. **Pairwise Testing (`PairwiseTesting.jsx`):**
   - Selects two prompt versions under test against identical input variables.
   - Triggers parallel LLM generation.
   - Displays side-by-side outputs (Answer A vs. Answer B).
   - Allows voting ("Version A", "Version B", or "Tie") with qualitative feedback.
6. **Experiments (`Experiments.jsx`):**
   - Trigger batch regression runs across all prompt versions against all golden examples.
   - Inspect aggregated performance: average scores, min/max scores, hallucination rates, and failure counts.
7. **Analytics (`Analytics.jsx`):**
   - Computes operational metrics directly from run history:
   - Success rate over time (hourly area chart).
   - Latency distribution histogram across 5 buckets (`0-100ms`, `100-500ms`, `500-1000ms`, `1000-2000ms`, `2000ms+`).
   - Provider/model usage distribution (pie chart).
   - Model performance comparison table (total runs, success %, average latency).
8. **Settings (`Settings.jsx`):**
   - Account overview and logout.
   - Create, list, and revoke API keys with real-time masking.
   - Configure the active platform API key.
   - Theme toggle (Dark / Light / System).

---

## 5. LLM Architecture

The LLM subsystem uses a strict **Strategy + Factory** pattern, completely decoupling provider SDKs from business services.

```mermaid
classDiagram
    class BaseLLMProvider {
        <<abstract>>
        +generate(prompt, model, system_prompt, temperature, max_tokens) LLMResponse
    }
    class GroqProvider {
        -_sdk_client
        -_client_lock
        +generate() LLMResponse
        +_build_sdk_client()
        +reset_sdk_client()
    }
    class HuggingFaceProvider {
        -_client
        -_client_lock
        +generate() LLMResponse
        +get_inference_client()
    }
    class LLMRegistry {
        -PROVIDER_CATALOG
        -_PROVIDER_CLASS_MAP
        -_provider_instances
        +get_provider(provider_id) BaseLLMProvider
        +get_model(provider_id, model_slug) ModelInfo
        +list_providers() list
        +list_models(provider_id) list
        +catalog() dict
    }
    class ModelInfo {
        +str slug
        +str api_id
        +str display_name
        +dict extra_params
    }
    class LLMResponse {
        +str text
        +int input_tokens
        +int output_tokens
    }

    BaseLLMProvider <|-- GroqProvider
    BaseLLMProvider <|-- HuggingFaceProvider
    LLMRegistry ..> BaseLLMProvider : loads & caches
    LLMRegistry ..> ModelInfo : catalogs
    BaseLLMProvider ..> LLMResponse : returns
```

### Provider Registry & Catalog (`app/llm/registry.py`)
The catalog is defined in code:
- **Groq Provider (`groq`):**
  - `gpt-oss-20b`: `openai/gpt-oss-20b` (Display: "GPT OSS 20B")
  - `gpt-oss-120b`: `openai/gpt-oss-120b` (Display: "GPT OSS 120B")
  - `qwen3-27b`: `qwen/qwen3-27b` (Display: "Qwen 3 27B")
- **HuggingFace Provider (`huggingface`):**
  - `qwen-2.5-1.5b`: `Qwen/Qwen2.5-1.5B-Instruct` (Display: "Qwen 2.5 1.5B")

Providers are registered via `_PROVIDER_CLASS_MAP` and lazily loaded on first access using Python's `importlib`. Loaded instances are cached as singletons.

### Unified Execution Function: `call_llm()`
Business services interact with the LLM layer exclusively via `call_llm()` in `app/llm/runner.py`:

```python
output_text, tokens_in, tokens_out = call_llm(
    prompt="...",
    provider_id="groq",      # defaults to settings.default_llm_provider
    model_slug="gpt-oss-20b", # defaults to settings.default_llm_model
    system_prompt="",
    temperature=None,        # falls back to settings.llm_default_temperature (0.2)
    max_tokens=None          # falls back to settings.llm_max_new_tokens (150)
)
```

### HTTP Connection Pooling (`app/llm/http_clients.py`)
To prevent ephemeral port exhaustion under heavy concurrent loads or Celery worker execution, provider SDKs share a synchronized `httpx.Client` instance configured with:
- `max_keepalive_connections = 20`
- `max_connections = 100`
- `timeout = 60.0s` (connect timeout 10.0s)
- Automatic thread-safe lifecycle recovery and reset.

---

## 6. Prompt Management

### Prompt Lifecycle
```mermaid
stateDiagram-v2
    [*] --> PromptCreated: POST /prompts (creates Prompt + v1)
    PromptCreated --> VersionAdded: POST /prompts/{id}/versions (appends v2..vN)
    VersionAdded --> ActiveVersion: POST /prompts/{id}/versions/{id}/activate
    ActiveVersion --> ActiveVersion: Activate alternate version
    PromptCreated --> DiffCompared: GET /prompts/diff
    VersionAdded --> DiffCompared
```

1. **Creation:** When a prompt is registered via `POST /api/v1/prompts`, the service uses a single database transaction with `flush()` to create both the parent `Prompt` entity and its initial `v1` `PromptVersion`.
2. **Versioning:** Successive versions are created via `POST /api/v1/prompts/{id}/versions`. The version label is generated dynamically based on the current count (`v{count + 1}`).
3. **Activation:** Activating a version via `POST /api/v1/prompts/{id}/versions/{id}/activate` executes an atomic database update that sets `is_active=False` across all versions of that prompt, and sets `is_active=True` on the target version.
4. **Template Rendering:** Handled by `render_prompt(template, variables)` using Python string formatting (`template.format(**variables)`). Missing variables raise a `ValueError` indicating the exact missing key.
5. **Diffing:** Computed via `diff_templates(old, new)` using `difflib.unified_diff`, returning a list of standard diff lines for visual comparison.

---

## 7. Evaluation System

### Rationale: Golden Examples Belong to Prompts, Not Versions
In this platform, **Golden Examples are linked directly to the parent `Prompt`, not to individual `PromptVersion` entities**.
- **Prompt:** Represents the **task identity** (e.g., "Summarize Customer Feedback").
- **Prompt Version:** Represents an **implementation variation** of that task (e.g., prompt phrasing adjustments).
- **Golden Example:** Represents a **test case** (Input Variables $\to$ Expected Output).

Linking test cases to the prompt guarantees that every version is evaluated against the identical test suite, enabling true regression testing over time.

### Evaluation Workflow (`POST /api/v1/prompts/{prompt_id}/versions/{version_id}/evaluate`)
1. Fetches the target `PromptVersion` and all `GoldenExample` records for the prompt.
2. For each golden example:
   - Renders the template with the example's input variables.
   - Calls the LLM to generate model output.
   - Executes `similarity_score()` to evaluate output against `expected_output`.
   - Records an `EvaluationResult` row with score, reason, hallucination rate, and raw output.
3. Commits all `EvaluationResult` records in a single database transaction.
4. Returns the average score and total test count.

### Evaluator Engine (`app/services/evaluator.py`)
Evaluation is performed using an **LLM-as-a-judge** with a strict evaluation prompt:
- **Evaluation Criteria:** Task correctness, completeness, and faithfulness to expected output.
- **Implemented Output Metrics:**
  - `score`: Float clamped between `0.0` and `1.0`.
  - `hallucination_rate`: Float clamped between `0.0` and `1.0` indicating hallucinated content.
  - `reason`: String explaining the evaluation judgment.
- **Resilient Multi-Stage Parsing:**
  1. Direct regex-based markdown code-fence extraction (````json ... ````).
  2. Direct JSON parser.
  3. Fallback to LangChain's `SimpleJsonOutputParser`.
  4. Fallback numeric regex extractor for unstructured responses.
  5. Safe zero-score fallback in the event of total evaluation failure.

---

## 8. Experiments (Batch Regression Testing)

Experiments automate testing multiple prompt versions against all golden examples to detect regressions across revisions.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant API as FastAPI Router/Controller
    participant Service as ExperimentService
    participant Queue as Redis Queue (llm_tasks_queue)
    participant Worker as Celery Worker (run_experiment)
    participant DB as PostgreSQL

    User->>API: POST /api/v1/experiments/run (prompt_id, experiment_name)
    API->>Service: trigger_experiment()
    Service->>Queue: run_experiment.delay(prompt_id, experiment_name)
    Queue-->>Service: task_id
    Service-->>API: task_id
    API-->>User: 200 OK ("Experiment running...")

    Note over Worker: Asynchronous Execution
    Worker->>DB: INSERT INTO experiments (status='running')
    Worker->>DB: SELECT PromptVersions & GoldenExamples
    loop For each PromptVersion
        loop For each GoldenExample
            Worker->>Worker: render_prompt() + call_llm()
            Worker->>Worker: similarity_score() (LLM Judge)
        end
        Worker->>DB: INSERT INTO experiment_results (avg_score, min_score, max_score, avg_hallucination_rate, failure_count)
    end
    Worker->>DB: UPDATE experiments SET status='completed'

    User->>API: GET /api/v1/experiments/{id}/status
    API->>DB: SELECT Experiment + ExperimentResults
    DB-->>API: Result data
    API-->>User: 200 OK (Full metrics per version)
```

### Experiment Lifecycle
- **Status States:** `running` $\to$ `completed` (or `failed` upon error with database rollback).
- **Aggregated Metrics Stored in `experiment_results`:**
  - `avg_score`: Mean score across all golden examples.
  - `min_score`: Lowest score achieved.
  - `max_score`: Highest score achieved.
  - `avg_hallucination_rate`: Mean hallucination rate across test runs.
  - `failure_count`: Total number of tests scoring below `0.5`.
  - `total_examples`: Number of evaluated test cases.

---

## 9. A/B Testing (Pairwise Evaluation)

Pairwise A/B testing allows comparing two prompt versions side-by-side on identical inputs with human-in-the-loop voting.

### Execution Flow
1. **Creation (`POST /api/v1/ab-tests`):**
   - User supplies `version_a_id`, `version_b_id`, `variables` (JSON), `provider`, and `model`.
   - The service fetches both versions and renders both templates.
   - **Parallel LLM Execution:** Calls `call_llm()` for both prompts simultaneously using Python's `concurrent.futures.ThreadPoolExecutor(max_workers=2)`. Latency is approximately $\max(t_A, t_B)$ rather than $t_A + t_B$.
   - Persists the record in `ab_tests` with `answer_a`, `answer_b`, and initial `winner=None`.
2. **Voting (`POST /api/v1/ab-tests/{id}/vote`):**
   - User submits `winner` (`"a"`, `"b"`, or `"tie"`) and optional `feedback` text.
   - Validates that the test has not already been voted on (returns `409 Conflict` if `winner is not None`).
   - Persists `winner`, `feedback`, and `voted_at` timestamp.

---

## 10. Analytics Subsystem

Analytics capabilities are computed in the frontend directly from canonical execution data retrieved from backend endpoints (`/runs`, `/prompts`, `/experiments`):

- **Token Consumption:** Aggregated from `tokens_in` and `tokens_out` recorded on every completed `Run`.
- **Cost Estimation:** Calculated per run using the formula:
  $$\text{cost\_usd} = (\text{tokens\_in} + \text{tokens\_out}) \times 0.00001$$
- **Latency Distribution:** Computed across execution runs into five distinct histogram ranges (`0-100ms`, `100-500ms`, `500-1000ms`, `1000-2000ms`, `2000ms+`).
- **Success & Reliability Trends:** Grouped chronologically by hour over the preceding 24-hour window, tracking total runs, success counts, and mean latency.
- **Model Distribution:** Pie chart breakdown of runs grouped by model identifier.

---

## 11. Database Architecture & Schema

The platform uses **PostgreSQL 15** with **SQLAlchemy 2.0** ORM and **Alembic** migrations. UUID primary keys are generated on model instantiation (`uuid_pk()`).

### Entity-Relationship Diagram

```mermaid
erDiagram
    users ||--o{ api_keys : "owns (CASCADE)"
    prompts ||--o{ prompt_versions : "has (CASCADE)"
    prompts ||--o{ golden_examples : "tested by (CASCADE)"
    prompts ||--o{ experiments : "evaluated in"
    prompt_versions ||--o{ runs : "executed in (CASCADE)"
    runs ||--o| cost_logs : "has cost (CASCADE)"
    runs ||--o{ evaluation_results : "evaluated by (CASCADE)"
    golden_examples ||--o{ evaluation_results : "evaluated against (CASCADE)"
    experiments ||--o{ experiment_results : "produces (CASCADE)"
    prompt_versions ||--o{ experiment_results : "scores"

    users {
        string id PK
        string username UK
        string email UK
        string password_hash
        datetime created_at
    }

    api_keys {
        string id PK
        string user_id FK
        string key UK
        string name
        boolean is_active
        datetime created_at
    }

    prompts {
        string id PK
        string name UK
        string description
        datetime created_at
    }

    prompt_versions {
        string id PK
        string prompt_id FK
        string version
        string template
        boolean is_active
        datetime created_at
    }

    golden_examples {
        string id PK
        string prompt_id FK
        text input_data
        text expected_output
        datetime created_at
    }

    runs {
        string id PK
        string prompt_version_id FK
        string input
        string output
        string model
        integer latency_ms
        integer tokens_in
        integer tokens_out
        string status
        datetime created_at
    }

    cost_logs {
        string id PK
        string run_id FK,UK
        float cost_usd
        datetime created_at
    }

    evaluation_results {
        string id PK
        string run_id FK
        string prompt_version_id FK
        string golden_example_id FK
        float score
        text reason
        float halluation_rate
        text output
        datetime created_at
    }

    experiments {
        string id PK
        string prompt_id FK
        string name
        string status
        datetime created_at
    }

    experiment_results {
        string id PK
        string experiment_id FK
        string prompt_version_id FK
        float avg_score
        float min_score
        float max_score
        float avg_hallucination_rate
        float failure_count
        float total_examples
        datetime created_at
    }

    ab_tests {
        string id PK
        text query
        string version_a_id
        string version_b_id
        string provider
        string model
        text answer_a
        text answer_b
        string winner
        text feedback
        datetime created_at
        datetime voted_at
    }
```

### Alembic Migration History
Migrations are strictly linear and verified via CI integration tests (`tests/test_migrations.py`).
1. `c6633d3a19a7`: Initial schema (`users`, `prompts`, `prompt_versions`, `runs`, `cost_logs`, `golden_examples`, `evaluation_results`, `experiments`, `experiment_results`).
2. `add_status_to_runs`: Added `status` column to `runs`.
3. `add_avg_hallucination_rate_to_experiment_results`: Added `avg_hallucination_rate` to `experiment_results`.
4. `b7af45b40d97` / `b0ca856d36fb` / `3584f5f0505c`: Added golden example and evaluation schema enhancements.
5. `7200065078a3`: Added `is_active` and `created_at` tracking to `prompt_versions`.
6. `7922d3edf5ad`: Added experiment status tracking and standardized the evaluation results hallucination rate column.
7. `f5eb2a159a3f`: Added `reason` column to `evaluation_results`.
8. `a4d2ef240277`: Created `ab_tests` table.
9. `f6c7b7868853` **(Current HEAD)**: Added `username`, `password_hash`, and `name` columns to support user authentication and multi-key ownership.

---

## 12. Background Processing & Task Queues

Asynchronous operations are managed by **Celery 5.3** backed by **Redis 7**.

### Queue Architecture & Configuration (`app/core/celery_app.py`)
- **Broker:** `redis://<host>:6379/0` (DB 0)
- **Backend:** `redis://<host>:6379/1` (DB 1)
- **Serializers:** `pickle` task and result serialization.
- **Queues:**
  - `llm_tasks_queue`: Dedicated queue for all LLM inference and evaluation tasks.
  - `celery`: Default fallback queue.
- **Retry Policy:** Configured via `celery_task_max_retries` (default: 3) and `celery_task_retry_countdown` (default: 5 seconds) on `Exception`.

### Registered Background Tasks
1. **`app.services.run_task.run_prompt_task`:**
   - Enqueued by `POST /api/v1/run`.
   - Transitions `Run.status` from `pending` $\to$ `running` $\to$ `completed` (or `failed`).
   - Renders prompt template, triggers `call_llm()`, records latency, tokens in/out, and creates a `CostLog` entry.
2. **`app.services.run_experiment.run_experiment`:**
   - Enqueued by `POST /api/v1/experiments/run`.
   - Executes matrix evaluation of all versions against all golden examples.
   - Computes aggregated metrics and transitions `Experiment.status` from `running` $\to$ `completed`.

---

## 13. API Reference

All routes are mounted under the `/api/v1` prefix.

### Authentication & API Keys (`tags=["auth"]`)

#### `POST /api/v1/auth/register`
- **Purpose:** Create a new user account.
- **Request:**
  ```json
  {
    "username": "developer1",
    "email": "dev@example.com",
    "password": "SecurePassword123"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "user_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "username": "developer1",
    "email": "dev@example.com",
    "created_at": "2026-10-01T12:00:00Z"
  }
  ```

#### `POST /api/v1/auth/login`
- **Purpose:** Authenticate with credentials and obtain a JWT access token.
- **Request:**
  ```json
  {
    "username": "developer1",
    "password": "SecurePassword123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "username": "developer1"
  }
  ```

#### `POST /api/v1/auth/api-keys`
- **Purpose:** Generate a new platform API key. Requires JWT `Authorization: Bearer <jwt>`.
- **Request:**
  ```json
  {
    "name": "production-key"
  }
  ```
- **Response (201 Created):** *(Raw key is returned only once)*
  ```json
  {
    "api_key_id": "c1f7b9e0-1234-5678-9abc-def012345678",
    "name": "production-key",
    "key": "llmops_aBcDeFgHiJkLmNoPqRsTuVwXyZ123456",
    "created_at": "2026-10-01T12:05:00Z"
  }
  ```

#### `GET /api/v1/auth/api-keys`
- **Purpose:** List all API keys belonging to the authenticated user with masked secrets. Requires JWT.
- **Response (200 OK):**
  ```json
  [
    {
      "api_key_id": "c1f7b9e0-1234-5678-9abc-def012345678",
      "name": "production-key",
      "is_active": true,
      "created_at": "2026-10-01T12:05:00Z"
    }
  ]
  ```

#### `DELETE /api/v1/auth/api-keys/{api_key_id}`
- **Purpose:** Revoke an API key immediately. Requires JWT.
- **Response (200 OK):**
  ```json
  {
    "api_key_id": "c1f7b9e0-1234-5678-9abc-def012345678",
    "revoked": true
  }
  ```

---

### Prompts (`tags=["prompts"]`)

#### `POST /api/v1/prompts`
- **Purpose:** Create a new prompt template with an initial `v1` version.
- **Request:**
  ```json
  {
    "name": "summarizer",
    "description": "Article summary prompt",
    "template": "Summarize the following text in {words} words: {text}"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "prompt_id": "d2f3a4b5-c6d7-8e9f-a0b1-c2d3e4f5a6b7",
    "version": "v1"
  }
  ```

#### `GET /api/v1/prompts`
- **Purpose:** List all prompts with pagination (`?skip=0&limit=100`).
- **Response (200 OK):** List of Prompt ORM objects.

#### `POST /api/v1/prompts/{prompt_id}/versions`
- **Purpose:** Append an incremental version (`v2`, `v3`, ...) to an existing prompt.
- **Request:**
  ```json
  {
    "template": "Provide a concise summary in {words} words of:\n{text}"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "prompt_id": "d2f3a4b5-c6d7-8e9f-a0b1-c2d3e4f5a6b7",
    "version": "v2",
    "template": "Provide a concise summary in {words} words of:\n{text}"
  }
  ```

#### `GET /api/v1/prompts/{prompt_id}/versions`
- **Purpose:** Retrieve the full version history for a prompt.
- **Response (200 OK):**
  ```json
  {
    "prompt_id": "d2f3a4b5-c6d7-8e9f-a0b1-c2d3e4f5a6b7",
    "versions": [
      {
        "id": "e3f4a5b6-c7d8-9e0f-a1b2-c3d4e5f6a7b8",
        "version": "v2",
        "is_active": false,
        "created_at": "2026-10-01T12:15:00Z"
      },
      {
        "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "version": "v1",
        "is_active": true,
        "created_at": "2026-10-01T12:00:00Z"
      }
    ]
  }
  ```

#### `POST /api/v1/prompts/{prompt_id}/versions/{version_id}/activate`
- **Purpose:** Atomically activate one version and deactivate all others.
- **Response (200 OK):**
  ```json
  {
    "prompt_id": "d2f3a4b5-c6d7-8e9f-a0b1-c2d3e4f5a6b7",
    "activated_version_id": "e3f4a5b6-c7d8-9e0f-a1b2-c3d4e5f6a7b8",
    "version": "v2"
  }
  ```

#### `GET /api/v1/prompts/diff`
- **Purpose:** Compute a unified line diff between two versions (`?prompt_id=...&from_version_id=...&to_version_id=...`).
- **Response (200 OK):**
  ```json
  {
    "prompt_id": "d2f3a4b5-c6d7-8e9f-a0b1-c2d3e4f5a6b7",
    "from_version_id": "a1b2c3d4-...",
    "to_version_id": "e3f4a5b6-...",
    "diff": [
      "--- \n",
      "+++ \n",
      "@@ -1 +1,2 @@\n",
      "-Summarize the following text in {words} words: {text}",
      "+Provide a concise summary in {words} words of:\n",
      "+{text}"
    ]
  }
  ```

---

### Golden Examples & Evaluation (`tags=["evaluations"]`)

#### `POST /api/v1/prompts/{prompt_id}/golden-examples`
- **Purpose:** Add a reference regression test case to a prompt.
- **Request:**
  ```json
  {
    "input_data": {
      "words": "5",
      "text": "The quick brown fox jumps over the lazy dog."
    },
    "expected_output": "A brown fox jumps dog."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "golden_example_id": "f4a5b6c7-d8e9-0f1a-2b3c-4d5e6f7a8b9c"
  }
  ```

#### `GET /api/v1/prompts/{prompt_id}/golden-examples`
- **Purpose:** List all test cases associated with a prompt.
- **Response (200 OK):** List of GoldenExample ORM objects.

#### `POST /api/v1/prompts/{prompt_id}/versions/{version_id}/evaluate`
- **Purpose:** Execute synchronous evaluation of one prompt version against all golden examples using the LLM judge.
- **Response (200 OK):**
  ```json
  {
    "prompt_version_id": "e3f4a5b6-c7d8-9e0f-a1b2-c3d4e5f6a7b8",
    "average_score": 0.88,
    "total_tests": 4
  }
  ```

---

### Runs (`tags=["runs"]`)
All endpoints require `Authorization: Bearer <api_key>` and are subject to rate limiting.

#### `POST /api/v1/run`
- **Purpose:** Asynchronously queue a prompt run with variable interpolation.
- **Request:**
  ```json
  {
    "prompt_version_id": "e3f4a5b6-c7d8-9e0f-a1b2-c3d4e5f6a7b8",
    "variables": {
      "words": "10",
      "text": "Antigravity is an advanced agentic coding assistant."
    },
    "provider": "groq",
    "model": "gpt-oss-20b"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "run_id": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
    "task_id": "3d4e5f6a-7b8c-9d0e-1f2a-3b4c5d6e7f8a",
    "status": "pending",
    "output": null,
    "latency_ms": null,
    "tokens_in": null,
    "tokens_out": null,
    "cost_usd": null
  }
  ```

#### `GET /api/v1/runs`
- **Purpose:** List historical runs with pagination (`?skip=0&limit=100`).
- **Response (200 OK):** List of Run ORM objects including latency, status, tokens, and cost relationship.

#### `GET /api/v1/task-status/{task_id}`
- **Purpose:** Poll the execution state of an asynchronous Celery task.
- **Response (200 OK - Completed):**
  ```json
  {
    "task_id": "3d4e5f6a-7b8c-9d0e-1f2a-3b4c5d6e7f8a",
    "status": "success",
    "result": null
  }
  ```

---

### Experiments (`tags=["experiments"]`)
All endpoints require `Authorization: Bearer <api_key>` and rate limiting.

#### `POST /api/v1/experiments/run`
- **Purpose:** Trigger background batch regression testing across all versions against all golden test cases.
- **Request:**
  ```json
  {
    "prompt_id": "d2f3a4b5-c6d7-8e9f-a0b1-c2d3e4f5a6b7",
    "experiment_name": "v1-vs-v2-benchmark"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "message": "Experiment 'v1-vs-v2-benchmark' is running. Check results later."
  }
  ```

#### `GET /api/v1/experiments/{experiment_id}/status`
- **Purpose:** Retrieve the status and aggregated metrics of an experiment.
- **Response (200 OK):**
  ```json
  {
    "experiment_id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "experiment_name": "v1-vs-v2-benchmark",
    "status": "completed",
    "results": [
      {
        "id": "result-1",
        "prompt_version_id": "v1-id",
        "avg_score": 0.72,
        "min_score": 0.40,
        "max_score": 0.95,
        "avg_hallucination_rate": 0.15,
        "failure_count": 1.0,
        "total_examples": 5.0
      },
      {
        "id": "result-2",
        "prompt_version_id": "v2-id",
        "avg_score": 0.91,
        "min_score": 0.85,
        "max_score": 0.98,
        "avg_hallucination_rate": 0.02,
        "failure_count": 0.0,
        "total_examples": 5.0
      }
    ]
  }
  ```

#### `GET /api/v1/experiments`
- **Purpose:** List all experiments with pagination.

---

### Pairwise A/B Testing (`tags=["ab-testing"]`)
All endpoints require `Authorization: Bearer <api_key>`.

#### `POST /api/v1/ab-tests`
- **Purpose:** Execute two prompt versions in parallel against identical inputs and store outputs for pairwise evaluation.
- **Request:**
  ```json
  {
    "version_a_id": "version-v1-uuid",
    "version_b_id": "version-v2-uuid",
    "variables": { "topic": "Quantum Computing" },
    "provider": "groq",
    "model": "gpt-oss-20b"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "ab_test_id": "8f9a0b1c-2d3e-4f5a-6b7c-8d9e0f1a2b3c",
    "version_a_id": "version-v1-uuid",
    "version_b_id": "version-v2-uuid",
    "answer_a": "Quantum computing utilizes qubits...",
    "answer_b": "By exploiting superposition and entanglement...",
    "provider": "groq",
    "model": "gpt-oss-20b",
    "created_at": "2026-10-01T12:30:00Z"
  }
  ```

#### `POST /api/v1/ab-tests/{ab_test_id}/vote`
- **Purpose:** Submit user vote and qualitative feedback on an A/B test.
- **Request:**
  ```json
  {
    "winner": "b",
    "feedback": "Answer B explained superposition much more clearly."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "ab_test_id": "8f9a0b1c-2d3e-4f5a-6b7c-8d9e0f1a2b3c",
    "winner": "b",
    "feedback": "Answer B explained superposition much more clearly.",
    "voted_at": "2026-10-01T12:32:15Z"
  }
  ```

#### `GET /api/v1/ab-tests/{ab_test_id}`
- **Purpose:** Retrieve full details of an A/B test session including winner and feedback.

#### `GET /api/v1/ab-tests`
- **Purpose:** List all A/B test sessions, ordered by creation date descending.

---

### Models & Provider Discovery (`tags=["models"]`)
Public discovery endpoints consumed by UI dropdowns.

#### `GET /api/v1/providers`
- **Response:** `{"providers": ["groq", "huggingface"]}`

#### `GET /api/v1/providers/{provider_id}/models`
- **Response:**
  ```json
  {
    "provider": "groq",
    "models": [
      {
        "slug": "gpt-oss-20b",
        "api_id": "openai/gpt-oss-20b",
        "display_name": "GPT OSS 20B",
        "extra_params": {}
      }
    ]
  }
  ```

#### `GET /api/v1/models`
- **Response:** Full dictionary mapping providers to lists of available `ModelInfo` objects.

---

## 14. Configuration & Environment Variables

Settings are managed via `app/core/config.py` using `pydantic-settings.BaseSettings`, reading values from `.env`.

| Environment Variable | Default | Purpose |
|---|---|---|
| `POSTGRES_USER` | `postgres` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `postgres` | PostgreSQL password |
| `POSTGRES_DB` | `llmops` | Database name |
| `POSTGRES_HOST` | `localhost` | Database host (`postgres` inside Docker) |
| `POSTGRES_PORT` | `5432` | Database port |
| `REDIS_HOST` | `localhost` | Redis host (`redis` inside Docker) |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_BROKER_DB` | `0` | Celery broker Redis database index |
| `REDIS_BACKEND_DB` | `1` | Celery result backend Redis database index |
| `RATE_LIMIT_REQUESTS`| `60` | Max requests allowed within window |
| `RATE_LIMIT_WINDOW` | `60` | Sliding window duration in seconds |
| `JWT_SECRET_KEY` | `change-me-in-production...` | Secret key for signing JWTs |
| `JWT_ALGORITHM` | `HS256` | JWT cryptographic signature algorithm |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` (24h) | JWT lifespan |
| `API_SECRET_KEY` | `""` | Platform internal master secret |
| `GROQ_API_KEY` | `""` | API key for Groq Cloud SDK |
| `HUGGINGFACE_API_KEY`| `""` | API token for Hugging Face InferenceClient |
| `DEFAULT_LLM_PROVIDER` | `groq` | Default provider when unspecified |
| `DEFAULT_LLM_MODEL` | `gpt-oss-20b` | Default model slug when unspecified |
| `LLM_MAX_NEW_TOKENS` | `150` | Default generation max tokens |
| `LLM_DEFAULT_TEMPERATURE` | `0.2` | Default sampling temperature |
| `LLM_COST_PER_TOKEN` | `0.00001` | Baseline cost per token in USD |
| `CELERY_TASK_MAX_RETRIES` | `3` | Max Celery retry attempts |
| `CELERY_TASK_RETRY_COUNTDOWN`| `5` | Delay between task retries in seconds |
| `LOG_FILE` | `app.log` | Destination path for rotating file logs |
| `LOG_LEVEL` | `INFO` | Logging threshold (`DEBUG`, `INFO`, `WARNING`, etc.) |
| `CORS_ORIGINS` | `["*"]` | Allowed frontend origins |
| `APP_TITLE` | `LLMOps Platform` | Application title |
| `APP_VERSION` | `0.1.0` | Application version |

---

## 15. Deployment & Infrastructure

### Containerization (`Dockerfile`)
- **Base Image:** `python:3.11-slim`
- **Multi-Stage Build:**
  - `builder` stage: Compiles binary wheels (`build-essential`, `libpq-dev`) and installs packages to `/install`.
  - `runtime` stage: Minimal image containing only `libpq5`, `curl`, and runtime packages copied from builder.
- **Security:** Creates a non-root system user and group (`appuser:appuser`, UID 1000) and executes with non-root privileges.
- **Healthcheck:** Verified via `HEALTHCHECK` testing `http://127.0.0.1:8000/api/v1/health`.
- **Command:** `uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2`.

### Docker Compose Services (`docker-compose.yml` / `docker-compose.prod.yml`)
1. **`postgres`:** `postgres:15-alpine` with healthcheck using `pg_isready` and persistent volume `postgres_data`. Exposes port 5432 internally.
2. **`redis`:** `redis:7-alpine` with AOF persistence enabled (`--appendonly yes`), healthchecked with `redis-cli ping`. Exposes port 6379 internally.
3. **`migrate`:** Runs `alembic upgrade head` after `postgres` is healthy. Exits with code 0 on success.
4. **`api`:** Runs FastAPI via Uvicorn. Depends on `postgres` healthy, `redis` healthy, and `migrate` completed successfully. Maps host `${PORT:-8000}:8000`.
5. **`celery-worker`:** Runs `celery -A app.core.celery_app worker -l info -Q llm_tasks_queue,celery --concurrency=2`.

### Automated AWS EC2 Deployment (`deploy.sh`)
Automated bash script for zero-downtime production deployment on Linux EC2:
1. Validates `docker` and `docker compose` installations.
2. Verifies `.env` file presence and prevents deployment if default placeholder passwords exist.
3. Builds the production image with `docker compose build --pull`.
4. Starts `postgres` and `redis` and awaits container healthiness.
5. Runs `alembic upgrade head` inside a temporary container (`docker compose run --rm migrate`).
6. Starts `api` and `celery-worker` and polls `http://localhost:${PORT}/api/v1/health` until ready.

### Frontend Deployment & Vercel Proxy (`vercel.json`)
The frontend is built with `npm run build` producing static assets in `dist/`. In production, API requests are routed via `vercel.json` rewrites:
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "http://63.187.109.126:8000/api/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```
This server-side edge rewrite routes `/api/*` directly to the EC2 backend while avoiding Mixed Content browser security blocks. In local development, `vite.config.js` mirrors this behavior with a local proxy.

### Continuous Integration & Delivery Pipeline (`.github/workflows/ci-cd.yml`)
The GitHub Actions workflow triggers on push to `main` and on pull requests:
1. **`unit-tests`:** Runs unit tests (`pytest -v tests/test_backend_sanity.py`) on Python 3.11 with no database required.
2. **`migration-tests`:** Launches a temporary `postgres:15-alpine` service container and tests the complete Alembic migration chain (`TestStaticChain` and `TestMigrationExecution`: upgrade $\to$ check columns $\to$ downgrade $\to$ roundtrip).
3. **`ci`:** Builds the Docker container with Buildx and executes an in-container sanity check: `python -c "import app.main, app.core.celery_app, app.models"`.
4. **`cd`:** On push to `main`, builds and publishes the production image to GitHub Container Registry (`ghcr.io/mirofadlalla/llmops-backend`) tagged with `latest` and git commit SHA.

---

## 16. Development & Testing Guide

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- PostgreSQL 15 & Redis 7 (or run via Docker)

### Backend Setup
```bash
# 1. Create and activate a virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\Activate.ps1
# On Linux/macOS:
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt pytest

# 3. Configure environment variables
cp .env.example .env
# Edit .env to set your database credentials, GROQ_API_KEY, HUGGINGFACE_API_KEY, and JWT_SECRET_KEY

# 4. Apply database migrations
alembic upgrade head

# 5. Run the FastAPI development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 6. In a separate terminal, run the Celery worker
celery -A app.core.celery_app worker -l info -Q llm_tasks_queue,celery
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
# The dev server starts at http://localhost:5173 with proxying to http://localhost:8000
```

### Running Tests
```bash
# Run unit and sanity tests (does not require a database)
pytest -v tests/test_backend_sanity.py

# Run migration tests (requires PostgreSQL running at TEST_DATABASE_URL)
# Set TEST_DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/llmops_test
pytest -v tests/test_migrations.py
```

### Creating Development Credentials
```bash
# Generate a test user (dev@example.com) and test API key ('dev-key')
python create_test_api_key.py
```

---

## 17. Detailed Project Tree

```text
.
├── .dockerignore
├── .env.example
├── .gitignore
├── Dockerfile                      # Production multi-stage Dockerfile
├── README.md                       # High-level GitHub overview
├── alembic.ini                     # Alembic migration configuration
├── create_test_api_key.py          # Development test user & API key utility
├── database_design.py              # Reference database planning script
├── deploy.sh                       # AWS EC2 automated bash deployment script
├── docker-compose.prod.yml         # Production compose orchestration
├── docker-compose.yml              # Local / staging compose orchestration
├── pytest.ini                      # Pytest runner configuration
├── requirements.txt                # Python backend dependencies
│
├── .github/
│   └── workflows/
│       └── ci-cd.yml               # 4-stage GitHub Actions CI/CD workflow
│
├── alembic/
│   ├── env.py                      # Alembic execution environment
│   ├── script.py.mako              # Migration file template
│   └── versions/                   # Migration revision scripts (HEAD: f6c7b7868853)
│
├── app/
│   ├── main.py                     # FastAPI application entrypoint & middleware
│   ├── api/
│   │   ├── controllers/            # HTTP-to-domain controllers
│   │   │   ├── ab_test_controller.py
│   │   │   ├── auth_controller.py
│   │   │   ├── evaluation_controller.py
│   │   │   ├── experiment_controller.py
│   │   │   ├── prompt_controller.py
│   │   │   └── run_controller.py
│   │   ├── routes/                 # FastAPI router endpoints
│   │   │   ├── ab_test_routes.py
│   │   │   ├── auth_routes.py
│   │   │   ├── evaluation_routes.py
│   │   │   ├── experiment_routes.py
│   │   │   ├── models_routes.py
│   │   │   ├── prompt_routes.py
│   │   │   └── run_routes.py
│   │   └── v1/                     # Basic & probe endpoints
│   │       ├── health.py
│   │       └── protected.py
│   ├── core/                       # Core infrastructure
│   │   ├── auth.py                 # Password hashing, JWT utils, key generator
│   │   ├── celery_app.py           # Celery application & queue routing
│   │   ├── config.py               # Pydantic BaseSettings
│   │   ├── database.py             # SQLAlchemy engine & session factory
│   │   ├── exceptions.py           # Domain exceptions
│   │   ├── logging.py              # Centralized logging configuration
│   │   ├── middleware.py           # Request ID injector
│   │   ├── rate_limit.py           # Redis sliding-window rate limiter
│   │   └── security.py             # FastAPI auth dependencies
│   ├── llm/                        # LLM provider subsystem
│   │   ├── base.py                 # Strategy interface, ModelInfo, LLMResponse
│   │   ├── http_clients.py         # Shared pooled HTTPX client
│   │   ├── registry.py             # Factory & model catalog
│   │   ├── runner.py               # call_llm() entrypoint
│   │   └── providers/
│   │       ├── groq_provider.py    # Official Groq Python SDK provider
│   │       └── huggingface_provider.py # Hugging Face InferenceClient provider
│   ├── models/                     # SQLAlchemy declarative ORM models
│   │   ├── ab_test.py
│   │   ├── base.py
│   │   ├── evaluation.py
│   │   ├── experiment.py
│   │   ├── prompt.py
│   │   ├── run.py
│   │   └── user.py
│   ├── repositories/               # Data access layer
│   │   ├── ab_test_repository.py
│   │   ├── evaluation_repository.py
│   │   ├── experiment_repository.py
│   │   ├── prompt_repository.py
│   │   ├── run_repository.py
│   │   └── user_repository.py
│   ├── schemas/                    # Pydantic validation schemas
│   │   ├── ab_test.py
│   │   ├── auth.py
│   │   ├── evaluation.py
│   │   ├── experiments.py
│   │   ├── prompt.py
│   │   └── run.py
│   └── services/                   # Business logic layer
│       ├── ab_test_service.py
│       ├── auth_service.py
│       ├── evaluation_service.py
│       ├── evaluator.py            # LLM-as-a-judge similarity scoring
│       ├── experiment_service.py
│       ├── prompt_diff.py          # Unified diff calculator
│       ├── prompt_renderer.py      # Variable template renderer
│       ├── prompt_service.py
│       ├── run_experiment.py       # Celery task: batch regression testing
│       ├── run_service.py
│       └── run_task.py             # Celery task: async prompt runner
│
├── frontend/
│   ├── package.json                # React 19 dependencies & scripts
│   ├── vite.config.js              # Vite configuration with local proxy
│   ├── vercel.json                 # Vercel deployment rewrites
│   ├── src/
│   │   ├── App.jsx                 # Route tree & context provider wrapping
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Authentication state provider
│   │   ├── components/             # Reusable UI components
│   │   │   ├── ChartCard.jsx
│   │   │   ├── chartTheme.js
│   │   │   ├── EvaluationResults.jsx
│   │   │   ├── ExperimentResultCard.jsx
│   │   │   ├── ExperimentResultsModal.jsx
│   │   │   ├── GoldenExamples.jsx
│   │   │   ├── Layout.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── RunPromptModal.jsx
│   │   │   ├── StatCard.jsx
│   │   │   ├── StatusBadge.jsx
│   │   │   └── ThemeContext.jsx
│   │   ├── pages/                  # Page views
│   │   │   ├── Analytics.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Experiments.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── PairwiseTesting.jsx
│   │   │   ├── Prompts.jsx
│   │   │   ├── RunPlayground.jsx
│   │   │   └── Settings.jsx
│   │   └── services/
│   │       └── api.js              # Axios instance & service abstractions
│
├── tasks/
│   └── run_prompt_task.py          # Standalone Celery task reference
└── tests/
    ├── conftest.py                 # Pytest shared fixtures
    ├── test_backend_sanity.py      # Unit & sanity tests
    └── test_migrations.py          # Alembic migration verification suite
```

---

## 18. Verified Engineering Decisions

1. **Strict 5-Layer Backend Architecture:**
   - Decoupled `Router -> Controller -> Service -> Repository -> Model`.
   - Repositories execute queries without knowing HTTP contracts.
   - Services manage transactions and domain rules without importing FastAPI.
   - Controllers handle HTTP translation, ensuring clean testing and modularity.
2. **Strategy + Factory Pattern for LLM Providers:**
   - Abstract `BaseLLMProvider` ensures business code never couples to a specific provider SDK.
   - New providers or models are added strictly through configuration entries in `PROVIDER_CATALOG` and `_PROVIDER_CLASS_MAP` in `app/llm/registry.py` without modifying existing service code.
3. **Shared Synchronous Connection Pool:**
   - SDK clients reuse a single, process-wide `httpx.Client` pool configured with strict connection limits, avoiding ephemeral port exhaustion during concurrent worker execution.
4. **Decoupled Asynchronous Processing:**
   - Prompt generation and batch evaluations are offloaded to Celery workers via Redis queues, keeping the FastAPI HTTP event loop non-blocking and responsive.
5. **Decoupled Test Suite via Golden Examples:**
   - Golden examples belong to the prompt task identity rather than individual versions, enabling objective regression testing across version iterations.
6. **Parallelized Pairwise Testing:**
   - The A/B testing service fires both LLM requests in parallel using `concurrent.futures.ThreadPoolExecutor(max_workers=2)`, minimizing user wait time.
7. **Dual-Token Security Architecture:**
   - Separates account credentials from platform integrations: users log in via password-authenticated JWTs to create and revoke scoped `llmops_*` API keys.
8. **Client-Side Analytics Aggregation:**
   - Preserves backend simplicity by computing distributions, percentiles, and trend charts directly in the frontend from canonical run records.
