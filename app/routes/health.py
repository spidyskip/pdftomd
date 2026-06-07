from fastapi import APIRouter
from app.dependencies import get_ocr_client, get_ollama, get_mlx, get_markitdown
from app.config import settings, OcrBackend

router = APIRouter()


@router.get("/health")
async def health():
    """Check health of the active OCR backend."""
    client = get_ocr_client()
    available = await client.health_check()
    loaded = await client.is_model_loaded()
    ocr_available = client.has_ocr() if hasattr(client, "has_ocr") else loaded
    return {
        "available": available,
        "model": getattr(client, "model", None) or getattr(client, "cli_path", None),
        "model_loaded": loaded,
        "ocr_available": ocr_available,
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

    markitdown = get_markitdown()
    markitdown_avail = await markitdown.health_check()
    markitdown_loaded = await markitdown.is_model_loaded() if markitdown_avail else False
    markitdown_ocr = markitdown.has_ocr() if markitdown_avail else False

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
        "markitdown": {
            "available": markitdown_avail,
            "model_loaded": markitdown_loaded,
            "ocr_available": markitdown_ocr,
            "path": settings.markitdown_cli,
        },
    }


@router.get("/backend")
async def get_backend():
    return {
        "backend": settings.ocr_backend.value,
        "ollama_url": settings.ollama_url,
        "mlx_url": settings.mlx_url,
        "mlx_model": settings.mlx_model,
        "markitdown_path": settings.markitdown_cli,
    }


from pydantic import BaseModel


class BackendSwitchRequest(BaseModel):
    backend: str


@router.post("/backend")
async def switch_backend(req: BackendSwitchRequest):
    try:
        new_backend = OcrBackend(req.backend)
    except ValueError:
        return {"error": f"Invalid backend: {req.backend}. Use 'ollama', 'mlx', or 'markitdown'."}

    settings.ocr_backend = new_backend
    client = get_ocr_client()
    response = {
        "backend": settings.ocr_backend.value,
        "status": "switched",
    }
    if hasattr(client, "model"):
        response["model"] = client.model
    elif hasattr(client, "cli_path"):
        response["model"] = client.cli_path
    return response


class BackendCheckRequest(BaseModel):
    url: str


@router.post("/backend/check")
async def check_backend(req: BackendCheckRequest):
    """Server-side check of an arbitrary backend URL (avoids CORS on the client).

    Returns availability for both Ollama-style and MLX-style endpoints discovered at the URL.
    """
    url = req.url.rstrip("/")
    # Instantiate lightweight clients pointing at the provided URL
    from app.services.ollama import OllamaClient
    from app.services.mlx import MlxClient
    ollama = OllamaClient(base_url=url)
    mlx = MlxClient(base_url=url)

    # Run checks in parallel
    import asyncio

    async def check_ollama():
        try:
            avail = await ollama.health_check()
            loaded = await ollama.is_model_loaded() if avail else False
            return {"available": avail, "model_loaded": loaded}
        except Exception:
            return {"available": False, "model_loaded": False}

    async def check_mlx():
        try:
            avail = await mlx.health_check()
            loaded = await mlx.is_model_loaded() if avail else False
            return {"available": avail, "model_loaded": loaded}
        except Exception:
            return {"available": False, "model_loaded": False}

    ollama_res, mlx_res = await asyncio.gather(check_ollama(), check_mlx())

    return {
        "url": url,
        "ollama": ollama_res,
        "mlx": mlx_res,
        "reachable": ollama_res["available"] or mlx_res["available"],
    }


class BackendUrlRequest(BaseModel):
    backend: str
    url: str


@router.post("/backend/url")
async def set_backend_url(req: BackendUrlRequest):
    """Set the configured URL for an engine (ollama or mlx)."""
    b = req.backend.lower()
    if b not in ("ollama", "mlx"):
        return {"error": "backend must be 'ollama' or 'mlx'"}
    if b == "ollama":
        settings.ollama_url = req.url.rstrip("/")
    else:
        settings.mlx_url = req.url.rstrip("/")
    return {"backend": b, "url": req.url}
