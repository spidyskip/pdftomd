import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock, AsyncMock
from app.models.job import JobStatus, JobResponse
from app.services.storage import InMemoryJobStore
from app.services.ollama import OllamaClient
from app.worker import process_job

@pytest.mark.asyncio
async def test_process_job_ollama_unavailable():
    store = InMemoryJobStore()
    job = JobResponse(
        id="test123", filename="test.pdf", status=JobStatus.QUEUED,
        progress=0, status_text="Waiting", page_count=None, error=None, created="2024-01-01",
    )
    await store.create(job)

    ollama = MagicMock(spec=OllamaClient)
    ollama.ensure_model = AsyncMock(side_effect=Exception("Ollama unreachable"))
    ollama.health_check = AsyncMock(return_value=False)
    ollama.is_model_loaded = AsyncMock(return_value=False)
    ollama.ocr_image = AsyncMock(return_value="test")
    ollama.model = "test-model"

    pdf_path = Path("/tmp/fake.pdf")
    pdf_path.write_bytes(b"fake")

    # Mock pdf_to_images to avoid needing a real PDF
    with patch("app.worker.pdf_to_images", return_value=[Path("/tmp/fake.png")]):
        await process_job("test123", pdf_path, store, ollama)

    result = await store.get("test123")
    assert result.status == JobStatus.FAILED
    assert "Ollama unreachable" in result.error
