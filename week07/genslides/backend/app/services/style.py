"""风格管理服务：处理风格参考图片的上传、格式校验、自动压缩"""

import io
import logging

from fastapi import UploadFile
from PIL import Image

from app.models.schemas import StyleUploadResponse
from app.storage.styles import StyleStorage

logger = logging.getLogger(__name__)

ALLOWED_FORMATS = {"image/png", "image/jpeg", "image/webp"}
MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10MB
COMPRESS_TARGET_SIZE = 1024  # 压缩后最大边长


class StyleService:
    """风格管理服务"""

    def __init__(self, style_storage: StyleStorage) -> None:
        self.style_storage = style_storage

    async def upload(self, file: UploadFile) -> StyleUploadResponse:
        """上传并处理风格参考图片"""
        if file.content_type not in ALLOWED_FORMATS:
            raise ValueError(
                f"不支持的图片格式: {file.content_type}，仅支持 PNG/JPG/WEBP"
            )

        content = await file.read()
        original_size = len(content)

        image = Image.open(io.BytesIO(content))

        # 自动压缩
        if original_size > MAX_SIZE_BYTES or max(image.size) > 2048:
            image.thumbnail((COMPRESS_TARGET_SIZE, COMPRESS_TARGET_SIZE))
            logger.info("Style image compressed from %dx%d", *image.size)

        url = self.style_storage.save(image)

        # 计算压缩后大小
        buf = io.BytesIO()
        image.save(buf, format="PNG")
        compressed_size = buf.tell()

        logger.info(
            "Style image uploaded: original=%d bytes, compressed=%d bytes",
            original_size,
            compressed_size,
        )

        return StyleUploadResponse(
            style_image_url=url,
            original_size=original_size,
            compressed_size=compressed_size,
        )
