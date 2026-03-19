"""内容拆分服务：调用 Gemini 文本能力将用户输入拆分为多页 Slide 结构"""

import asyncio
import json
import logging

from google import genai
from google.genai import types

from app.models.schemas import SlideItem, SplitRequest, SplitResponse

logger = logging.getLogger(__name__)

SPLIT_PROMPT_TEMPLATE = """你是一个专业的演示文稿策划师。请将以下内容拆分为 {slide_count} 页 Slide。

## 输入内容
{content}

## 视觉风格参考
{style_description}

## 输出要求
返回 JSON 数组，每个元素包含：
- id: 页码（从 1 开始）
- title: 该页标题（简洁有力，不超过 15 字）
- points: 要点列表（2-4 个要点，每个不超过 20 字）
- prompt_hint: 图片生成的布局提示（如"封面页，大标题居中"、"列表页，三个要点配图标"）

第 1 页应为封面页，最后一页应为总结/致谢页。

请直接返回 JSON 数组，不要包含其他内容："""


class SplitterService:
    """内容拆分服务"""

    def __init__(self, client: genai.Client) -> None:
        self.client = client

    async def split(self, request: SplitRequest) -> SplitResponse:
        """将输入内容拆分为多页 Slide 结构"""
        prompt = SPLIT_PROMPT_TEMPLATE.format(
            slide_count=request.slide_count,
            content=request.content,
            style_description=request.style_description or "默认商务简约风格",
        )

        logger.info("Splitting content into %d slides", request.slide_count)

        response = await asyncio.to_thread(
            self.client.models.generate_content,
            model="gemini-2.5-flash",
            contents=[types.Part.from_text(prompt)],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.7,
            ),
        )

        slides_data = json.loads(response.text)
        slides = [SlideItem(**item) for item in slides_data]

        logger.info("Split complete: %d slides generated", len(slides))
        return SplitResponse(slides=slides)
