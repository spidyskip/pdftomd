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
