# python/delete_logs.py
from history import LOG_FILE, _ensure_dir

def main():
    _ensure_dir()
    LOG_FILE.write_text("", encoding="utf-8")
    print("OK")

if __name__ == "__main__":
    main()
