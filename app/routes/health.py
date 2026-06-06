from fastapi import APIRouter
from app.models.job import HealthResponse
from app.dependencies import get_ollama

router = APIRouter()

@router.get("/health", response_model=HealthResponse)
async def health():
    ollama = get_ollama()
    return HealthResponse(
        ollama_available=await ollama.health_check(),
        model=ollama.model,
        model_loaded=await ollama.is_model_loaded(),
    )
