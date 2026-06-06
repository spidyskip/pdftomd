from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from pathlib import Path

class Settings(BaseSettings):
    model_config = ConfigDict(env_prefix="")

    ollama_url: str = "http://localhost:11434"
    model_name: str = "glm-ocr"
    auto_pull_model: bool = True
    upload_dir: Path = Path("uploads")
    result_dir: Path = Path("results")
    temp_image_dir: Path = Path("temp_images")
    max_file_size: int = 50 * 1024 * 1024

settings = Settings()
