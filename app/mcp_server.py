"""
MCP (Model Context Protocol) server for PDF to Markdown OCR.
Exposes tools for AI agents to upload PDFs, check status, and retrieve results.
"""

from mcp.server.fastmcp import FastMCP
from app.dependencies import get_store, get_ollama
from app.models.job import JobResponse, JobStatus
from app.worker import process_job
from app.config import settings
from pathlib import Path
import uuid
import tempfile

mcp = FastMCP("pdf-to-markdown")


@mcp.tool()
async def upload_pdf(file_path: str) -> str:
    """Upload a PDF file for OCR conversion to Markdown.

    Args:
        file_path: Absolute path to the PDF file on the server filesystem.

    Returns:
        JSON string with job_id, status, and message.
    """
    path = Path(file_path)
    if not path.exists():
        return f"Error: File not found at {file_path}"
    if not path.suffix.lower() == ".pdf":
        return f"Error: File must be a PDF, got {path.suffix}"

    job_id = str(uuid.uuid4())[:8]
    save_path = settings.upload_dir / f"{job_id}_{path.name}"
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    save_path.write_bytes(path.read_bytes())

    job = JobResponse(
        id=job_id,
        filename=path.name,
        status=JobStatus.QUEUED,
        progress=0,
        status_text="Waiting",
        page_count=None,
        error=None        ,
        created="",
    )

    store = get_store()
    await store.create(job)

    # Start processing in background
    ollama = get_ollama()
    import asyncio
    asyncio.create_task(process_job(job_id, save_path, store, ollama))

    return f'{{"job_id": "{job_id}", "status": "queued", "filename": "{path.name}"}}'


@mcp.tool()
async def get_job_status(job_id: str) -> str:
    """Get the status of a conversion job.

    Args:
        job_id: The job ID returned by upload_pdf.

    Returns:
        JSON string with job status, progress, and result info.
    """
    store = get_store()
    job = await store.get(job_id)
    if not job:
        return f"Error: Job {job_id} not found"

    result = f'{{"job_id": "{job.id}", "filename": "{job.filename}", "status": "{job.status.value}", "progress": {job.progress}, "status_text": "{job.status_text}", "page_count": {job.page_count or "null"}, "error": "{job.error or ""}"}}'
    return result


@mcp.tool()
async def get_result(job_id: str) -> str:
    """Get the Markdown result of a completed conversion.

    Args:
        job_id: The job ID returned by upload_pdf.

    Returns:
        The full Markdown text of the converted PDF.
    """
    store = get_store()
    job = await store.get(job_id)
    if not job:
        return f"Error: Job {job_id} not found"
    if job.status != JobStatus.FINISHED:
        return f"Error: Job is not finished yet. Current status: {job.status.value}"

    out_path = settings.result_dir / f"{job_id}.md"
    if not out_path.exists():
        return f"Error: Result file not found"

    return out_path.read_text(encoding="utf-8")


@mcp.tool()
async def list_jobs() -> str:
    """List all conversion jobs.

    Returns:
        JSON array of all jobs with their status.
    """
    store = get_store()
    jobs = await store.list_all()
    if not jobs:
        return "[]"

    items = []
    for j in jobs:
        items.append(
            f'{{"job_id": "{j.id}", "filename": "{j.filename}", '
            f'"status": "{j.status.value}", "progress": {j.progress}, '
            f'"page_count": {j.page_count or "null"}}}'
        )
    return "[" + ", ".join(items) + "]"


@mcp.tool()
async def delete_job(job_id: str) -> str:
    """Delete a conversion job and its associated files.

    Args:
        job_id: The job ID to delete.

    Returns:
        Confirmation message.
    """
    store = get_store()
    job = await store.get(job_id)
    if not job:
        return f"Error: Job {job_id} not found"

    for p in settings.upload_dir.glob(f"{job_id}_*"):
        p.unlink(missing_ok=True)
    (settings.result_dir / f"{job_id}.md").unlink(missing_ok=True)
    await store.delete(job_id)
    return f'{{"deleted": "{job_id}"}}'


@mcp.tool()
async def ollama_health() -> str:
    """Check Ollama connectivity and model status.

    Returns:
        JSON with ollama_available, model name, and model_loaded status.
    """
    ollama = get_ollama()
    available = await ollama.health_check()
    loaded = await ollama.is_model_loaded() if available else False
    return f'{{"ollama_available": {str(available).lower()}, "model": "{ollama.model}", "model_loaded": {str(loaded).lower()}}}'
