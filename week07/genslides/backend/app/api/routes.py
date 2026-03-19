"""REST API 路由：7 个端点定义，参数校验，响应格式化"""

import json
import logging

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, StreamingResponse

from app.models.schemas import (
    GenerateRequest,
    RegenerateRequest,
    RegenerateResponse,
    ReorderRequest,
    SplitRequest,
    SplitResponse,
    StyleUploadResponse,
)
from app.deps import (
    get_generator,
    get_image_storage,
    get_slide_store,
    get_splitter,
    get_style_service,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


@router.post("/slides/split", response_model=SplitResponse)
async def split_content(request: SplitRequest) -> SplitResponse:
    """将输入内容拆分为多页 Slide"""
    splitter = get_splitter()
    result = await splitter.split(request)
    get_slide_store().set(result.slides)
    return result


@router.post("/slides/generate")
async def generate_slides(request: GenerateRequest) -> StreamingResponse:
    """批量生成 Slide 图片，返回 SSE 流"""
    generator = get_generator()
    store = get_slide_store()

    async def event_stream():  # type: ignore[return]
        success_count = 0
        fail_count = 0
        async for event in generator.generate_all(
            request.slides, request.style_description, request.resolution
        ):
            yield f"event: progress\ndata: {event.model_dump_json()}\n\n"
            if event.status == "done":
                success_count += 1
                # Update store with image_url
                for s in store.get_all():
                    if s.id == event.slide_id:
                        s.image_url = event.image_url
                        s.status = "done"
                        store.update(s)
                        break
            elif event.status == "error":
                fail_count += 1

        complete = {
            "total": len(request.slides),
            "success": success_count,
            "failed": fail_count,
        }
        yield f"event: complete\ndata: {json.dumps(complete)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/slides/{slide_id}/regenerate", response_model=RegenerateResponse)
async def regenerate_slide(
    slide_id: int, request: RegenerateRequest
) -> RegenerateResponse:
    """重新生成单页 Slide 图片"""
    generator = get_generator()
    try:
        slide = await generator.regenerate_single(
            request.slide, request.style_description, request.resolution
        )
    except Exception as e:
        logger.error("Regenerate slide %d failed: %s", slide_id, str(e))
        raise HTTPException(
            status_code=500, detail=f"Image generation failed: {e}"
        )
    get_slide_store().update(slide)
    return RegenerateResponse(slide=slide)


@router.get("/slides")
async def get_slides() -> dict:
    """获取所有 Slides 数据"""
    slides = get_slide_store().get_all()
    return {"slides": [s.model_dump() for s in slides]}


@router.put("/slides/reorder")
async def reorder_slides(request: ReorderRequest) -> dict:
    """调整 Slide 顺序"""
    slides = get_slide_store().reorder(request.slide_ids)
    return {"slides": [s.model_dump() for s in slides]}


@router.post("/style/upload", response_model=StyleUploadResponse)
async def upload_style(
    file: UploadFile = File(...),
) -> StyleUploadResponse:
    """上传风格参考图片"""
    style_service = get_style_service()
    try:
        return await style_service.upload(file)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/slides/{slide_id}/image")
async def get_slide_image(slide_id: int) -> FileResponse:
    """获取生成的图片"""
    storage = get_image_storage()
    try:
        filepath = storage.load(slide_id)
        return FileResponse(filepath, media_type="image/png")
    except FileNotFoundError:
        raise HTTPException(
            status_code=404, detail=f"Slide {slide_id} image not found"
        )
