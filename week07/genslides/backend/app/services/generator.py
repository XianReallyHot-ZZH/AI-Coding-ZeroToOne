"""图片生成服务：调用 Gemini 图片生成能力，支持并发控制和 SSE 进度推送"""

import asyncio
import io
import logging
from typing import AsyncGenerator, Optional

from google import genai
from google.genai import types
from PIL import Image

from app.models.schemas import Resolution, SlideItem, SSEProgressEvent
from app.storage.images import ImageStorage
from app.storage.styles import StyleStorage

logger = logging.getLogger(__name__)

IMAGE_PROMPT_TEMPLATE = """Generate a presentation slide image in 16:9 aspect ratio ({resolution}).

Title: '{title}'
Key points: {points}
Layout hint: {prompt_hint}

Visual style: {style_description}
IMPORTANT: Match the reference image style exactly. Keep text minimal and readable.
The slide should look professional and visually consistent with other slides in the deck."""


class GeneratorService:
    """图片生成服务"""

    def __init__(
        self,
        client: genai.Client,
        image_storage: ImageStorage,
        style_storage: StyleStorage,
        max_concurrent: int = 3,
    ) -> None:
        self.client = client
        self.image_storage = image_storage
        self.style_storage = style_storage
        self.semaphore = asyncio.Semaphore(max_concurrent)

    async def generate_all(
        self,
        slides: list[SlideItem],
        style_description: str,
        resolution: Resolution,
    ) -> AsyncGenerator[SSEProgressEvent, None]:
        """批量生成所有 Slide 图片，通过 SSE 推送进度"""
        total = len(slides)
        style_image = self.style_storage.load_current()

        tasks = [
            asyncio.create_task(
                self._generate_with_progress(
                    slide, style_description, style_image, resolution, total
                )
            )
            for slide in slides
        ]

        for coro in asyncio.as_completed(tasks):
            events = await coro
            for event in events:
                yield event

    async def _generate_with_progress(
        self,
        slide: SlideItem,
        style_description: str,
        style_image: Optional[Image.Image],
        resolution: Resolution,
        total: int,
    ) -> list[SSEProgressEvent]:
        """生成单页并返回进度事件列表"""
        events: list[SSEProgressEvent] = []
        async with self.semaphore:
            events.append(SSEProgressEvent(
                slide_id=slide.id,
                status="generating",
                progress=f"{slide.id}/{total}",
            ))
            try:
                logger.info("Generating slide %d/%d", slide.id, total)
                image_url = await self._generate_single(
                    slide, style_description, style_image, resolution
                )
                events.append(SSEProgressEvent(
                    slide_id=slide.id,
                    status="done",
                    image_url=image_url,
                    progress=f"{slide.id}/{total}",
                ))
                logger.info("Slide %d done", slide.id)
            except Exception as e:
                logger.error("Slide %d generation failed: %s", slide.id, str(e))
                events.append(SSEProgressEvent(
                    slide_id=slide.id,
                    status="error",
                    error=str(e),
                    progress=f"{slide.id}/{total}",
                ))
        return events

    async def _generate_single(
        self,
        slide: SlideItem,
        style_description: str,
        style_image: Optional[Image.Image],
        resolution: Resolution,
    ) -> str:
        """调用 Gemini API 生成单页图片"""
        prompt = IMAGE_PROMPT_TEMPLATE.format(
            resolution=resolution.value,
            title=slide.title,
            points=", ".join(slide.points),
            prompt_hint=slide.prompt_hint,
            style_description=style_description or "professional, clean, modern",
        )

        contents: list[types.Part] = []
        if style_image:
            contents.append(types.Part.from_image(style_image))
        contents.append(types.Part.from_text(prompt))

        response = await asyncio.to_thread(
            self.client.models.generate_content,
            model="gemini-3-pro-image-preview",
            contents=contents,
            config=types.GenerateContentConfig(
                response_modalities=["TEXT", "IMAGE"],
            ),
        )

        # 提取生成的图片
        for part in response.candidates[0].content.parts:
            if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                image = Image.open(io.BytesIO(part.inline_data.data))
                return self.image_storage.save(slide.id, image)

        raise RuntimeError(f"Slide {slide.id}: No image in API response")

    async def regenerate_single(
        self,
        slide: SlideItem,
        style_description: str,
        resolution: Resolution,
    ) -> SlideItem:
        """重新生成单页 Slide 图片"""
        style_image = self.style_storage.load_current()
        image_url = await self._generate_single(
            slide, style_description, style_image, resolution
        )
        slide.image_url = image_url
        slide.status = "done"
        return slide
