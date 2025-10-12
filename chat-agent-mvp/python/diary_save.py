from __future__ import annotations
from pathlib import Path
import argparse
import sys
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
        print("invalid date", file=sys.stderr)
        exit(1)

    LOG_DIR.mkdir(parents=True, exist_ok=True)
    content = sys.stdin.read()
    p = LOG_DIR / f"{args.date}.txt"
    p.write_text(content, encoding="utf-8")
    print(str(p.resolve()), end="")

if __name__ == "__main__":
    main()
