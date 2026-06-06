from app.config import settings, OcrBackend
from app.services.storage import FileJobStore, JobStore
from app.services.ollama import OllamaClient
from app.services.mlx import MlxClient

_store: JobStore = FileJobStore()
_ollama: OllamaClient = OllamaClient()
_mlx: MlxClient = MlxClient()


def get_store() -> JobStore:
    return _store


def get_ollama() -> OllamaClient:
    return _ollama


def get_mlx() -> MlxClient:
    return _mlx


def get_ocr_client():
    """Return the active OCR client based on config."""
    if settings.ocr_backend == OcrBackend.MLX:
        return get_mlx()
    return get_ollama()
