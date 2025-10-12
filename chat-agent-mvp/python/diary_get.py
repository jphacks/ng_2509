from __future__ import annotations
from pathlib import Path
import argparse
import json
import re

BASE_DIR = Path(__file__).resolve().parent
LOG_DIR = BASE_DIR / "logs"

def valid_date(d: str) -> bool:
    return bool(re.fullmatch(r"\d{4}-\d{2}-\d{2}", d))

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", required=True)
    args = parser.parse_args()

    if not valid_date(args.date):
        print(json.dumps({"error": "invalid date"}), end="")
        exit(1)

    LOG_DIR.mkdir(parents=True, exist_ok=True)
    p = LOG_DIR / f"{args.date}.txt"
    content = ""
    if p.exists():
        try:
            content = p.read_text(encoding="utf-8")
        except Exception:
            content = ""
    print(json.dumps({"content": content}, ensure_ascii=False), end="")

if __name__ == "__main__":
    main()
