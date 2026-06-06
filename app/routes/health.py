from fastapi import APIRouter
from app.models.job import HealthResponse
from app.dependencies import get_ocr_client
from app.config import settings, OcrBackend

router = APIRouter()


@router.get("/health")
async def health():
    client = get_ocr_client()
    available = await client.health_check()
    loaded = await client.is_model_loaded()
    return {
        "available": available,
        "model": client.model,
        "model_loaded": loaded,
        "backend": settings.ocr_backend.value,
    }


@router.get("/backend")
async def get_backend():
    return {
        "backend": settings.ocr_backend.value,
        "ollama_url": settings.ollama_url,
        "mlx_url": settings.mlx_url,
        "mlx_model": settings.mlx_model,
    }


from pydantic import BaseModel


class BackendSwitchRequest(BaseModel):
    backend: str


@router.post("/backend")
async def switch_backend(req: BackendSwitchRequest):
    try:
        new_backend = OcrBackend(req.backend)
    except ValueError:
        return {"error": f"Invalid backend: {req.backend}. Use 'ollama' or 'mlx'."}

    settings.ocr_backend = new_backend
    client = get_ocr_client()
    return {
        "backend": settings.ocr_backend.value,
        "status": "switched",
        "model": client.model,
    }
