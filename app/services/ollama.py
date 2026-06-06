import base64
from pathlib import Path
import httpx
from app.config import settings

class OllamaError(Exception):
    pass

class OllamaClient:
    def __init__(self, base_url: str = None, model: str = None):
        self.base_url = (base_url or settings.ollama_url).rstrip("/")
        self.model = model or settings.model_name

    async def health_check(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                r = await client.get(f"{self.base_url}/api/tags")
                return r.status_code == 200
        except Exception:
            return False

    async def is_model_loaded(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                r = await client.get(f"{self.base_url}/api/tags")
                if r.status_code != 200:
                    return False
                names = [m["name"] for m in r.json().get("models", [])]
                return any(self.model in n for n in names)
        except Exception:
            return False

    async def ensure_model(self) -> bool:
        if await self.is_model_loaded():
            return True
        if not settings.auto_pull_model:
            return False
        try:
            async with httpx.AsyncClient(timeout=600.0) as client:
                r = await client.post(
                    f"{self.base_url}/api/pull",
                    json={"name": self.model, "stream": False},
                )
                return r.status_code == 200
        except Exception as e:
            raise OllamaError(f"Failed to pull model: {e}")

    async def ocr_image(self, image_path: Path) -> str:
        b64 = base64.b64encode(image_path.read_bytes()).decode()
        payload = {
            "model": self.model,
            "prompt": (
                "Extract all text from this image and format it as structured markdown. "
                "Preserve tables, headings, lists, and code blocks."
            ),
            "images": [b64],
            "stream": False,
        }
        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                r = await client.post(
                    f"{self.base_url}/api/generate",
                    json=payload,
                )
                if r.status_code != 200:
                    raise OllamaError(f"Ollama returned {r.status_code}: {r.text[:200]}")
                return r.json().get("response", "").strip()
        except httpx.TimeoutException:
            raise OllamaError(
                "Ollama timed out after 300s. "
                "The model may be too large for your hardware or Ollama is overloaded."
            )
        except httpx.ConnectError:
            raise OllamaError(
                f"Cannot connect to Ollama at {self.base_url}. "
                "Make sure Ollama is running."
            )
        except httpx.HTTPStatusError as e:
            raise OllamaError(f"Ollama HTTP error: {e.response.status_code}")
