"""
FastAPI backend for PDF to Markdown OCR using GLM-OCR via Ollama.
"""

import os
import re
import uuid
import base64
import shutil
import subprocess
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime

import requests
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
MODEL_NAME = os.environ.get("MODEL_NAME", "glm-ocr")
UPLOAD_DIR = Path("uploads")
RESULT_DIR = Path("results")
TEMP_IMAGE_DIR = Path("temp_images")

UPLOAD_DIR.mkdir(exist_ok=True)
RESULT_DIR.mkdir(exist_ok=True)
TEMP_IMAGE_DIR.mkdir(exist_ok=True)

# ---------------------------------------------------------------------------
# In-memory job store  (swap for Redis / DB in production)
# ---------------------------------------------------------------------------
jobs: Dict[str, dict] = {}

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(title="PDF → Markdown OCR", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def check_ollama() -> bool:
    """Return True if Ollama is reachable and the model is loaded."""
    try:
        r = requests.get(f"{OLLAMA_URL}/api/tags", timeout=5)
        if r.status_code != 200:
            return False
        names = [m["name"] for m in r.json().get("models", [])]
        return any(MODEL_NAME in n for n in names)
    except Exception:
        return False


def pdf_to_images(pdf_path: str, output_dir: Path) -> List[Path]:
    """Convert every page of *pdf_path* to a 300 dpi PNG."""
    output_dir.mkdir(parents=True, exist_ok=True)
    stem = Path(pdf_path).stem
    subprocess.run(
        ["pdftoppm", "-png", "-r", "300", pdf_path, str(output_dir / stem)],
        check=True,
        capture_output=True,
    )
    return sorted(output_dir.glob(f"{stem}-*.png"))


def image_to_b64(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode()


def ocr_image(b64: str) -> str:
    """Send a base64 image to Ollama GLM-OCR and return the markdown text."""
    payload = {
        "model": MODEL_NAME,
        "prompt": (
            "Extract all text from this image and format it as structured markdown. "
            "Preserve tables, headings, lists, and code blocks."
        ),
        "images": [b64],
        "stream": False,
    }
    r = requests.post(f"{OLLAMA_URL}/api/generate", json=payload, timeout=120)
    if r.status_code != 200:
        raise RuntimeError(f"Ollama error {r.status_code}: {r.text}")
    return r.json().get("response", "").strip()


# ---------------------------------------------------------------------------
# Background worker
# ---------------------------------------------------------------------------
def process_job(job_id: str, pdf_path: Path):
    """Convert PDF → images → OCR → markdown (runs synchronously)."""
    job = jobs[job_id]
    job["status"] = "processing"
    job["progress"] = 0

    try:
        # 1. PDF → PNG
        job["status_text"] = "Converting PDF to images…"
        images = pdf_to_images(str(pdf_path), TEMP_IMAGE_DIR / job_id)
        total = len(images)
        job["page_count"] = total

        # 2. OCR each page
        pages: List[str] = []
        for i, img_path in enumerate(images):
            job["status_text"] = f"OCR page {i + 1}/{total}…"
            b64 = image_to_b64(img_path)
            text = ocr_image(b64)
            pages.append(f"## Page {i + 1}\n\n{text}")
            job["progress"] = int((i + 1) / total * 100)

        # 3. Write result
        md = "\n\n---\n\n".join(pages)
        out_path = RESULT_DIR / f"{job_id}.md"
        out_path.write_text(md, encoding="utf-8")

        job["status"] = "finished"
        job["progress"] = 100
        job["status_text"] = "Done"
        job["result_path"] = str(out_path)

    except Exception as exc:
        job["status"] = "failed"
        job["error"] = str(exc)
        job["status_text"] = f"Failed: {exc}"

    finally:
        # Clean up temp images
        shutil.rmtree(TEMP_IMAGE_DIR / job_id, ignore_errors=True)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/api/health")
def health():
    return {
        "ollama_available": check_ollama(),
        "model": MODEL_NAME,
        "ollama_url": OLLAMA_URL,
    }


@app.post("/api/upload")
async def upload(file: UploadFile = File(...), background_tasks: BackgroundTasks = None):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are accepted")

    job_id = str(uuid.uuid4())[:8]
    save_path = UPLOAD_DIR / f"{job_id}_{file.filename}"
    save_path.write_bytes(await file.read())

    jobs[job_id] = {
        "id": job_id,
        "filename": file.filename,
        "status": "queued",
        "progress": 0,
        "status_text": "Waiting…",
        "page_count": None,
        "error": None,
        "created": datetime.utcnow().isoformat(),
    }

    if background_tasks:
        background_tasks.add_task(process_job, job_id, save_path)
    else:
        process_job(job_id, save_path)

    return JSONResponse(jobs[job_id])


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str):
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")
    return jobs[job_id]


@app.get("/api/jobs")
def list_jobs():
    return list(jobs.values())


@app.get("/api/result/{job_id}", response_class=PlainTextResponse)
def get_result(job_id: str):
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")
    job = jobs[job_id]
    if job["status"] != "finished":
        raise HTTPException(400, "Job not finished yet")
    return Path(job["result_path"]).read_text(encoding="utf-8")


@app.delete("/api/jobs/{job_id}")
def delete_job(job_id: str):
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")
    # Clean up files
    for p in UPLOAD_DIR.glob(f"{job_id}_*"):
        p.unlink(missing_ok=True)
    RESULT_DIR.joinpath(f"{job_id}.md").unlink(missing_ok=True)
    del jobs[job_id]
    return {"deleted": job_id}
