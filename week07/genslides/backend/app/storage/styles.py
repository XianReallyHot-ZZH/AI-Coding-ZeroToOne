"""风格参考图片存储：保存/读取用户上传的风格参考图"""

from pathlib import Path
from typing import Optional

from PIL import Image


class StyleStorage:
    """风格参考图片存储"""

    def __init__(self, styles_dir: str = "styles") -> None:
        self.styles_dir = Path(styles_dir)
        self.styles_dir.mkdir(parents=True, exist_ok=True)
        self.current_file = self.styles_dir / "current_style.png"

    def save(self, image: Image.Image) -> str:
        """保存风格参考图片，返回访问 URL"""
        image.save(self.current_file, format="PNG")
        return "/api/style/current"

    def load_current(self) -> Optional[Image.Image]:
        """加载当前风格参考图片"""
        if self.current_file.exists():
            return Image.open(self.current_file)
        return None
