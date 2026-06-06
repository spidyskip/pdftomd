# Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the PDF to Markdown OCR tool into a production-ready architecture with modular backend, TypeScript frontend, Docker Compose deployment, and test coverage.

**Architecture:** Backend becomes a Python package (`app/`) with config, models, services, routes, and async worker. Frontend migrates to TypeScript with shared API client, custom hooks, and React Context. Docker Compose orchestrates Ollama + backend + frontend.

**Tech Stack:** Python 3.13, FastAPI, Pydantic v2, React 18, TypeScript, Vite 5, CSS, pytest, vitest, Docker Compose

---

## File Map

### Backend (new files)
```
app/
├── __init__.py
├── main.py                  # FastAPI app factory
├── config.py                # Pydantic Settings
├── dependencies.py          # FastAPI Depends() providers
├── models/
│   └── job.py               # JobStatus enum, Pydantic schemas
├── services/
│   ├── ollama.py            # OllamaClient class
│   ├── pdf.py               # pdf_to_images function
│   └── storage.py           # JobStore ABC + InMemoryJobStore
├── routes/
│   ├── jobs.py              # Job CRUD endpoints
│   └── health.py            # Health check endpoint
└── worker.py                # Async process_job pipeline
```

### Backend (modified files)
```
app.py                       # Thin shim → from app.main import create_app
requirements.txt             # Add pydantic, pydantic-settings
```

### Frontend (new files)
```
frontend/src/
├── types/
│   └── job.ts               # TypeScript interfaces
├── api/
│   └── client.ts            # Typed fetch wrapper
├── hooks/
│   ├── useJobs.ts           # Job polling hook
│   └── useUpload.ts         # File upload hook
├── context/
│   └── JobContext.tsx       # React context for job state
├── components/
│   ├── Toast/
│   │   ├── Toast.tsx
│   │   └── Toast.css
│   └── ErrorBoundary/
│       └── ErrorBoundary.tsx
```

### Frontend (modified files)
```
frontend/src/App.jsx         → App.tsx (use context, remove prop drilling)
frontend/src/components/
│   ├── UploadForm.jsx       → UploadForm/UploadForm.tsx
│   ├── JobTable.jsx         → JobList/JobList.tsx + JobRow/JobRow.tsx
│   └── MarkdownPreview.jsx  → MarkdownPreview/MarkdownPreview.tsx
frontend/package.json        # Remove unused deps, add devDeps
frontend/tsconfig.json       # New
```

### Docker & CI (new files)
```
docker-compose.yml
docker/Dockerfile            # Fixed backend Dockerfile
frontend/Dockerfile.dev      # Frontend dev Dockerfile
.github/workflows/ci.yml     # GitHub Actions CI
```

### Tests (new files)
```
tests/
├── conftest.py
├── test_health.py
├── test_jobs.py
├── test_worker.py
└── test_storage.py
frontend/src/
├── api/client.test.ts
├── hooks/useJobs.test.ts
├── hooks/useUpload.test.ts
├── components/JobList/JobList.test.tsx
└── components/UploadForm/UploadForm.test.tsx
```

---

## Task 1: Backend Package Skeleton

**Files:**
- Create: `app/__init__.py`
- Create: `app/config.py`
- Create: `app/models/__init__.py`
- Create: `app/models/job.py`
- Create: `app/services/__init__.py`
- Create: `app/services/storage.py`
- Create: `app/services/pdf.py`
- Create: `app/services/ollama.py`
- Create: `app/routes/__init__.py`
- Create: `app/routes/health.py`
- Create: `app/routes/jobs.py`
- Create: `app/worker.py`
- Create: `app/dependencies.py`
- Create: `app/main.py`
- Modify: `app.py`
- Modify: `requirements.txt`

- [ ] **Step 1: Create `app/__init__.py`** — empty file

- [ ] **Step 2: Create `app/config.py`**

```python
from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    ollama_url: str = "http://localhost:11434"
    model_name: str = "glm-ocr"
    auto_pull_model: bool = True
    upload_dir: Path = Path("uploads")
    result_dir: Path = Path("results")
    temp_image_dir: Path = Path("temp_images")
    max_file_size: int = 50 * 1024 * 1024

    class Config:
        env_prefix = ""

settings = Settings()
```

- [ ] **Step 3: Create `app/models/job.py`**

```python
from enum import Enum
from pydantic import BaseModel
from typing import Optional

class JobStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    FINISHED = "finished"
    FAILED = "failed"

class JobCreate(BaseModel):
    filename: str

class JobResponse(BaseModel):
    id: str
    filename: str
    status: JobStatus
    progress: int = 0
    status_text: str = ""
    page_count: Optional[int] = None
    error: Optional[str] = None
    created: str

class HealthResponse(BaseModel):
    ollama_available: bool
    model: str
    model_loaded: bool
```

