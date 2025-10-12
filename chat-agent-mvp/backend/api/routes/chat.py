# api/routes/chat.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# services層から、ロジックとデータモデルをインポート
# ChatMessageは不要になったので削除
from backend.services.agent_services import invoke_agent, AgentResponse

# --- APIが受け取るリクエストボディの形式をテキストに変更 ---
class ChatRequest(BaseModel):
    history_text: str

# --- ルーターの初期化 (変更なし) ---
router = APIRouter(
    prefix="/chat",
    tags=["chat"],
)

# --- エンドポイントの実装を修正 ---
@router.post(
    "/",
    response_model=AgentResponse,
    summary="AIエージェントとの対話",
    description="テキスト形式の会話履歴を受け取り、AIエージェントからの次の応答を生成します。"
)
async def chat_endpoint(request: ChatRequest):
    """
    AIエージェントと対話を行うエンドポイント。
    フロントエンドは会話の全履歴を単一のテキストとしてこのAPIに送信します。
    """
    if not request.history_text:
        raise HTTPException(status_code=400, detail="会話履歴は空にできません")

    try:
        # テキストをそのままservicesに渡す
        agent_response = invoke_agent(history_text=request.history_text)
        return agent_response
    except Exception as e:
        print(f"エージェント処理中にエラーが発生しました: {e}")
        raise HTTPException(status_code=500, detail="サーバー内部でエラーが発生しました")