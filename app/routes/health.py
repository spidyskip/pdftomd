from fastapi import APIRouter
from app.dependencies import get_ocr_client, get_ollama, get_mlx
from app.config import settings, OcrBackend

router = APIRouter()


@router.get("/health")
async def health():
    """Check health of the active OCR backend."""
    client = get_ocr_client()
    available = await client.health_check()
    loaded = await client.is_model_loaded()
    return {
        "available": available,
        "model": client.model,
        "model_loaded": loaded,
        "backend": settings.ocr_backend.value,
    }


@router.get("/health/all")
async def health_all():
    """Check health of all OCR backends independently."""
    ollama = get_ollama()
    mlx = get_mlx()

    ollama_avail = await ollama.health_check()
    ollama_loaded = await ollama.is_model_loaded() if ollama_avail else False

    mlx_avail = await mlx.health_check()
    mlx_loaded = await mlx.is_model_loaded() if mlx_avail else False

    return {
        "active": settings.ocr_backend.value,
        "ollama": {
            "available": ollama_avail,
            "model_loaded": ollama_loaded,
            "model": ollama.model,
            "url": settings.ollama_url,
        },
        "mlx": {
            "available": mlx_avail,
            "model_loaded": mlx_loaded,
            "model": mlx.model,
            "url": settings.mlx_url,
        },
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