- [ ] **Step 4: Create `app/services/storage.py`**

```python
import asyncio
from abc import ABC, abstractmethod
from typing import Optional
from app.models.job import JobResponse, JobStatus

class JobStore(ABC):
    @abstractmethod
    async def create(self, job: JobResponse) -> JobResponse: ...
    @abstractmethod
    async def get(self, job_id: str) -> Optional[JobResponse]: ...
    @abstractmethod
    async def list_all(self) -> list[JobResponse]: ...
    @abstractmethod
    async def update(self, job_id: str, **fields) -> None: ...
    @abstractmethod
    async def delete(self, job_id: str) -> None: ...

class InMemoryJobStore(JobStore):
    def __init__(self):
        self._jobs: dict[str, JobResponse] = {}
        self._lock = asyncio.Lock()

    async def create(self, job: JobResponse) -> JobResponse:
        async with self._lock:
            self._jobs[job.id] = job
        return job

    async def get(self, job_id: str) -> Optional[JobResponse]:
        return self._jobs.get(job_id)

    async def list_all(self) -> list[JobResponse]:
        return list(self._jobs.values())

    async def update(self, job_id: str, **fields) -> None:
        async with self._lock:
            if job_id in self._jobs:
                current = self._jobs[job_id]
                updated = current.model_copy(update=fields)
                self._jobs[job_id] = updated

    async def delete(self, job_id: str) -> None:
        async with self._lock:
            self._jobs.pop(job_id, None)
```

- [ ] **Step 5: Create `app/services/pdf.py`**

```python
import subprocess
from pathlib import Path
from typing import List

def pdf_to_images(pdf_path: str, output_dir: Path) -> List[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    stem = Path(pdf_path).stem
    subprocess.run(
        ["pdftoppm", "-png", "-r", "300", pdf_path, str(output_dir / stem)],
        check=True,
        capture_output=True,
    )
    return sorted(output_dir.glob(f"{stem}-*.png"))
```

- [ ] **Step 6: Create `app/services/ollama.py`**

```python
import base64
import requests
from pathlib import Path
from app.config import settings

class OllamaError(Exception):
    pass

class OllamaClient:
    def __init__(self, base_url: str = None, model: str = None):
        self.base_url = base_url or settings.ollama_url
        self.model = model or settings.model_name

    def health_check(self) -> bool:
        try:
            r = requests.get(f"{self.base_url}/api/tags", timeout=5)
            return r.status_code == 200
        except Exception:
            return False

    def is_model_loaded(self) -> bool:
        try:
            r = requests.get(f"{self.base_url}/api/tags", timeout=5)
            if r.status_code != 200:
                return False
            names = [m["name"] for m in r.json().get("models", [])]
            return any(self.model in n for n in names)
        except Exception:
            return False

    def ensure_model(self) -> bool:
        if self.is_model_loaded():
            return True
        if not settings.auto_pull_model:
            return False
        try:
            r = requests.post(
                f"{self.base_url}/api/pull",
                json={"name": self.model, "stream": False},
                timeout=300,
            )
            return r.status_code == 200
        except Exception as e:
            raise OllamaError(f"Failed to pull model: {e}")

    def ocr_image(self, image_path: Path) -> str:
        b64 = base64.b64encode(image_path.read_bytes()).decode()
        payload = {
            "model": self.model,
            "prompt": (
                "Extract all text from this image and format it as structured markdown. "
                "Preserve tables, headings, lists, and code blocks."
            ),
            "images": [b64],
            "stream": False,
        }
        r = requests.post(f"{self.base_url}/api/generate", json=payload, timeout=120)
        if r.status_code != 200:
            raise OllamaError(f"Ollama error {r.status_code}: {r.text}")
        return r.json().get("response", "").strip()
```

- [ ] **Step 7: Create `app/worker.py`**

```python
import asyncio
import shutil
from pathlib import Path
from app.config import settings
from app.models.job import JobStatus
from app.services.pdf import pdf_to_images
from app.services.ollama import OllamaClient, OllamaError
from app.services.storage import JobStore

async def process_job(job_id: str, pdf_path: Path, store: JobStore, ollama: OllamaClient):
    job = await store.get(job_id)
    if not job:
        return

    await store.update(job_id, status=JobStatus.PROCESSING, progress=0)

    try:
        # Ensure model is available
        await store.update(job_id, status_text="Checking model…")
        try:
            ollama.ensure_model()
        except OllamaError as e:
            await store.update(job_id, status=JobStatus.FAILED, error=str(e))
            return

        # PDF → images (blocking subprocess → thread)
        await store.update(job_id, status_text="Converting PDF to images…")
        temp_dir = settings.temp_image_dir / job_id
        images = await asyncio.to_thread(pdf_to_images, str(pdf_path), temp_dir)
        total = len(images)
        await store.update(job_id, page_count=total)

        # OCR each page
        pages = []
        for i, img_path in enumerate(images):
            await store.update(
                job_id,
                status_text=f"OCR page {i + 1}/{total}",
                progress=int((i + 1) / total * 100),
            )
            text = ollama.ocr_image(img_path)
            pages.append(f"## Page {i + 1}\n\n{text}")

        # Write result
        md = "\n\n---\n\n".join(pages)
        out_path = settings.result_dir / f"{job_id}.md"
        out_path.write_text(md, encoding="utf-8")

        await store.update(
            job_id,
            status=JobStatus.FINISHED,
            progress=100,
            status_text="Done",
        )

    except Exception as exc:
        await store.update(job_id, status=JobStatus.FAILED, error=str(exc))

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
```

