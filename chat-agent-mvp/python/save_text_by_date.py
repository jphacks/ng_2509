# python/save_text_by_date.py
# stdinのテキストを python/logs/YYYY-MM-DD.txt に保存（同日上書き）
from __future__ import annotations
from pathlib import Path
from datetime import datetime
import sys

BASE_DIR = Path(__file__).resolve().parent
LOG_DIR = BASE_DIR / "logs"

def main():
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    content = sys.stdin.read()
    date_name = datetime.now().strftime("%Y-%m-%d") + ".txt"
    out_path = LOG_DIR / date_name
    out_path.write_text(content, encoding="utf-8")
    print(str(out_path.resolve()))

if __name__ == "__main__":
    main()
