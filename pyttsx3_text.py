"""
【目的】
- pyttsx3 を使ってテキストを読み上げる最小サンプル
- どのメソッド・変数が何をするかを日本語コメントで明示
- 日本語の声(ボイス)に切り替える例を含む

【ポイント】
- pyttsx3 はオフライン・無料
- OS標準の音声合成(Windows: SAPI5 / macOS: NSSpeech / Linux: eSpeak)を叩く
"""

import time
import pyttsx3
import platform

# -----------------------------
# 1) 初期化
# -----------------------------
# engine: 音声合成エンジンのハンドル（以後、これに対して設定や再生命令を出す）
engine = pyttsx3.init()

# -----------------------------
# 2) 読み上げるテキストと各種パラメータを定義
# -----------------------------
# text: 読み上げる文字列
text = "こんにちは。これは pyttsx3 による無料の音声読み上げテストです。"

# rate: 話す速さ（整数。デフォルトはOSや環境に依存、だいたい200前後）
rate = 200

# volume: 音量（0.0〜1.0）
volume = 1.0

# preferred_japanese_voice_keywords: 日本語ボイスを見つけるためのキーワード候補
# - OSによりボイスIDの名前が異なるため、代表的な名前や言語コードで探索する
preferred_japanese_voice_keywords = [
    "japanese", "ja",                         # 一般/言語コード
    "haruka", "ichiro",                       # Windows (Microsoft Haruka/Ichiro)
    "kyoko", "otoya",                         # macOS (Kyoko/Otoya)
]

# -----------------------------
# 3) 利用可能な声(ボイス)を列挙して、日本語っぽい声を選ぶ
# -----------------------------
# engine.getProperty('voices'): ボイス一覧を取得（環境依存）
voices = engine.getProperty("voices")
print(f"🔊 利用可能なボイス一覧（{len(voices)}件）:")

# voice_id: 実際に設定する声のID（見つからない場合はNone）
voice_id = None

ja_voices_list = []
# 候補キーワードにヒットする声を探す
for v in voices:
    vid_lower = (v.id or "").lower()
    vname_lower = (getattr(v, "name", "") or "").lower()
    # ボイスの ID / name にキーワードが含まれるか確認
    if any(k in vid_lower or k in vname_lower for k in preferred_japanese_voice_keywords):
        print(f"✅ 日本語ボイス候補を発見: ID={v.id}, Name={getattr(v, 'name', 'N/A')}")
        ja_voices_list.append(v)

print("利用可能なボイスID一覧:")
for v in ja_voices_list:
    print(f" - ID={v.id}, Name={getattr(v, 'name', 'N/A')}")

# 見つからない場合、OSごとに「それっぽい」フォールバック
if len(ja_voices_list) == 0:
    system = platform.system()
    if system == "Darwin":  # macOS
        # macOSの代表的な日本語女性ボイス "Kyoko" を試す
        # 例: 'com.apple.speech.synthesis.voice.kyoko'
        for v in voices:
            if "kyoko" in (v.id or "").lower():
                ja_voices_list.append(v)
    elif system == "Windows":
        # Windows の日本語ボイス例（環境により存在しない場合あり）
        # 'Microsoft Haruka Desktop - Japanese'
        for v in voices:
            if "haruka" in (v.id or "").lower() or "ichiro" in (v.id or "").lower():
                ja_voices_list.append(v)
    else:
        # Linux: eSpeak系だと 'japanese' などのキーワードで選べることがある
        for v in voices:
            if "japanese" in (v.id or "").lower() or "ja" in (v.id or "").lower():
                ja_voices_list.append(v)


if voice_id is None:
    print("⚠ 日本語ボイスが見つかりませんでした。環境の既定ボイスで読み上げます。")

# -----------------------------
# 5) 読み上げの指示と実行
# -----------------------------
for v in ja_voices_list:
    print(f"🔊 日本語ボイスで読み上げを試みます: ID={v.id}, Name={getattr(v, 'name', 'N/A')}")
    engine = pyttsx3.init()
    engine.setProperty("rate", 200)
    engine.setProperty("volume", 1.0)
    engine.setProperty("voice", v.id)
    
    # ❶ 発話ジョブ投入 → 実行
    engine.say(text)
    engine.runAndWait()      # キューをすべて消化
    time.sleep(3)            # 連続再生を避けるため少し待つ

print("✅ 完了")