- [ ] **Step 8: Create `app/routes/health.py`**

```python
from fastapi import APIRouter
from app.models.job import HealthResponse
from app.dependencies import get_ollama

router = APIRouter()

@router.get("/health", response_model=HealthResponse)
async def health():
    ollama = get_ollama()
    return HealthResponse(
        ollama_available=ollama.health_check(),
        model=ollama.model,
        model_loaded=ollama.is_model_loaded(),
    )
```

- [ ] **Step 9: Create `app/routes/jobs.py`**

```python
import uuid
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import PlainTextResponse
from app.config import settings
from app.models.job import JobResponse, JobStatus
from app.dependencies import get_store, get_ollama
from app.worker import process_job

router = APIRouter()

@router.post("", response_model=JobResponse)
async def upload(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are accepted")

    job_id = str(uuid.uuid4())[:8]
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    save_path = settings.upload_dir / f"{job_id}_{file.filename}"
    save_path.write_bytes(await file.read())

    job = JobResponse(
        id=job_id,
        filename=file.filename,
        status=JobStatus.QUEUED,
        progress=0,
        status_text="Waiting",
        page_count=None,
        error=None,
        created=datetime.now(timezone.utc).isoformat(),
    )

    store = get_store()
    await store.create(job)

    ollama = get_ollama()
    if background_tasks:
        background_tasks.add_task(process_job, job_id, save_path, store, ollama)
    else:
        await process_job(job_id, save_path, store, ollama)

    return job

@router.get("", response_model=list[JobResponse])
async def list_jobs():
    store = get_store()
    return await store.list_all()

@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str):
    store = get_store()
    job = await store.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job

@router.get("/{job_id}/result", response_class=PlainTextResponse)
async def get_result(job_id: str):
    store = get_store()
    job = await store.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job.status != JobStatus.FINISHED:
        raise HTTPException(400, "Job not finished yet")
    out_path = settings.result_dir / f"{job_id}.md"
    return out_path.read_text(encoding="utf-8")

@router.delete("/{job_id}")
async def delete_job(job_id: str):
    store = get_store()
    job = await store.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    for p in settings.upload_dir.glob(f"{job_id}_*"):
        p.unlink(missing_ok=True)
    (settings.result_dir / f"{job_id}.md").unlink(missing_ok=True)
    await store.delete(job_id)
    return {"deleted": job_id}
```

- [ ] **Step 10: Create `app/dependencies.py`**

```python
from app.config import settings
from app.services.storage import InMemoryJobStore, JobStore
from app.services.ollama import OllamaClient

_store: JobStore = InMemoryJobStore()
_ollama: OllamaClient = OllamaClient()

def get_store() -> JobStore:
    return _store

def get_ollama() -> OllamaClient:
    return _ollama
```

- [ ] **Step 11: Create `app/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.dependencies import get_ollama
from app.routes.health import router as health_router
from app.routes.jobs import router as jobs_router

def create_app() -> FastAPI:
    settings.upload_dir.mkdir(exist_ok=True)
    settings.result_dir.mkdir(exist_ok=True)
    settings.temp_image_dir.mkdir(exist_ok=True)

    app = FastAPI(title="PDF to Markdown OCR", version="2.0.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health_router, prefix="/api")
    app.include_router(jobs_router, prefix="/api/jobs")

    @app.on_event("startup")
    async def startup():
        ollama = get_ollama()
        if settings.auto_pull_model:
            try:
                ollama.ensure_model()
            except Exception:
                pass  # Health endpoint will report the issue

    return app
```

- [ ] **Step 12: Modify `app.py`** — replace contents with:

```python
from app.main import create_app

app = create_app()
```

- [ ] **Step 13: Update `requirements.txt`**

```
fastapi>=0.110
uvicorn[standard]>=0.29
python-multipart>=0.0.9
requests>=2.31
pydantic>=2.0
pydantic-settings>=2.0
```

