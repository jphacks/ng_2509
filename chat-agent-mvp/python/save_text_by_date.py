# python/save_text_by_date.py
# stdinのテキストを python/logs/YYYY-MM-DD.txt に保存
# --date YYYY-MM-DD, --time HH:MM を受け取り
# 先頭に "SavedAt: YYYY-MM-DD HH:MM" を付与して保存（同日ファイルは上書き）

from __future__ import annotations
from pathlib import Path
from datetime import datetime
import sys
import argparse

BASE_DIR = Path(__file__).resolve().parent
LOG_DIR = BASE_DIR / "logs"

def main():
  parser = argparse.ArgumentParser()
  parser.add_argument("--date", default="")
  parser.add_argument("--time", default="")
  args = parser.parse_args()

  LOG_DIR.mkdir(parents=True, exist_ok=True)
  content = sys.stdin.read()

  # 日付/時刻の決定（未指定なら現在時刻）
  now = datetime.now()
  d = args.date or now.strftime("%Y-%m-%d")
  t = args.time or now.strftime("%H:%M")
  # ファイル名は日付のみ
  out_path = LOG_DIR / f"{d}.txt"

  header = f"SavedAt: {d} {t}\n"
  out_path.write_text(header + content, encoding="utf-8")

  print(str(out_path.resolve()))

if __name__ == "__main__":
  main()
