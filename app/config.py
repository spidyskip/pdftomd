from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from pathlib import Path
from enum import Enum


class OcrBackend(str, Enum):
    OLLAMA = "ollama"
    MLX = "mlx"


class Settings(BaseSettings):
    model_config = ConfigDict(env_prefix="")

    # OCR backend selection: "ollama" or "mlx"
    ocr_backend: OcrBackend = OcrBackend.MLX

    # Ollama settings
    ollama_url: str = "http://localhost:11434"
    model_name: str = "glm-ocr"
    auto_pull_model: bool = True

    # MLX settings
    mlx_url: str = "http://localhost:8081"
    mlx_model: str = "mlx-community/GLM-OCR-bf16"

    # General
    upload_dir: Path = Path("uploads")
    result_dir: Path = Path("results")
    temp_image_dir: Path = Path("temp_images")
    max_file_size: int = 50 * 1024 * 1024

settings = Settings()
