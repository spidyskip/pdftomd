# Refactor Design: PDF to Markdown OCR

**Date**: 2026-06-06
**Scope**: Full architecture refactor (Approach B) — backend modularization, TypeScript frontend, Docker Compose, CI/CD, tests

---

## 1. Problem Statement

The current codebase has a monolithic `app.py` (220 lines, everything in one file), a JavaScript frontend with no type safety, no tests, a broken Dockerfile, and no deployment orchestration. The goal is to refactor into a production-ready architecture with clean separation of concerns, type safety, test coverage, and Docker Compose deployment.

---

## 2. Backend Architecture

### 2.1 Module Structure

```
app/
├── __init__.py
├── main.py              # FastAPI app factory, lifespan events
├── config.py            # Pydantic Settings from env vars
├── dependencies.py      # FastAPI dependency injection
├── models/
│   └── job.py           # Pydantic schemas: JobStatus, JobCreate, JobResponse, HealthResponse
├── services/
│   ├── ollama.py        # OllamaClient: health_check, ensure_model, ocr_image
│   ├── pdf.py           # pdf_to_images: pure function, pdftoppm wrapper
│   └── storage.py       # JobStore ABC + InMemoryJobStore (async-safe)
├── routes/
│   ├── jobs.py          # POST /, GET /, GET /{id}, GET /{id}/result, DELETE /{id}
│   └── health.py        # GET /health
└── worker.py            # process_job: async pipeline (PDF → images → OCR → markdown)
```

### 2.2 Configuration (`config.py`)

```python
class Settings(BaseSettings):
    ollama_url: str = "http://localhost:11434"
    model_name: str = "glm-ocr"
    auto_pull_model: bool = True
    upload_dir: Path = Path("uploads")
    result_dir: Path = Path("results")
    temp_image_dir: Path = Path("temp_images")
    max_file_size: int = 50 * 1024 * 1024  # 50 MB
```

All values overridable via environment variables. `OLLAMA_URL` defaults to `localhost:11434` for local dev, set to `http://ollama:11434` in Docker Compose.

### 2.3 Ollama Client (`services/ollama.py`)

`OllamaClient` wraps all Ollama API interactions:

- `health_check()` — GET `/api/tags`, returns `bool`
- `ensure_model()` — checks if model exists in tags. If not and `AUTO_PULL_MODEL=True`, calls POST `/api/pull` with streaming, waits for completion. Raises `OllamaError` on failure
- `ocr_image(b64: str)` — POST `/api/generate` with model, prompt, image. Returns markdown text. Raises `OllamaError` on non-200

The `ensure_model()` call happens once at app startup (via `lifespan`) and is also called by the worker before processing. If Ollama is unreachable, the health endpoint reports it and jobs fail with a clear error.

### 2.4 Job Storage (`services/storage.py`)

```python
class JobStore(ABC):
    async def create(job: JobCreate) -> JobResponse: ...
    async def get(job_id: str) -> JobResponse | None: ...
    async def list() -> list[JobResponse]: ...
    async def update(job_id: str, **fields) -> None: ...
    async def delete(job_id: str) -> None: ...

class InMemoryJobStore(JobStore):
    # Uses asyncio.Lock for thread-safe mutations
    # Stores JobResponse dicts keyed by job_id
```

The ABC allows swapping to Redis later without changing route or worker code.

### 2.5 Worker (`worker.py`)

`process_job(job_id: str)` is an `async` function:

1. Calls `await ollama.ensure_model()` — pulls model if needed
2. Runs `pdf_to_images()` via `asyncio.to_thread()` (subprocess is blocking)
3. For each page: calls `await ocr_client.ocr_image(b64)` — non-blocking HTTP
4. Writes result markdown to `RESULT_DIR/{job_id}.md`
5. Updates job status via `JobStore.update()` at each step
6. Cleans up temp images in `finally` block

Error handling: any exception sets job status to `failed` with the error message. The `finally` block always runs cleanup.

### 2.6 Routes

**`routes/jobs.py`** (prefix `/api/jobs`):
- `POST /` — upload PDF, create job, return `JobResponse` with `status: queued`
- `GET /` — list all jobs
- `GET /{job_id}` — get job status
- `GET /{job_id}/result` — get markdown result (only if `status: finished`)
- `DELETE /{job_id}` — remove job and associated files

**`routes/health.py`** (prefix `/api`):
- `GET /health` — returns `{ ollama_available: bool, model: str, model_loaded: bool }`

### 2.7 App Factory (`app/main.py`)

