import asyncio
import json
from abc import ABC, abstractmethod
from pathlib import Path
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


class FileJobStore(JobStore):
    """Persistent job store that saves jobs to disk as JSON."""

    def __init__(self, data_dir: str = "data"):
        self._data_dir = Path(data_dir)
        self._data_dir.mkdir(parents=True, exist_ok=True)
        self._jobs_file = self._data_dir / "jobs.json"
        self._jobs: dict[str, JobResponse] = {}
        self._lock = asyncio.Lock()
        self._load()

    def _load(self):
        if self._jobs_file.exists():
            try:
                data = json.loads(self._jobs_file.read_text(encoding="utf-8"))
                for job_data in data:
                    try:
                        job = JobResponse(**job_data)
                        self._jobs[job.id] = job
                    except Exception:
                        pass
            except Exception:
                self._jobs = {}

    def _save(self):
        data = [job.model_dump() for job in self._jobs.values()]
        self._jobs_file.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")

    async def create(self, job: JobResponse) -> JobResponse:
        async with self._lock:
            self._jobs[job.id] = job
            self._save()
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
                self._save()

    async def delete(self, job_id: str) -> None:
        async with self._lock:
            if job_id in self._jobs:
                del self._jobs[job_id]
                self._save()
