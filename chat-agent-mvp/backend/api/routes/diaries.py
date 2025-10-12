from fastapi import APIRouter

router = APIRouter(
        prefix="/diaries",
        tags=["diaries"],
)

@router.post("/")
async def create_diary():
    return {"message": "Diary created"}
