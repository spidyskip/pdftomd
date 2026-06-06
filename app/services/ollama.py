import base64
import requests
from pathlib import Path
from app.config import settings

class OllamaError(Exception):
    pass

class OllamaClient:
    def __init__(self, base_url: str = None, model: str = None):
        self.base_url = base_url or settings.ollama_url
        self.model = model or settings.model_name

    def health_check(self) -> bool:
        try:
            r = requests.get(f"{self.base_url}/api/tags", timeout=5)
            return r.status_code == 200
        except Exception:
            return False

    def is_model_loaded(self) -> bool:
        try:
            r = requests.get(f"{self.base_url}/api/tags", timeout=5)
            if r.status_code != 200:
                return False
            names = [m["name"] for m in r.json().get("models", [])]
            return any(self.model in n for n in names)
        except Exception:
            return False

    def ensure_model(self) -> bool:
        if self.is_model_loaded():
            return True
        if not settings.auto_pull_model:
            return False
        try:
            r = requests.post(
                f"{self.base_url}/api/pull",
                json={"name": self.model, "stream": False},
                timeout=600,
            )
            return r.status_code == 200
        except Exception as e:
            raise OllamaError(f"Failed to pull model: {e}")

    def ocr_image(self, image_path: Path) -> str:
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
            r = requests.post(
                f"{self.base_url}/api/generate",
                json=payload,
                timeout=300,
            )
            if r.status_code != 200:
                raise OllamaError(f"Ollama returned {r.status_code}: {r.text[:200]}")
            return r.json().get("response", "").strip()
        except requests.Timeout:
            raise OllamaError(
                "Ollama timed out after 300s. "
                "The model may be too large for your hardware."
            )
        except requests.ConnectionError:
            raise OllamaError(
                "Cannot connect to Ollama. Make sure Ollama is running."
            )
