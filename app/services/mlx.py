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
                r = await client.get(f"{self.base_url}/v1/models")
                if r.status_code == 200:
                    return True
                # If the models endpoint is unavailable, fallback to a light completion probe
                if r.status_code == 404:
                    r = await client.post(
                        f"{self.base_url}/v1/chat/completions",
                        json={
                            "model": self.model,
                            "messages": [{"role": "user", "content": [{"type": "text", "text": "hi"}]}],
                            "max_tokens": 1,
                        },
                        timeout=5.0,
                    )
                    return r.status_code == 200
                return False
        except (httpx.ConnectError, httpx.TimeoutException):
            return False
        except Exception:
            return False
 
    async def is_model_loaded(self) -> bool:
        """Check if the MLX model is loaded by querying available models or using a minimal inference request."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.get(f"{self.base_url}/v1/models")
                if r.status_code == 200:
                    data = r.json()
                    model_ids = []
                    if isinstance(data, dict):
                        model_ids = [m.get("id") for m in data.get("data", []) if isinstance(m, dict)]
                    return self.model in model_ids
                if r.status_code == 404:
                    r = await client.post(
                        f"{self.base_url}/v1/chat/completions",
                        json={
                            "model": self.model,
                            "messages": [{"role": "user", "content": [{"type": "text", "text": "hi"}]}],
                            "max_tokens": 1,
                        },
                        timeout=10.0,
                    )
                    if r.status_code == 200:
                        data = r.json()
                        return "choices" in data and len(data.get("choices", [])) > 0
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
                    f"{self.base_url}/v1/chat/completions",
                    json=payload,
                )
                # store raw response text for diagnostics
                try:
                    self._last_raw = r.text
                except Exception:
                    self._last_raw = None
                if r.status_code == 500:
                    detail = r.text[:300]
                    if "TypeError" in detail or "RuntimeError" in detail:
                        raise MlxError(
                            f"MLX server error (image processing failed). "
                            f"mlx_vlm.server --trust-remote-code --port 8080. "
                            f"Detail: {detail}"
                        )
                    raise MlxError(f"MLX server returned 500: {detail}")
                if r.status_code != 200:
                    # capture non-200 body for diagnostics
                    try:
                        self._last_raw = r.text
                    except Exception:
                        pass
                    raise MlxError(f"MLX server returned {r.status_code}: {r.text[:200]}")
                data = r.json()
                out = data["choices"][0]["message"]["content"].strip()
                # also attach last_raw if available for debugging (consumer may inspect client._last_raw)
                return out
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
