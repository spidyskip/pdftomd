"""
MLX OCR client for Apple Silicon.
Connects to an mlx-vlm server running on localhost:8080 (OpenAI-compatible API).
"""

import base64
from pathlib import Path
import httpx
from app.config import settings


class MlxError(Exception):
    pass


class MlxClient:
    def __init__(self, base_url: str = None, model: str = None):
        self.base_url = (base_url or settings.mlx_url).rstrip("/")
        self.model = model or settings.mlx_model

    async def health_check(self) -> bool:
        """Check if the mlx-vlm server is reachable."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                # Try a minimal POST to /chat/completions — mlx-vlm responds even to short requests
                r = await client.post(
                    f"{self.base_url}/chat/completions",
                    json={
                        "model": self.model,
                        "messages": [{"role": "user", "content": [{"type": "text", "text": "hi"}]}],
                        "max_tokens": 1,
                    },
                    timeout=5.0,
                )
                return r.status_code == 200
        except (httpx.ConnectError, httpx.TimeoutException):
            return False
        except Exception:
            # Any other error (e.g., model not found) still means server is up
            return True

    async def is_model_loaded(self) -> bool:
        """Check if the MLX model is loaded by making a minimal inference request."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.post(
                    f"{self.base_url}/chat/completions",
                    json={
                        "model": self.model,
                        "messages": [{"role": "user", "content": [{"type": "text", "text": "hi"}]}],
                        "max_tokens": 1,
                    },
                    timeout=10.0,
                )
                if r.status_code == 200:
                    data = r.json()
                    return "choices" in data and len(data["choices"]) > 0
                return False
        except Exception:
            return False

    async def ensure_model(self) -> bool:
        """MLX model is loaded when the server starts — just verify it's responsive."""
        return await self.is_model_loaded()

    async def ocr_image(self, image_path: Path) -> str:
        b64 = base64.b64encode(image_path.read_bytes()).decode()
        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/png;base64,{b64}"},
                        },
                        {
                            "type": "text",
                            "text": (
                                "Extract all text from this image and format it as structured markdown. "
                                "Preserve tables, headings, lists, and code blocks."
                            ),
                        },
                    ],
                }
            ],
            "max_tokens": 4096,
        }
        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                r = await client.post(
                    f"{self.base_url}/chat/completions",
                    json=payload,
                )
                if r.status_code != 200:
                    raise MlxError(f"MLX server returned {r.status_code}: {r.text[:200]}")
                data = r.json()
                return data["choices"][0]["message"]["content"].strip()
        except httpx.TimeoutException:
            raise MlxError(
                "MLX server timed out after 300s. "
                "The model may be too large for your hardware."
            )
        except httpx.ConnectError:
            raise MlxError(
                f"Cannot connect to MLX server at {self.base_url}. "
                "Make sure mlx-vlm is running: mlx_vlm.server --trust-remote-code"
            )
        except (KeyError, IndexError) as e:
            raise MlxError(f"Unexpected MLX response format: {e}")
