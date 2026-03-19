"""GenSlides 后端入口：FastAPI 应用配置、CORS、路由挂载、静态文件服务"""

import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import router

load_dotenv()

logging.basicConfig(
    format="[%(asctime)s] %(levelname)s [%(name)s] %(message)s",
    level=logging.DEBUG if os.environ.get("DEBUG") else logging.INFO,
)

app = FastAPI(title="GenSlides", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

# 生产环境：托管前端构建产物
if os.path.exists("frontend/dist"):
    app.mount("/", StaticFiles(directory="frontend/dist", html=True))
