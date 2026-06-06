import pytest
import pytest_asyncio
from unittest.mock import patch, MagicMock, AsyncMock
from httpx import AsyncClient, ASGITransport
from app.main import create_app
from app.services.storage import InMemoryJobStore
from app.services.ollama import OllamaClient

@pytest.fixture
def store():
    return InMemoryJobStore()

@pytest.fixture
def mock_ollama():
    m = MagicMock(spec=OllamaClient)
    m.health_check = AsyncMock(return_value=True)
    m.is_model_loaded = AsyncMock(return_value=True)
    m.ensure_model = AsyncMock(return_value=True)
    m.ocr_image = AsyncMock(return_value="# Page 1\n\nTest content")
    m.model = "test-model"
    return m

@pytest.fixture
def app(store, mock_ollama):
    application = create_app()
    application.dependency_overrides.clear()

    # Patch get_store and get_ocr_client in the modules where routes import them
    with patch("app.routes.jobs.get_store", return_value=store), \
         patch("app.routes.jobs.get_ocr_client", return_value=mock_ollama), \
         patch("app.routes.health.get_ocr_client", return_value=mock_ollama), \
         patch("app.dependencies.get_store", return_value=store), \
         patch("app.dependencies.get_ollama", return_value=mock_ollama), \
         patch("app.dependencies.get_mlx", return_value=mock_ollama), \
         patch("app.dependencies.get_ocr_client", return_value=mock_ollama):
        yield application

@pytest_asyncio.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
