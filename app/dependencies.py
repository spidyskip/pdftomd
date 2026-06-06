from app.config import settings
from app.services.storage import InMemoryJobStore, JobStore
from app.services.ollama import OllamaClient

_store: JobStore = InMemoryJobStore()
_ollama: OllamaClient = OllamaClient()

def get_store() -> JobStore:
    return _store

def get_ollama() -> OllamaClient:
    return _ollama
