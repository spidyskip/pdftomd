from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.dependencies import get_ollama
from app.routes.health import router as health_router
from app.routes.jobs import router as jobs_router
from app.mcp_server import mcp

@asynccontextmanager
async def lifespan(app: FastAPI):
    ollama = get_ollama()
    if settings.auto_pull_model:
        try:
            await ollama.ensure_model()
        except Exception:
            pass
    yield

def create_app() -> FastAPI:
    settings.upload_dir.mkdir(exist_ok=True)
    settings.result_dir.mkdir(exist_ok=True)
    settings.temp_image_dir.mkdir(exist_ok=True)

    app = FastAPI(title="PDF to Markdown OCR", version="2.0.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health_router, prefix="/api")
    app.include_router(jobs_router, prefix="/api/jobs")

    # Mount MCP server at /mcp endpoint
    app.mount("/mcp", mcp.sse_app())

    return app
