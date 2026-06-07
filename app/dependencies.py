from app.config import settings, OcrBackend
from app.services.storage import FileJobStore, JobStore
from app.services.ollama import OllamaClient
from app.services.mlx import MlxClient

# Keep a single persistent store, but create fresh client instances on demand
_store: JobStore = FileJobStore()


def get_store() -> JobStore:
    return _store


def get_ollama() -> OllamaClient:
    # Create a new OllamaClient using the current settings so URL changes take effect immediately
    return OllamaClient(base_url=settings.ollama_url)


def get_mlx() -> MlxClient:
    # Create a new MlxClient using the current settings so URL changes take effect immediately
    return MlxClient(base_url=settings.mlx_url)


def get_ocr_client():
    """Return the active OCR client based on current config."""
    if settings.ocr_backend == OcrBackend.MLX:
        return get_mlx()
    return get_ollama()
