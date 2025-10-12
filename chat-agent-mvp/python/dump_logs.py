# python/dump_logs.py
from __future__ import annotations
import json
import re
from google import genai
from pathlib import Path
import argparse
import sys
from dotenv import load_dotenv
import os

# パス設定
PY_DIR = Path(__file__).resolve().parent
ROOT_DIR = PY_DIR.parent
CONV_PATH = PY_DIR / "logs" / "conversation.txt"  # ← ここは変更しない（指定どおり）
LOG_DIR = PY_DIR / "logs"                            # 過去日記は python/logs/ を使用

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", required=True, help="YYYY-MM-DD")
    args = ap.parse_args()
    date_str = args.date

    # 入力読み込み（無ければ空文字）
    conv = CONV_PATH.read_text(encoding="utf-8") if CONV_PATH.exists() else ""
    past_path = LOG_DIR / f"{date_str}.txt"
    past = past_path.read_text(encoding="utf-8") if past_path.exists() else ""

    # プロンプト（stderr へ出しておくとデバッグしやすい）
    prompt = f"""
あなたの役割は、ユーザーとの会話ログとその日の他の日記内容をもとに、
1日を振り返る日記をテンプレート形式で作成することです。

以下のテンプレートに従って、会話の内容から「出来事」「気持ち」「気づき」「感謝」「明日への意気込み」を整理し、
自然で温かみのある日記文を生成してください。

---

# 日記テンプレート

📅 日付：＿＿年＿＿月＿＿日（＿＿曜日）
🌞 今日の出来事  
＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿  

💭 今日の気持ち  
＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿  

💡 気づき・学び  
＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿  

💖 感謝したこと・よかったこと  
＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿  

🎯 明日への一言・やりたいこと  
＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿  

---

# 出力フォーマット

以下のJSON形式で出力してください：

{{
  "summary": "日記全体を20文字以内で要約した一文",
  "body": "上記テンプレートに沿った日記本文（自然な日本語で）"
}}

---

# 入力

## 会話ログ
{conv}

## 同日の日記（他の記録やメモなど）
{past}

## 日付
{date_str}

---

# 指示

1. 会話ログから、その日の出来事・感情・考えを抽出してください。
2. 同日の日記があれば、そこからも補足情報を反映してください。
3. 出来事・感情・気づき・感謝・明日の意気込みがすべて含まれるように文章を構成してください。
4. 文章は日記として自然に読めるトーン（やわらかく、丁寧）にしてください。
5. 出力は**必ずJSON形式のみ**で行ってください。説明文や余計なテキストは不要です。
""".strip()

    # APIキー確認
    if not GEMINI_API_KEY:
        print("GOOGLE_API_KEY is not set.", file=sys.stderr)
        sys.stdout.write("生成に失敗しました（APIキー未設定）")
        return

    try:
        client = genai.Client(api_key=GEMINI_API_KEY)

        # 生成
        resp = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        # レスポンステキスト取得
        resp_text = getattr(resp, "text", "") or ""

        # まず素直に JSON として読む
        diary_text = ""
        try:
            data = json.loads(resp_text)
            diary_text = f"{data.get('summary','')}\n\n{data.get('body','')}".strip()
        except Exception:
            # 万一説明や前置きが混ざった場合に {} を抽出
            m = re.search(r'\{\s*"summary"\s*:\s*".*?"\s*,\s*"body"\s*:\s*".*?"\s*\}', resp_text, re.DOTALL)
            if m:
                data = json.loads(m.group(0))
                diary_text = f"{data.get('summary','')}\n\n{data.get('body','')}".strip()
            else:
                # 最後の砦：モデルの生テキストをそのまま返す
                diary_text = resp_text.strip()

        if not diary_text:
            diary_text = "生成に失敗しました（空の応答）"

        sys.stdout.write(diary_text)

    except Exception as e:
        # 例外はstderrへ、stdoutには最低限の文言を返す
        print(f"Gemini error: {e}", file=sys.stderr)
        sys.stdout.write("生成に失敗しました（例外）")

if __name__ == "__main__":
    main()