```python
def create_app() -> FastAPI:
    app = FastAPI(title="PDF to Markdown OCR", version="2.0.0")
    app.add_middleware(CORSMiddleware, ...)
    app.include_router(health_router, prefix="/api")
    app.include_router(jobs_router, prefix="/api/jobs")

    @app.on_event("startup")
    async def startup():
        await ollama_client.ensure_model()

    return app
```

Dependencies (`JobStore`, `OllamaClient`) are created at app startup and injected via FastAPI's `Depends()`.

### 2.8 Entry Point (`app.py`)

The root-level `app.py` is replaced by a thin shim:

```python
from app.main import create_app

app = create_app()
```

This preserves `uvicorn app:app --reload` for local development without changes to the run command.

---

## 3. Frontend Architecture

### 3.1 Technology Stack

- React 18 + TypeScript (strict mode)
- Vite 5 (build tool)
- CSS (no CSS framework — custom design tokens, same minimalist aesthetic)
- No external state management (React Context + hooks suffice for this scale)

### 3.2 Module Structure

```
frontend/src/
├── types/
│   └── job.ts           # JobStatus, Job, HealthResponse interfaces
├── api/
│   └── client.ts        # Typed fetch wrapper, base URL from VITE_API_URL
├── hooks/
│   ├── useJobs.ts       # Job list state + polling logic
│   └── useUpload.ts     # File upload with error handling
├── context/
│   └── JobContext.tsx   # React context for shared job state
├── components/
│   ├── UploadForm/
│   │   ├── UploadForm.tsx
│   │   └── UploadForm.css
│   ├── JobList/
│   │   ├── JobList.tsx
│   │   └── JobList.css
│   ├── JobRow/
│   │   ├── JobRow.tsx
│   │   └── JobRow.css
│   ├── MarkdownPreview/
│   │   ├── MarkdownPreview.tsx
│   │   └── MarkdownPreview.css
│   ├── Toast/
│   │   ├── Toast.tsx
│   │   └── Toast.css
│   └── ErrorBoundary/
│       └── ErrorBoundary.tsx
├── App.tsx
├── main.tsx
└── index.css            # Design tokens (unchanged)
```

### 3.3 API Client (`api/client.ts`)

```typescript
const API_BASE = import.meta.env.VITE_API_URL || "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(res.status, err.detail || "Request failed");
  }
  return res.json();
}

export const jobsApi = {
  list: () => request<Job[]>("/jobs"),
  get: (id: string) => request<Job>(`/jobs/${id}`),
  upload: (file: File) => { /* multipart POST */ },
  getResult: (id: string) => fetchText(`/jobs/${id}/result`),
  delete: (id: string) => request(`/jobs/${id}`, { method: "DELETE" }),
};
```

### 3.4 Job Context (`context/JobContext.tsx`)

Replaces prop-drilling from `App`. Provides:
- `jobs: Job[]` — current job list
- `addJob(job: Job)` — add newly created job
- `removeJob(id: string)` — remove job by ID
- `refreshJob(id: string)` — poll single job status

Polling: `useJobs` hook polls `GET /api/jobs` every 3 seconds for active jobs (status `queued` or `processing`). Stops polling when all jobs are `finished` or `failed`.

### 3.5 Dependency Changes

**Removed** (no longer needed):
- `axios` — replaced by native `fetch` in `api/client.ts`
- `react-syntax-highlighter` — unused
- `react-hot-toast` — replaced by lightweight custom `Toast` component

**Added** (dev dependencies):
- `typescript` — type checking
- `@types/react`, `@types/react-dom` — React type definitions
- `vitest` — test runner
- `@testing-library/react`, `@testing-library/jest-dom` — component testing
- `msw` — API mocking for tests

### 3.6 Error Boundary

`ErrorBoundary` catches render errors in the component tree and displays a fallback UI with a "Retry" button. Wraps the entire app.

---

## 4. Docker Compose & Deployment

### 4.1 `docker-compose.yml`

```yaml
services:
  ollama:
    image: ollama/ollama:latest
    container_name: pdfmd-ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama-data:/root/.ollama
    healthcheck:
      test: ["CMD", "ollama", "list"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: docker/Dockerfile
    container_name: pdfmd-backend
    ports:
      - "8000:8000"
    environment:
      OLLAMA_URL: http://ollama:11434
      AUTO_PULL_MODEL: "true"
      UPLOAD_DIR: /app/uploads
      RESULT_DIR: /app/results
    volumes:
      - uploads:/app/uploads
      - results:/app/results
    depends_on:
      ollama:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    container_name: pdfmd-frontend
    ports:
      - "5173:5173"
    environment:
      VITE_API_URL: http://localhost:8000
    depends_on:
      - backend

volumes:
  ollama-data:
  uploads:
  results:
```

