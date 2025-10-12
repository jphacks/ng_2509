from __future__ import annotations
from pathlib import Path
from datetime import datetime
import argparse
import json
import re

BASE_DIR = Path(__file__).resolve().parent
LOG_DIR = BASE_DIR / "logs"

def preview_20(text: str) -> str:
    # 改行・連続空白を整理して先頭20文字
    s = re.sub(r"\s+", " ", text.strip())
    return s[:20]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", required=True)
    parser.add_argument("--month", required=True)
    args = parser.parse_args()

    try:
        y = int(args.year)
        m = int(args.month)
        assert 1 <= m <= 12
    except Exception:
        print(json.dumps({"error": "invalid year/month"}), end="")
        exit(1)

    LOG_DIR.mkdir(parents=True, exist_ok=True)

    # 月末日数
    if m == 12:
        next_month = datetime(y + 1, 1, 1)
    else:
        next_month = datetime(y, m + 1, 1)
    first_day = datetime(y, m, 1)
    days = (next_month - first_day).days

    cells = []
    for d in range(1, days + 1):
        date = f"{y:04d}-{m:02d}-{d:02d}"
        p = LOG_DIR / f"{date}.txt"
        if p.exists():
            try:
                content = p.read_text(encoding="utf-8")
            except Exception:
                content = ""
            cells.append({
                "date": date,
                "hasLog": True,
                "preview": preview_20(content)
            })
        else:
            cells.append({
                "date": date,
                "hasLog": False,
                "preview": ""
            })

    data = {
        "year": y,
        "month": m,
        "days": cells
    }
    print(json.dumps(data, ensure_ascii=False), end="")

if __name__ == "__main__":
    main()
