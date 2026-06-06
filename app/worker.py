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
        await store.update(job_id, status_text="Checking model…")
        try:
            ollama.ensure_model()
        except OllamaError as e:
            await store.update(job_id, status=JobStatus.FAILED, error=str(e))
            return

        await store.update(job_id, status_text="Converting PDF to images…")
        temp_dir = settings.temp_image_dir / job_id
        images = await asyncio.to_thread(pdf_to_images, str(pdf_path), temp_dir)
        total = len(images)
        await store.update(job_id, page_count=total)

        pages = []
        for i, img_path in enumerate(images):
            await store.update(
                job_id,
                status_text=f"OCR page {i + 1}/{total}",
                progress=int((i + 1) / total * 100),
            )
            text = ollama.ocr_image(img_path)
            pages.append(f"## Page {i + 1}\n\n{text}")

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
