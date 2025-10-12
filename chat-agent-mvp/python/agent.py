# python/agent.py
# 役割：
# - stdinで受けたテキストに対して「そうかそうか、〜なんだね。」を生成
# - 生成結果を JSON {"reply": "..."} でstdoutへ
# - さらに会話ログへ逐次追記保存（python/history.py）

import sys
import json
from pathlib import Path
from history import append_turn  # 同ディレクトリから

def main():
    user_input = sys.stdin.read().strip()
    reply_text = f"そうかそうか、{user_input}なんだね。"

    # ログへ追記保存（失敗しても応答自体は返す）
    try:
        append_turn(user_input, reply_text)
    except Exception as e:
        print(f"⚠ ログ保存に失敗: {e}", file=sys.stderr)

    print(json.dumps({"reply": reply_text}, ensure_ascii=False))

if __name__ == "__main__":
    main()
