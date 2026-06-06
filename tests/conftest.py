import pytest
import pytest_asyncio
from unittest.mock import patch, MagicMock
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
    m.health_check.return_value = True
    m.is_model_loaded.return_value = True
    m.model = "test-model"
    m.ensure_model.return_value = None
    return m

@pytest.fixture
def app(store, mock_ollama):
    application = create_app()
    application.dependency_overrides.clear()

    # Patch get_store and get_ollama in the modules where routes import them
    with patch("app.routes.jobs.get_store", return_value=store), \
         patch("app.routes.jobs.get_ollama", return_value=mock_ollama), \
         patch("app.routes.health.get_ollama", return_value=mock_ollama), \
         patch("app.dependencies.get_store", return_value=store), \
         patch("app.dependencies.get_ollama", return_value=mock_ollama):
        yield application

@pytest_asyncio.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
