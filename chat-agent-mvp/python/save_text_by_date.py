# python/save_text_by_date.py
from __future__ import annotations
from pathlib import Path
from datetime import datetime
import sys
import argparse

BASE_DIR = Path(__file__).resolve().parent
LOG_DIR = BASE_DIR / "logs"

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", default="")  # YYYY-MM-DD（未指定なら今日）
    args = parser.parse_args()

    LOG_DIR.mkdir(parents=True, exist_ok=True)
    d_str = args.date or datetime.now().strftime("%Y-%m-%d")
    out_path = LOG_DIR / f"{d_str}.txt"

    # 確認画面の内容を「そのまま」保存（上書き）
    content = sys.stdin.read()
    out_path.write_text(content, encoding="utf-8")

    # 呼び出し側で使えるよう絶対パスを返す
    print(str(out_path.resolve()))

if __name__ == "__main__":
    main()
