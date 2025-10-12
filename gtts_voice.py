from pathlib import Path
from gtts import gTTS
import shutil
import subprocess
import sys
import tempfile

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

if __name__ == "__main__":
    # テスト実行
    success = make_voice(
        text="こんにちは。これは gTTS による無料の音声読み上げテストです。テンポを上げて再生することもできます。",
        out_file="gtts_output.mp3",
        lang="ja",
        tld="co.jp",
        slow=False,
        speed_factor=1.25,
    )
    if success:
        print("✅ gTTS で音声ファイルを生成しました: gtts_output.mp3")
    else:
        print("❌ 音声ファイルの生成に失敗しました。")