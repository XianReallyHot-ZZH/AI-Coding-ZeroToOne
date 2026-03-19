"""依赖注入：服务实例的创建和生命周期管理"""

import os
import logging
from typing import Optional

from google import genai

from app.models.schemas import SlideItem
from app.storage.images import ImageStorage
from app.storage.styles import StyleStorage
from app.services.splitter import SplitterService
from app.services.generator import GeneratorService
from app.services.style import StyleService

logger = logging.getLogger(__name__)

# Singleton instances
_genai_client: Optional[genai.Client] = None
_image_storage: Optional[ImageStorage] = None
_style_storage: Optional[StyleStorage] = None
_splitter: Optional[SplitterService] = None
_generator: Optional[GeneratorService] = None
_style_service: Optional[StyleService] = None
_slide_store: Optional["SlideStore"] = None


class SlideStore:
    """内存中的 Slide 状态管理"""

    def __init__(self) -> None:
        self._slides: list[SlideItem] = []

    def get_all(self) -> list[SlideItem]:
        return list(self._slides)

    def set(self, slides: list[SlideItem]) -> None:
        self._slides = list(slides)

    def update(self, slide: SlideItem) -> None:
        for i, s in enumerate(self._slides):
            if s.id == slide.id:
                self._slides[i] = slide
                return

    def reorder(self, slide_ids: list[int]) -> list[SlideItem]:
        id_map = {s.id: s for s in self._slides}
        self._slides = [id_map[sid] for sid in slide_ids if sid in id_map]
        return list(self._slides)


def _get_client() -> genai.Client:
    global _genai_client
    if _genai_client is None:
        api_key = os.environ.get("GOOGLE_API_KEY", "")
        _genai_client = genai.Client(api_key=api_key)
        logger.info("Gemini client initialized")
    return _genai_client


def get_image_storage() -> ImageStorage:
    global _image_storage
    if _image_storage is None:
        output_dir = os.environ.get("OUTPUT_DIR", "./output")
        _image_storage = ImageStorage(output_dir)
    return _image_storage


def get_style_storage() -> StyleStorage:
    global _style_storage
    if _style_storage is None:
        styles_dir = os.environ.get("STYLES_DIR", "./styles")
        _style_storage = StyleStorage(styles_dir)
    return _style_storage


def get_splitter() -> SplitterService:
    global _splitter
    if _splitter is None:
        _splitter = SplitterService(_get_client())
    return _splitter


def get_generator() -> GeneratorService:
    global _generator
    if _generator is None:
        max_concurrent = int(os.environ.get("MAX_CONCURRENT", "3"))
        _generator = GeneratorService(
            client=_get_client(),
            image_storage=get_image_storage(),
            style_storage=get_style_storage(),
            max_concurrent=max_concurrent,
        )
    return _generator


def get_style_service() -> StyleService:
    global _style_service
    if _style_service is None:
        _style_service = StyleService(get_style_storage())
    return _style_service


def get_slide_store() -> SlideStore:
    global _slide_store
    if _slide_store is None:
        _slide_store = SlideStore()
    return _slide_store
