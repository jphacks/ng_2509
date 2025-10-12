
from gtts import gTTS
import subprocess
import platform
from pathlib import Path
import shutil  # 外部コマンド(ffmpeg, mpg123 等)の存在確認に使用
import sys

# =============================
# 1) 読み上げるテキストと各種パラメータ
# =============================
# text: 読み上げるテキスト
# text = "こんにちは。これは gTTS による無料の音声読み上げテストです。テンポを上げて再生することもできます。"
text = "完了！"

# lang: 言語コード（日本語は 'ja'）
lang = "ja"

# tld: アクセント差の微調整（'co.jp' は日本寄り、'com' はグローバル寄り）
# ※ 話者（男女/声色）は gTTS では選べません
tld = "co.jp"

# slow: True でゆっくり話す（gTTS が唯一提供する速度オプション）
slow = False

# out_file: 生成する mp3 の保存先
out_file = Path("kanryo.mp3")

# speed_factor: 再生速度（1.0 = 等速）。1.25 なら 1.25 倍速。
# gTTS 自体では速くできないため、後段の FFmpeg(atempo) でテンポだけ上げます。
# 1.0 のままなら変換は行いません。
speed_factor = 1.25

# =============================
# 2) 音声の生成（gTTS）
# =============================
# gTTS(text=..., lang=..., tld=..., slow=...):
#   指定の言語・アクセント・話速で音声データを作成するオブジェクトを返す
tts = gTTS(text=text, lang=lang, tld=tld, slow=slow)

# save(パス文字列):
#   mp3 としてファイルに保存するメソッド
tts.save(str(out_file))
print(f"✅ gTTS で音声ファイルを生成しました: {out_file.resolve()}")

# =============================
# 3) （任意）FFmpeg でテンポだけ上げる
# =============================
# ・FFmpeg が見つかり、かつ speed_factor != 1.0 のときだけ変換
# ・atempo は一度に 0.5〜2.0 の範囲。2.0 を超える場合は複数段に分割する。
def tempo_change_with_ffmpeg(src: Path, dst: Path, factor: float) -> bool:
    """
    【役割】FFmpeg の atempo フィルタでテンポ（話速）のみ変更し、音程は維持したまま mp3 を作成
    【引数】
      - src: 入力 mp3
      - dst: 出力 mp3
      - factor: 倍速（例: 1.25 で 1.25倍速）
    【戻り値】
      - True: 変換成功
      - False: FFmpeg が見つからない／変換失敗
    """
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        print("⚠ FFmpeg が見つからないため、速度変更をスキップします。", file=sys.stderr)
        return False

    # atempo を 0.5〜2.0 のチャンクに分割
    def split_atempo(f):
        if f <= 0:
            raise ValueError("factor must be > 0")
        chain = []
        remaining = f
        # 2.0 を超える場合は 2.0 ずつ積み上げ、最後に残りを追加
        while remaining > 2.0 + 1e-9:
            chain.append(2.0)
            remaining /= 2.0
        if abs(remaining - 1.0) > 1e-9:
            chain.append(remaining)
        return chain

    chain = split_atempo(factor)
    # 例: factor=3.0 -> ["atempo=2.0","atempo=1.5"]
    filter_arg = ",".join(f"atempo={x:.6g}" for x in chain)

    cmd = [
        ffmpeg, "-y",
        "-i", str(src),
        "-filter:a", filter_arg,
        "-vn",
        str(dst)
    ]
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    except subprocess.CalledProcessError:
        print("⚠ FFmpeg 変換に失敗しました。等速のまま再生します。", file=sys.stderr)
        return False

# 速度変更したファイルの出力先
out_file_speed = Path(f"{out_file.stem}_x{speed_factor:.2f}{out_file.suffix}")

play_target = out_file  # 既定は等速ファイル
if abs(speed_factor - 1.0) > 1e-9:
    if tempo_change_with_ffmpeg(out_file, out_file_speed, speed_factor):
        play_target = out_file_speed
        print(f"✅ FFmpeg で {speed_factor}倍速に変換しました: {play_target.resolve()}")

# =============================
# 4) OSごとの再生
# =============================
def play_audio(file_path: Path) -> None:
    """
    【役割】生成した mp3 を OS 標準/一般的な方法で再生する
    - Windows: 'start'（標準コマンド）
    - macOS:   'afplay'（標準）
    - Linux:   'mpg123' があればそれを使用。なければ 'xdg-open' で既定アプリを起動
    """
    system = platform.system()
    try:
        if system == "Windows":
            # start <file> で既定のプレイヤーが開く
            subprocess.run(["cmd", "/c", "start", str(file_path)], check=False)
        elif system == "Darwin":
            # afplay <file> : macOS 標準の CLI オーディオプレイヤー
            subprocess.run(["afplay", str(file_path)], check=True)
        else:
            # Linux
            if shutil.which("mpg123"):
                subprocess.run(["mpg123", str(file_path)], check=True)
            else:
                # フォールバック：既定アプリで開く
                # （ディストリによっては音が出ないこともあるので mpg123 推奨）
                subprocess.run(["xdg-open", str(file_path)], check=False)
    except FileNotFoundError as e:
        print(f"⚠ 再生コマンドが見つかりませんでした: {e}", file=sys.stderr)
    except subprocess.CalledProcessError as e:
        print(f"⚠ 再生に失敗しました（終了コード {e.returncode}）", file=sys.stderr)

print(f"▶ 再生開始: {play_target.name}")
play_audio(play_target)
print("✅ 再生コマンドの発行が完了しました。")
