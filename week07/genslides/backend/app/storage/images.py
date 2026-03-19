"""生成图片存储：保存/读取生成的 Slide 图片"""

from pathlib import Path

from PIL import Image


class ImageStorage:
    """生成图片存储"""

    def __init__(self, output_dir: str = "output") -> None:
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def save(self, slide_id: int, image: Image.Image) -> str:
        """保存生成的图片，返回访问 URL"""
        filename = f"slide_{slide_id:03d}.png"
        filepath = self.output_dir / filename
        image.save(filepath, format="PNG")
        return f"/api/slides/{slide_id}/image"

    def load(self, slide_id: int) -> Path:
        """加载图片文件路径"""
        filepath = self.output_dir / f"slide_{slide_id:03d}.png"
        if not filepath.exists():
            raise FileNotFoundError(f"Slide {slide_id} image not found")
        return filepath

    def exists(self, slide_id: int) -> bool:
        """检查图片是否存在"""
        return (self.output_dir / f"slide_{slide_id:03d}.png").exists()
