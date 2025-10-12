# python/init_logs.py
# 役割：conversation.txt を初期化（空にする）

from pathlib import Path
from history import LOG_FILE, _ensure_dir

def main():
    _ensure_dir()
    LOG_FILE.write_text("", encoding="utf-8")
    print("OK")

if __name__ == "__main__":
    main()
