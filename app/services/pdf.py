import subprocess
from pathlib import Path
from typing import List

def pdf_to_images(pdf_path: str, output_dir: Path) -> List[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    stem = Path(pdf_path).stem
    subprocess.run(
        ["pdftoppm", "-png", "-r", "300", pdf_path, str(output_dir / stem)],
        check=True,
        capture_output=True,
    )
    return sorted(output_dir.glob(f"{stem}-*.png"))