- [ ] **Step 14: Create `app/models/__init__.py`**, `app/services/__init__.py`, `app/routes/__init__.py` — empty files

- [ ] **Step 15: Test the backend starts**

Run: `cd /Users/antonio/Projects/test && source .venv/bin/activate && pip install pydantic pydantic-settings && uvicorn app:app --reload --port 8000`
Expected: Server starts without import errors

- [ ] **Step 16: Commit**

```bash
git add app/ app.py requirements.txt
git commit -m "feat: extract backend into modular package structure"
```

---

## Task 2: Backend Tests

**Files:**
- Create: `tests/__init__.py`
- Create: `tests/conftest.py`
- Create: `tests/test_health.py`
- Create: `tests/test_jobs.py`
- Create: `tests/test_storage.py`
- Create: `tests/test_worker.py`
- Modify: `requirements.txt` (add test deps)

- [ ] **Step 1: Add test dependencies to `requirements.txt`**

Append:
```
pytest>=8.0
pytest-asyncio>=0.23
httpx>=0.27
```

- [ ] **Step 2: Create `tests/conftest.py`**

```python
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import create_app
from app.dependencies import get_store, get_ollama
from app.services.storage import InMemoryJobStore
from app.services.ollama import OllamaClient

@pytest.fixture
def store():
    return InMemoryJobStore()

@pytest.fixture
def app(store):
    application = create_app()
    application.dependency_overrides[get_store] = lambda: store
    return application

@pytest_asyncio.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
```

- [ ] **Step 3: Create `tests/test_health.py`**

```python
import pytest

@pytest.mark.asyncio
async def test_health_returns_status(client):
    r = await client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert "ollama_available" in data
    assert "model" in data
    assert "model_loaded" in data
```

- [ ] **Step 4: Create `tests/test_jobs.py`**

```python
import pytest
from pathlib import Path

@pytest.mark.asyncio
async def test_upload_pdf(client, tmp_path):
    pdf = tmp_path / "test.pdf"
    pdf.write_bytes(b"%PDF-1.4 fake pdf content")
    with open(pdf, "rb") as f:
        r = await client.post("/api/jobs", files={"file": ("test.pdf", f, "application/pdf")})
    assert r.status_code == 200
    data = r.json()
    assert data["filename"] == "test.pdf"
    assert data["status"] == "queued"
    assert "id" in data

@pytest.mark.asyncio
async def test_upload_non_pdf_rejected(client):
    r = await client.post("/api/jobs", files={"file": ("test.txt", b"not a pdf", "text/plain")})
    assert r.status_code == 400

@pytest.mark.asyncio
async def test_list_jobs_empty(client):
    r = await client.get("/api/jobs")
    assert r.status_code == 200
    assert r.json() == []

@pytest.mark.asyncio
async def test_get_job_not_found(client):
    r = await client.get("/api/jobs/nonexistent")
    assert r.status_code == 404

@pytest.mark.asyncio
async def test_delete_job_not_found(client):
    r = await client.delete("/api/jobs/nonexistent")
    assert r.status_code == 404
```

- [ ] **Step 5: Create `tests/test_storage.py`**

```python
import pytest
import pytest_asyncio
from app.services.storage import InMemoryJobStore
from app.models.job import JobResponse, JobStatus

@pytest.mark.asyncio
async def test_create_and_get():
    store = InMemoryJobStore()
    job = JobResponse(
        id="abc123", filename="test.pdf", status=JobStatus.QUEUED,
        progress=0, status_text="Waiting", page_count=None, error=None, created="2024-01-01",
    )
    await store.create(job)
    result = await store.get("abc123")
    assert result is not None
    assert result.id == "abc123"

@pytest.mark.asyncio
async def test_get_missing():
    store = InMemoryJobStore()
    assert await store.get("missing") is None

@pytest.mark.asyncio
async def test_update():
    store = InMemoryJobStore()
    job = JobResponse(
        id="abc123", filename="test.pdf", status=JobStatus.QUEUED,
        progress=0, status_text="Waiting", page_count=None, error=None, created="2024-01-01",
    )
    await store.create(job)
    await store.update("abc123", progress=50, status_text="Working")
    result = await store.get("abc123")
    assert result.progress == 50
    assert result.status_text == "Working"

@pytest.mark.asyncio
async def test_delete():
    store = InMemoryJobStore()
    job = JobResponse(
        id="abc123", filename="test.pdf", status=JobStatus.QUEUED,
        progress=0, status_text="Waiting", page_count=None, error=None, created="2024-01-01",
    )
    await store.create(job)
    await store.delete("abc123")
    assert await store.get("abc123") is None

@pytest.mark.asyncio
async def test_list_all():
    store = InMemoryJobStore()
    for i in range(3):
        job = JobResponse(
            id=f"job{i}", filename=f"test{i}.pdf", status=JobStatus.QUEUED,
            progress=0, status_text="Waiting", page_count=None, error=None, created="2024-01-01",
        )
        await store.create(job)
    jobs = await store.list_all()
    assert len(jobs) == 3
```

