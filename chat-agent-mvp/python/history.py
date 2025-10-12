# python/history.py
from __future__ import annotations
from pathlib import Path
from datetime import datetime
import os

# ログファイルの既定パス（python/ 配下に logs/conversation.txt）
BASE_DIR = Path(__file__).resolve().parent
LOG_DIR = BASE_DIR / "logs"
LOG_FILE = LOG_DIR / "conversation.txt"

def _ensure_dir() -> None:
    LOG_DIR.mkdir(parents=True, exist_ok=True)

def append_turn(user_text: str, assistant_text: str) -> None:
    """ユーザ発話と応答を1ターン分として追記保存。タイムスタンプ付き。"""
    _ensure_dir()
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"[USER] {user_text}\n")
        f.write(f"[ASSISTANT] {assistant_text}\n")

def dump_with_header(header: str = "会話内容") -> str:
    """ファイル全文を読み出し、先頭に見出しを付けて返す。存在しない場合は空扱い。"""
    _ensure_dir()
    body = ""
    if LOG_FILE.exists():
        body = LOG_FILE.read_text(encoding="utf-8").rstrip()
    # 将来設計：ここで前処理やフィルタなどを差し込める
    return f"{header}\n{body}".rstrip()  # 末尾の余分な改行を削る
