import asyncio
import shutil
from pathlib import Path
from app.config import settings, OcrBackend
from app.models.job import JobStatus
from app.services.pdf import pdf_to_images
from app.services.storage import JobStore
from app.dependencies import get_ocr_client


async def process_job(job_id: str, pdf_path: Path, store: JobStore, ocr_client=None):
    job = await store.get(job_id)
    if not job:
        return

    client = ocr_client if ocr_client is not None else get_ocr_client()
    backend_label = "MLX" if settings.ocr_backend == OcrBackend.MLX else "Ollama"

    await store.update(job_id, status=JobStatus.PROCESSING, progress=0)

    try:
        await store.update(job_id, status_text=f"Checking {backend_label}…")
        try:
            await client.ensure_model()
        except Exception as e:
            await store.update(job_id, status=JobStatus.FAILED, error=str(e))
            return

        await store.update(job_id, status_text="Converting PDF to images…")
        temp_dir = settings.temp_image_dir / job_id
        images = await asyncio.to_thread(pdf_to_images, str(pdf_path), temp_dir)
        total = len(images)
        await store.update(job_id, page_count=total, status_text="Starting OCR…")

        pages = []
        for i, img_path in enumerate(images):
            page_num = i + 1
            await store.update(
                job_id,
                status_text=f"Extracting text from page {page_num} of {total}",
                progress=int((page_num / total) * 80) + 10,
            )
            text = await client.ocr_image(img_path)
            pages.append(f"## Page {page_num}\n\n{text}")

            # Write partial result so live preview can read it
            partial_md = "\n\n---\n\n".join(pages)
            out_path = settings.result_dir / f"{job_id}.md"
            out_path.write_text(partial_md, encoding="utf-8")

            await store.update(
                job_id,
                status_text=f"Page {page_num} of {total} extracted",
                progress=int(((page_num + 0.5) / total) * 80) + 10,
            )

        await store.update(
            job_id,
            status=JobStatus.FINISHED,
            progress=100,
            status_text="Done",
        )

    except Exception as exc:
        await store.update(job_id, status=JobStatus.FAILED, error=str(exc))

    finally:
        if 'temp_dir' in locals():
            shutil.rmtree(temp_dir, ignore_errors=True)