- [ ] **Step 6: Create `tests/test_worker.py`**

```python
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock
from app.models.job import JobStatus
from app.services.storage import InMemoryJobStore
from app.services.ollama import OllamaClient
from app.worker import process_job

@pytest.mark.asyncio
async def test_process_job_ollama_unavailable():
    store = InMemoryJobStore()
    job = MagicMock()
    job.id = "test123"
    job.filename = "test.pdf"
    await store.create(job)

    ollama = MagicMock(spec=OllamaClient)
    ollama.ensure_model.side_effect = Exception("Ollama unreachable")

    pdf_path = Path("/tmp/fake.pdf")
    pdf_path.write_bytes(b"fake")

    await process_job("test123", pdf_path, store, ollama)

    result = await store.get("test123")
    assert result.status == JobStatus.FAILED
    assert "Ollama unreachable" in result.error
```

- [ ] **Step 7: Run tests**

Run: `cd /Users/antonio/Projects/test && source .venv/bin/activate && pip install pytest pytest-asyncio httpx && pytest tests/ -v`
Expected: All tests pass

- [ ] **Step 8: Commit**

```bash
git add tests/ requirements.txt
git commit -m "test: add backend test suite"
```

---

## Task 3: TypeScript Migration

**Files:**
- Create: `frontend/tsconfig.json`
- Create: `frontend/src/types/job.ts`
- Create: `frontend/src/api/client.ts`
- Modify: `frontend/package.json`
- Modify: `frontend/src/main.jsx` → `main.tsx`
- Modify: `frontend/src/App.jsx` → `App.tsx`
- Modify: `frontend/src/components/UploadForm.jsx` → `UploadForm/UploadForm.tsx`
- Modify: `frontend/src/components/UploadForm.css` → `UploadForm/UploadForm.css`
- Modify: `frontend/src/components/JobTable.jsx` → `JobList/JobList.tsx` + `JobRow/JobRow.tsx`
- Modify: `frontend/src/components/JobTable.css` → `JobList/JobList.css` + `JobRow/JobRow.css`
- Modify: `frontend/src/components/MarkdownPreview.jsx` → `MarkdownPreview/MarkdownPreview.tsx`
- Modify: `frontend/src/components/MarkdownPreview.css` → `MarkdownPreview/MarkdownPreview.css`

- [ ] **Step 1: Create `frontend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
```

- [ ] **Step 2: Create `frontend/src/types/job.ts`**

```typescript
export type JobStatus = "queued" | "processing" | "finished" | "failed";

export interface Job {
  id: string;
  filename: string;
  status: JobStatus;
  progress: number;
  status_text: string;
  page_count: number | null;
  error: string | null;
  created: string;
}

export interface HealthResponse {
  ollama_available: boolean;
  model: string;
  model_loaded: boolean;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}
```

- [ ] **Step 3: Create `frontend/src/api/client.ts`**

```typescript
import { Job, JobStatus, HealthResponse, ApiError } from "../types/job";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {};
  if (options?.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...headers, ...options?.headers } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(res.status, (err as { detail?: string }).detail || "Request failed");
  }
  return res.json() as Promise<T>;
}

async function fetchText(path: string): Promise<string> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(res.status, (err as { detail?: string }).detail || "Request failed");
  }
  return res.text();
}

export const jobsApi = {
  list: () => request<Job[]>("/jobs"),
  get: (id: string) => request<Job>(`/jobs/${id}`),
  upload: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<Job>("/jobs", { method: "POST", body: formData });
  },
  getResult: (id: string) => fetchText(`/jobs/${id}/result`),
  delete: (id: string) => request<{ deleted: string }>(`/jobs/${id}`, { method: "DELETE" }),
};

export const healthApi = {
  check: () => request<HealthResponse>("/health"),
};
```

- [ ] **Step 4: Update `frontend/package.json`** — replace dependencies and scripts:

```json
{
  "name": "pdfmd-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-dropzone": "^14.2.3",
    "react-markdown": "^9.0.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/react": "^16.0.0",
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "jsdom": "^24.0.0",
    "msw": "^2.0.0",
    "typescript": "^5.4.0",
    "vite": "^5.0.8",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 5: Install dependencies**

Run: `cd /Users/antonio/Projects/test/frontend && npm install`
Expected: Installs without errors

- [ ] **Step 6: Rename `main.jsx` → `main.tsx`** — no content changes needed

- [ ] **Step 7: Rename and convert `App.jsx` → `App.tsx`**

Replace contents with:

```tsx
import React from "react";
import UploadForm from "./components/UploadForm/UploadForm";
import JobList from "./components/JobList/JobList";
import MarkdownPreview from "./components/MarkdownPreview/MarkdownPreview";
import { JobProvider } from "./context/JobContext";
import Toast from "./components/Toast/Toast";
import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary";
import "./App.css";

