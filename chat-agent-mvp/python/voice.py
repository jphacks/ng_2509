# python/voice.py
# 要件の make_voice をそのまま使用し、CLI/STDIN からテキストを受け取り MP3 を生成する。
# - stdin: テキスト
# - argv: --out 出力先パス（省略時は ./voice.mp3）
# - 成功時: JSON {"ok": true, "path": "<out>"} をstdoutにprint
# - 失敗時: JSON {"ok": false, "error": "..."} をstdoutにprint し、終了コード1

import sys
import json
import argparse
import tempfile
import shutil
import subprocess
from pathlib import Path
from gtts import gTTS  # pip install gTTS

def make_voice(
    text: str,
    out_file: Path | str = "voice.mp3",
    *,
    lang: str = "ja",
    tld: str = "co.jp",
    slow: bool = False,
    speed_factor: float = 1.25,
) -> bool:
    """
    テキストから音声(MP3)を生成し、FFmpeg で速度変更して保存します。
    speed_factor は 0.5〜2.0 の範囲で動作します。
    戻り値: 成功なら True、失敗なら False
    """
    if not text:
        print("⚠ 空のテキストです。", file=sys.stderr)
        return False

    out_path = Path(out_file)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    # 一時ファイルへ gTTS 音声を生成
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp_in:
            tmp_in_path = Path(tmp_in.name)
        gTTS(text=text, lang=lang, tld=tld, slow=slow).save(str(tmp_in_path))
    except Exception as e:
        print(f"⚠ gTTS 生成エラー: {e}", file=sys.stderr)
        return False

    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        print("⚠ FFmpeg が見つからないため、速度変更をスキップします。", file=sys.stderr)
        tmp_in_path.replace(out_path)
        return True

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp_out:
            tmp_out_path = Path(tmp_out.name)

        cmd = [
            ffmpeg, "-y",
            "-i", str(tmp_in_path),
            "-filter:a", f"atempo={speed_factor:.6g}",
            "-vn",
            str(tmp_out_path),
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        tmp_out_path.replace(out_path)
        return True
    except subprocess.CalledProcessError:
        print("⚠ FFmpeg 変換に失敗しました。等速のまま保存します。", file=sys.stderr)
        tmp_in_path.replace(out_path)
        return True
    finally:
        try:
            tmp_in_path.unlink(missing_ok=True)
        except Exception:
            pass
        try:
            tmp_out_path.unlink(missing_ok=True)
        except Exception:
            pass

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="voice.mp3")
    parser.add_argument("--lang", default="ja")
    parser.add_argument("--tld", default="co.jp")
    parser.add_argument("--slow", action="store_true")
    parser.add_argument("--speed", type=float, default=1.25)
    args = parser.parse_args()

    text = sys.stdin.read().strip()
    ok = make_voice(
        text=text,
        out_file=args.out,
        lang=args.lang,
        tld=args.tld,
        slow=args.slow,
        speed_factor=args.speed,
    )
    if ok:
        print(json.dumps({"ok": True, "path": str(Path(args.out).resolve())}, ensure_ascii=False))
        sys.exit(0)
    else:
        print(json.dumps({"ok": False, "error": "make_voice failed"}, ensure_ascii=False))
        sys.exit(1)

if __name__ == "__main__":
    main()
