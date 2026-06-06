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
