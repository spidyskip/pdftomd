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