function App() {
  return (
    <ErrorBoundary>
      <JobProvider>
        <div className="app">
          <header className="app-header">
            <h1>PDF to Markdown</h1>
            <p>Convert PDF documents to structured Markdown using GLM-OCR</p>
          </header>
          <main className="app-main">
            <UploadForm />
            <JobList />
          </main>
          <MarkdownPreview />
          <Toast />
        </div>
      </JobProvider>
    </ErrorBoundary>
  );
}

export default App;
```

- [ ] **Step 8: Create `frontend/src/context/JobContext.tsx`**

```tsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { Job, JobStatus } from "../types/job";
import { jobsApi } from "../api/client";

interface JobContextValue {
  jobs: Job[];
  previewJob: { content: string; title: string } | null;
  addJob: (job: Job) => void;
  removeJob: (id: string) => void;
  showPreview: (content: string, title: string) => void;
  closePreview: () => void;
}

const JobContext = createContext<JobContextValue | null>(null);

export function JobProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [previewJob, setPreviewJob] = useState<{ content: string; title: string } | null>(null);
  const intervalRef = useRef<number | null>(null);

  const addJob = useCallback((job: Job) => {
    setJobs((prev) => [...prev, job]);
  }, []);

  const removeJob = useCallback(async (id: string) => {
    await jobsApi.delete(id);
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  const showPreview = useCallback((content: string, title: string) => {
    setPreviewJob({ content, title });
  }, []);

  const closePreview = useCallback(() => {
    setPreviewJob(null);
  }, []);

  // Poll for active job updates
  useEffect(() => {
    const poll = async () => {
      const active = jobs.filter(
        (j) => j.status === JobStatus.QUEUED || j.status === JobStatus.PROCESSING
      );
      if (active.length === 0) return;
      try {
        const latest = await jobsApi.list();
        setJobs(latest);
      } catch { /* ignore */ }
    };
    intervalRef.current = window.setInterval(poll, 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [jobs]);

  return (
    <JobContext.Provider value={{ jobs, previewJob, addJob, removeJob, showPreview, closePreview }}>
      {children}
    </JobContext.Provider>
  );
}

export function useJobs() {
  const ctx = useContext(JobContext);
  if (!ctx) throw new Error("useJobs must be used within JobProvider");
  return ctx;
}
```

- [ ] **Step 9: Create `frontend/src/components/ErrorBoundary/ErrorBoundary.tsx`**

```tsx
import React, { Component, ErrorInfo } from "react";

interface Props { children: React.ReactNode }
interface State { hasError: boolean }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <p>Something went wrong.</p>
          <button onClick={() => this.setState({ hasError: false })}>Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

- [ ] **Step 10: Create `frontend/src/components/Toast/Toast.tsx`**

```tsx
import React, { useState, useEffect, useCallback } from "react";
import "./Toast.css";

interface ToastMessage { id: number; text: string; type: "success" | "error" }

let addToast: ((msg: ToastMessage) => void) | null = null;

export function showToast(text: string, type: "success" | "error" = "success") {
  addToast?.({ id: Date.now(), text, type });
}

export default function Toast() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const handleAdd = useCallback((msg: ToastMessage) => {
    setMessages((prev) => [...prev, msg]);
    setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    }, 3000);
  }, []);

  useEffect(() => { addToast = handleAdd; }, [handleAdd]);

  if (messages.length === 0) return null;

  return (
    <div className="toast-container">
      {messages.map((m) => (
        <div key={m.id} className={`toast toast-${m.type}`}>{m.text}</div>
      ))}
    </div>
  );
}
```

- [ ] **Step 11: Create `frontend/src/components/Toast/Toast.css`**

```css
.toast-container {
  position: fixed;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.toast {
  padding: 0.5rem 1rem;
  border-radius: var(--radius);
  font-size: 0.8rem;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  animation: toast-in 0.2s ease;
}

.toast-success { background: var(--success-subtle); color: var(--success); }
.toast-error { background: var(--error-subtle); color: var(--error); }

@keyframes toast-in {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 12: Convert `UploadForm` to TypeScript**

Rename `UploadForm.jsx` → `UploadForm/UploadForm.tsx`, move CSS to `UploadForm/UploadForm.css`. Replace contents:

```tsx
import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useJobs } from "../../context/JobContext";
import { jobsApi } from "../../api/client";
import { showToast } from "../Toast/Toast";
import "./UploadForm.css";

export default function UploadForm() {
  const [isUploading, setIsUploading] = useState(false);
  const { addJob } = useJobs();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsUploading(true);
    for (const file of acceptedFiles) {
      try {
        const result = await jobsApi.upload(file);
        addJob(result);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Upload failed";
        showToast(`${file.name}: ${msg}`, "error");
      }
    }
    const label = acceptedFiles.length === 1 ? acceptedFiles[0].name : `${acceptedFiles.length} files`;
    showToast(`${label} queued`, "success");
    setIsUploading(false);
  }, [addJob]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: true,
    maxSize: 50 * 1024 * 1024,
    disabled: isUploading,
  });

  return (
    <div className="upload">
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? "dropzone--active" : ""} ${isUploading ? "dropzone--disabled" : ""}`}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <div className="dropzone-loading">
            <div className="dropzone-spinner" />
            <span className="dropzone-label">Processing…</span>
          </div>
        ) : (
          <div className="dropzone-content">
            <svg className="dropzone-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <polyline points="9 15 12 12 15 15" />
            </svg>
            <span className="dropzone-label">
              {isDragActive ? "Drop files here" : "Drop PDFs here or click to upload"}
            </span>
            <span className="dropzone-hint">PDF files, up to 50 MB each</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 13: Convert `JobTable` → `JobList` + `JobRow`**

Create `JobList/JobList.tsx`:

```tsx
import React from "react";
import { useJobs } from "../../context/JobContext";
import JobRow from "../JobRow/JobRow";
import "./JobList.css";

