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
