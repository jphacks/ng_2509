# python/agent.py
# 役割：
# - stdin で受けたテキストに対して、プロンプトに従い Gemini で応答を生成
# - 生成結果を JSON {"reply": "..."} のみ stdout へ（余計な print を混ぜない）
# - さらに会話ログへ逐次追記保存（history.append_turn が使えなければ logs/conversation.txt に直接追記）

from __future__ import annotations

import os
import re
import sys
import json
from pathlib import Path
from dotenv import load_dotenv

# オプション依存（google-genai が無ければフォールバック応答）
try:
    from google import genai  # pip install google-genai
except Exception:  # ライブラリ未導入でも動かす
    genai = None  # type: ignore

# ---- パス設定 ----
PY_DIR = Path(__file__).resolve().parent
ROOT_DIR = PY_DIR.parent
CONV_PATH = ROOT_DIR / "python" / "logs" / "conversation.txt"  # ← 指定どおり固定

# ---- 環境変数 ----
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# ---- ログ追記 ----
def _append_turn_fallback(user_msg: str, reply_msg: str) -> None:
    """history が無い/失敗時のフォールバック: logs/conversation.txt に追記"""
    try:
        CONV_PATH.parent.mkdir(parents=True, exist_ok=True)
        with CONV_PATH.open("a", encoding="utf-8") as f:
            f.write(f"[USER] {user_msg}\n")
            f.write(f"[ASSISTANT] {reply_msg}\n")
    except Exception as e:
        print(f"[agent] fallback append error: {e}", file=sys.stderr)

def append_turn_safe(user_msg: str, reply_msg: str) -> None:
    """history.append_turn があれば使い、無ければフォールバック"""
    try:
        from history import append_turn  # 同ディレクトリ想定
        try:
            append_turn(user_msg, reply_msg, conv_path=CONV_PATH)  # パラメタ付き実装に対応
        except TypeError:
            append_turn(user_msg, reply_msg)  # シンプル実装に対応
    except Exception:
        _append_turn_fallback(user_msg, reply_msg)

# ---- プロンプト ----
SYSTEM_PROMPT = """あなたは、ユーザーが一日を振り返り、気軽に日記を書くのを手伝う、共感的で聞き上手な対話アシスタントです。
あなたの目的は、会話の中から「具体的な出来事」「その時の感情や考え」「気づきや学び」「感謝やよかったこと」「明日やりたいこと」をやさしく引き出すことです。

# あなたの振る舞い (ルール)
- 常に肯定・共感の一言を添える（例:「そうだったんですね」「それは大変でしたね」）。
- 質問は一度に一つだけ。
- 5W1H（いつ/どこで/誰が/何を/なぜ/どうやって）で深掘りする。
- まだ埋まっていない日記要素（出来事/気持ち/気づき/感謝/明日）を優先的に引き出す。
- 出力は**あなたの次の一言のみ**。前置きや説明は禁止。

# 出力形式
{"reply":"ここにあなたの返信"}
"""

def build_prompt(conv_text: str, user_text: str) -> str:
    return f"""{SYSTEM_PROMPT}

# 会話ログ:
{conv_text}

# ユーザーの最新発話:
{user_text}

# 出力:
{{"reply":"..."}}
"""

# ---- 応答パース ----
def parse_reply(resp_text: str, user_fallback: str) -> str:
    """
    モデル出力から reply を抽出。
    - {"reply":"..."} を優先
    - 見つからなければ {reply: ...} 的な簡易形式も試す
    - だめなら全文を返す
    """
    text = (resp_text or "").strip()
    if not text:
        return f"そうかそうか、{user_fallback}なんだね。"

    # JSON を優先
    try:
        data = json.loads(text)
        if isinstance(data, dict) and "reply" in data:
            val = str(data["reply"]).strip()
            if val:
                return val
    except Exception:
        pass

    # { reply: ... } 形式
    m = re.search(r'\{\s*"?(reply)"?\s*:\s*"(.*?)"\s*\}\s*$', text, flags=re.DOTALL | re.IGNORECASE)
    if m:
        candidate = m.group(2).strip()
        if candidate:
            return candidate

    # それ以外は生テキスト
    return text

# ---- モデル呼び出し ----
def gen_reply_with_gemini(user_text: str, conv_text: str) -> str:
    if not GEMINI_API_KEY or genai is None:
        print("[agent] Gemini unavailable; using fallback.", file=sys.stderr)
        return f"そうかそうか、{user_text}なんだね。"
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        prompt = build_prompt(conv_text, user_text)
        resp = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        resp_text = getattr(resp, "text", "") or ""
        reply = parse_reply(resp_text, user_text)
        return reply or f"そうかそうか、{user_text}なんだね。"
    except Exception as e:
        print(f"[agent] Gemini error: {e}", file=sys.stderr)
        return f"そうかそうか、{user_text}なんだね。"

# ---- エントリポイント ----
def main():
    user_input = sys.stdin.read().strip()

    if not user_input:
        # 空入力でも JSON は返す
        fallback = "そうだったんですね。今日の出来事から一つ教えてもらえますか？"
        print(json.dumps({"reply": fallback}, ensure_ascii=False))
        return

    # 直近の会話ログ（なければ空）
    conv_text = ""
    try:
        if CONV_PATH.exists():
            conv_text = CONV_PATH.read_text(encoding="utf-8")
    except Exception as e:
        print(f"[agent] read conv error: {e}", file=sys.stderr)

    # 応答生成
    reply_text = gen_reply_with_gemini(user_input, conv_text)

    # ログ追記（失敗しても会話は返す）
    try:
        append_turn_safe(user_input, reply_text)
    except Exception as e:
        print(f"[agent] append error: {e}", file=sys.stderr)

    # 標準出力：JSON のみ
    print(json.dumps({"reply": reply_text}, ensure_ascii=False))

if __name__ == "__main__":
    main()