const statusConfig: Record<string, { label: string; color: string }> = {
  queued: { label: "Queued", color: "var(--text-muted)" },
  processing: { label: "Processing", color: "var(--warning)" },
  finished: { label: "Done", color: "var(--success)" },
  failed: { label: "Failed", color: "var(--error)" },
};

export { statusConfig };

export default function JobList() {
  const { jobs } = useJobs();

  if (jobs.length === 0) {
    return (
      <div className="jobs-empty">
        <p>No documents yet</p>
        <span>Drop a PDF above to convert it to Markdown</span>
      </div>
    );
  }

  return (
    <div className="jobs">
      <div className="jobs-list">
        {jobs.map((job) => (
          <JobRow key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
}
```

Create `JobList/JobList.css` (same as old `JobTable.css` for `.jobs-empty`, `.jobs-list`, `.job-row`, `.job-row-main`, `.job-name`, `.job-meta`, `.job-pages`, `.job-status`, `.status-dot`, `.job-progress`, `.progress-track`, `.progress-fill`, `.progress-text`, `.job-error`, `.job-actions`, `.job-btn`, `.job-btn-danger`, and responsive rules).

Create `JobRow/JobRow.tsx`:

```tsx
import React from "react";
import { Job } from "../../types/job";
import { useJobs } from "../../context/JobContext";
import { jobsApi } from "../../api/client";
import { showToast } from "../Toast/Toast";
import { statusConfig } from "../JobList/JobList";

interface Props { job: Job }

export default function JobRow({ job }: Props) {
  const { removeJob, showPreview } = useJobs();

  const handleDownload = async () => {
    try {
      const text = await jobsApi.getResult(job.id);
      const blob = new Blob([text], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${job.filename.replace(".pdf", "")}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : "Download failed", "error");
    }
  };

  const handleView = async () => {
    try {
      const text = await jobsApi.getResult(job.id);
      showPreview(text, job.filename);
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : "Preview failed", "error");
    }
  };

  const cfg = statusConfig[job.status] || { label: job.status, color: "var(--text-muted)" };

  return (
    <div className="job-row">
      <div className="job-row-main">
        <span className="job-name">{job.filename}</span>
        <div className="job-meta">
          {job.page_count != null && <span className="job-pages">{job.page_count} pages</span>}
          <span className="job-status" style={{ color: cfg.color }}>
            <span className="status-dot" />
            {cfg.label}
          </span>
        </div>
      </div>
      {job.status === "processing" && (
        <div className="job-progress">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${job.progress}%` }} />
          </div>
          <span className="progress-text">{job.status_text || `${job.progress}%`}</span>
        </div>
      )}
      {job.status === "failed" && job.error && (
        <div className="job-error">{job.error}</div>
      )}
      <div className="job-actions">
        {job.status === "finished" && (
          <>
            <button className="job-btn" onClick={handleView}>Preview</button>
            <button className="job-btn" onClick={handleDownload}>Download</button>
          </>
        )}
        <button className="job-btn job-btn-danger" onClick={() => removeJob(job.id)}>Remove</button>
      </div>
    </div>
  );
}
```

Create `JobRow/JobRow.css` — empty (styles inherited from JobList.css).

- [ ] **Step 14: Convert `MarkdownPreview` to TypeScript**

Rename `MarkdownPreview.jsx` → `MarkdownPreview/MarkdownPreview.tsx`, move CSS to `MarkdownPreview/MarkdownPreview.css`. Replace contents:

```tsx
import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useJobs } from "../../context/JobContext";
import "./MarkdownPreview.css";

export default function MarkdownPreview() {
  const { previewJob, closePreview } = useJobs();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!previewJob) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") closePreview(); };
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [previewJob, closePreview]);

  if (!previewJob) return null;

  const handleDownload = () => {
    const blob = new Blob([previewJob.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${previewJob.title.replace(".pdf", "")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(previewJob.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  return (
    <div className="preview-overlay" onClick={closePreview}>
      <div className="preview" onClick={(e) => e.stopPropagation()}>
        <div className="preview-header">
          <span className="preview-title">{previewJob.title}</span>
          <div className="preview-actions">
            <button className="btn" onClick={handleCopy}>{copied ? "Copied" : "Copy"}</button>
            <button className="btn" onClick={handleDownload}>Download</button>
            <button className="btn btn-close" onClick={closePreview}>Close</button>
          </div>
        </div>
        <div className="preview-body">
          <ReactMarkdown>{previewJob.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 15: Delete old component files**

```bash
rm frontend/src/components/UploadForm.jsx
rm frontend/src/components/UploadForm.css
rm frontend/src/components/JobTable.jsx
rm frontend/src/components/JobTable.css
rm frontend/src/components/MarkdownPreview.jsx
rm frontend/src/components/MarkdownPreview.css
```

- [ ] **Step 16: Run TypeScript check**

Run: `cd /Users/antonio/Projects/test/frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 17: Run Vite build**

Run: `cd /Users/antonio/Projects/test/frontend && npx vite build`
Expected: Build succeeds

- [ ] **Step 18: Commit**

```bash
git add frontend/
git commit -m "feat: migrate frontend to TypeScript with context, hooks, and error boundary"
```

---

## Task 4: Docker Compose

**Files:**
- Create: `docker-compose.yml`
- Create: `docker/Dockerfile`
- Create: `frontend/Dockerfile.dev`

- [ ] **Step 1: Create `docker-compose.yml`**

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

- [ ] **Step 2: Create `docker/Dockerfile`**

```dockerfile
FROM python:3.13-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY app.py .

RUN mkdir -p /app/uploads /app/results /app/temp_images

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 3: Create `frontend/Dockerfile.dev`**

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
```

- [ ] **Step 4: Update `.gitignore`** — add `.superpowers/` if not already there

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml docker/Dockerfile frontend/Dockerfile.dev .gitignore
git commit -m "feat: add Docker Compose configuration"
```

---

## Task 5: Frontend Tests

**Files:**
- Create: `frontend/src/api/client.test.ts`
- Create: `frontend/src/components/JobList/JobList.test.tsx`
- Create: `frontend/src/components/UploadForm/UploadForm.test.tsx`
- Create: `frontend/vitest.config.ts`

- [ ] **Step 1: Create `frontend/vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
  },
});
```

- [ ] **Step 2: Create `frontend/src/api/client.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "../types/job";

describe("ApiError", () => {
  it("has status and message", () => {
    const err = new ApiError(404, "Not found");
    expect(err.status).toBe(404);
    expect(err.message).toBe("Not found");
    expect(err.name).toBe("ApiError");
  });
});
```

- [ ] **Step 3: Create `frontend/src/components/JobList/JobList.test.tsx`**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { JobProvider } from "../../context/JobContext";
import JobList from "./JobList";

describe("JobList", () => {
  it("shows empty state when no jobs", () => {
    render(
      <JobProvider>
        <JobList />
      </JobProvider>
    );
    expect(screen.getByText("No documents yet")).toBeDefined();
  });
});
```

- [ ] **Step 4: Create `frontend/src/components/UploadForm/UploadForm.test.tsx`**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { JobProvider } from "../../context/JobContext";
import UploadForm from "./UploadForm";

describe("UploadForm", () => {
  it("renders dropzone", () => {
    render(
      <JobProvider>
        <UploadForm />
      </JobProvider>
    );
    expect(screen.getByText(/Drop PDFs here/)).toBeDefined();
  });
});
```

- [ ] **Step 5: Run frontend tests**

Run: `cd /Users/antonio/Projects/test/frontend && npx vitest run`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add frontend/
git commit -m "test: add frontend test suite"
```

---

## Task 6: CI/CD

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.13"
      - run: pip install -r requirements.txt
      - run: pip install pytest pytest-asyncio httpx
      - run: pytest tests/ -v

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: cd frontend && npm ci
      - run: cd frontend && npx tsc --noEmit
      - run: cd frontend && npx vitest run
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow"
```