### 4.2 Backend Dockerfile

Multi-stage build removed (no static frontend serving). Simple single-stage:

```dockerfile
FROM python:3.13-slim
RUN apt-get update && apt-get install -y --no-install-recommends poppler-utils && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ ./app/
COPY app.py .
RUN mkdir -p /app/uploads /app/results /app/temp_images
EXPOSE 8000
CMD ["uvicorn", "app.main:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
```

### 4.3 Frontend Dockerfile (dev)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
```

### 4.4 Local Development

Two options:

**Option A — Full Docker Compose:**
```bash
docker compose up
```

**Option B — Hybrid (recommended for dev):**
```bash
# Terminal 1: Ollama
docker compose up ollama

# Terminal 2: Backend (native)
cd /path/to/project
source .venv/bin/activate
uvicorn app.main:create_app --factory --reload --port 8000

# Terminal 3: Frontend (native)
cd frontend
npm run dev
```

Both work because `OLLAMA_URL` defaults to `localhost:11434` and the Vite dev server proxies `/api` to `localhost:8000`.

---

## 5. Testing

### 5.1 Backend Tests (`tests/`)

```
tests/
├── conftest.py          # Fixtures: test client, temp dirs, mocked OllamaClient
├── test_health.py       # GET /api/health
├── test_jobs.py         # CRUD operations, upload, result retrieval
├── test_worker.py       # Mocked OCR pipeline
└── test_storage.py      # JobStore operations
```

- `pytest` + `httpx.AsyncClient` for async route testing
- `unittest.mock` for mocking `OllamaClient` and `pdf_to_images`
- `tmp_path` fixture for file I/O tests
- Test coverage target: 80%+

### 5.2 Frontend Tests

```
frontend/src/
├── components/
│   ├── UploadForm/
│   │   └── UploadForm.test.tsx
│   ├── JobList/
│   │   └── JobList.test.tsx
│   └── MarkdownPreview/
│       └── MarkdownPreview.test.tsx
├── hooks/
│   ├── useJobs.test.ts
│   └── useUpload.test.ts
└── api/
    └── client.test.ts
```

- `vitest` + React Testing Library
- `msw` (Mock Service Worker) for API mocking
- Test rendering, user interactions, error states

---

## 6. CI/CD

### 6.1 GitHub Actions (`.github/workflows/ci.yml`)

```yaml
on: [push, pull_request]
jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.13" }
      - run: pip install -r requirements.txt
      - run: pip install pytest pytest-asyncio httpx
      - run: pytest tests/ --cov=app --cov-report=term-missing

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: cd frontend && npm ci
      - run: cd frontend && npx tsc --noEmit
      - run: cd frontend && npx vitest run
```

---

## 7. Migration Plan

The refactor is implemented in this order:

1. **Backend module extraction** — split `app.py` into the package structure, keep the same API
2. **Ollama client + model pulling** — add `ensure_model()` with auto-pull
3. **Async worker** — convert `process_job` to async with `asyncio.to_thread`
4. **TypeScript migration** — rename `.jsx` → `.tsx`, add types, fix errors
5. **API client + hooks** — extract shared logic from components
6. **Job context** — replace prop-drilling with context
7. **Custom toast** — replace `react-hot-toast`
8. **Error boundary** — add error handling
9. **Docker Compose** — write `docker-compose.yml`, fix `Dockerfile`
10. **Tests** — backend tests first, then frontend
11. **CI workflow** — GitHub Actions

Each step is a separate commit. The app works at every step.

---

## 8. Design Decisions

| Decision | Rationale |
|----------|-----------|
| `InMemoryJobStore` (not Redis) | Single-user tool, no need for distributed state. ABC allows future swap |
| `asyncio.to_thread` for `pdftoppm` | Subprocess is blocking; thread pool avoids blocking the event loop |
| No frontend state management library | React Context + hooks are sufficient for ~5 state fields |
| CSS over Tailwind/CSS-in-JS | Existing design is custom CSS tokens; no need for a framework |
| Custom toast over `react-hot-toast` | One less dependency; 3 lines of CSS + 20 lines of React |
| `AUTO_PULL_MODEL` default `True` | Zero-config deployment; user doesn't need to manually pull the model |
| Separate `Dockerfile.dev` for frontend | Dev server needs Vite HMR; production build would be different |
