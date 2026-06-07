import asyncio
import importlib
import importlib.util
import shutil
import subprocess
from pathlib import Path
from typing import Any, Optional

from app.config import settings


class MarkitdownError(Exception):
    pass


class MarkitdownClient:
    def __init__(self, cli_path: str = None):
        self.cli_path = (cli_path or settings.markitdown_cli).strip()
        self._module: Optional[Any] = None

    def _load_library(self) -> Optional[Any]:
        if self._module is not None:
            return self._module
        spec = importlib.util.find_spec("markitdown")
        if spec is None:
            self._module = False
            return self._module
        try:
            self._module = importlib.import_module("markitdown")
            return self._module
        except Exception:
            self._module = False
            return self._module

    def _ocr_plugin_available(self) -> bool:
        try:
            spec = importlib.util.find_spec("markitdown_ocr")
            return spec is not None
        except Exception:
            return False

    def _cli_available(self) -> bool:
        return shutil.which(self.cli_path) is not None

    def _cli_works(self) -> bool:
        if not self._cli_available():
            return False
        try:
            proc = subprocess.run(
                [self.cli_path, "--version"],
                capture_output=True,
                text=True,
                timeout=10,
            )
            return proc.returncode == 0
        except Exception:
            return False

    async def health_check(self) -> bool:
        if self._load_library() is not False:
            return True
        return self._cli_works()

    async def is_model_loaded(self) -> bool:
        return await self.health_check()

    def has_ocr(self) -> bool:
        return self._ocr_plugin_available()

    async def ensure_model(self) -> bool:
        return await self.health_check()

    def _convert_pdf_with_library(self, pdf_path: Path) -> str:
        module = self._load_library()
        if module is False or not hasattr(module, "MarkItDown"):
            raise MarkitdownError("Markitdown library is not installed or cannot be imported.")
        try:
            md = module.MarkItDown(enable_plugins=False)
            result = md.convert(str(pdf_path))
            text = getattr(result, "text_content", None) or getattr(result, "markdown", None)
            if text is None:
                raise MarkitdownError("Markitdown conversion did not return markdown content.")
            return text
        except Exception as exc:
            raise MarkitdownError(f"Markitdown conversion failed: {exc}")

    def _convert_pdf_with_cli(self, pdf_path: Path) -> str:
        if shutil.which(self.cli_path) is None:
            raise MarkitdownError(
                f"Markitdown CLI '{self.cli_path}' is not available on PATH."
            )
        try:
            proc = subprocess.run(
                [self.cli_path, str(pdf_path)],
                capture_output=True,
                text=True,
                timeout=600,
            )
            if proc.returncode != 0:
                detail = (proc.stderr or proc.stdout).strip() or "Unknown Markitdown error"
                raise MarkitdownError(f"Markitdown CLI failed: {detail}")
            return proc.stdout
        except subprocess.TimeoutExpired as exc:
            raise MarkitdownError(f"Markitdown CLI timed out: {exc}")
        except Exception as exc:
            raise MarkitdownError(f"Markitdown CLI error: {exc}")

    async def convert_pdf(self, pdf_path: Path) -> str:
        if self._load_library() is not False:
            return await asyncio.to_thread(self._convert_pdf_with_library, pdf_path)
        return await asyncio.to_thread(self._convert_pdf_with_cli, pdf_path)
