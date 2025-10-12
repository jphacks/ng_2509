from fastapi import APIRouter
from .routes.chat import router as chat_router
from .routes.diaries import router as diaries_router

api_router = APIRouter()

api_router.include_router(chat_router)
api_router.include_router(diaries_router)