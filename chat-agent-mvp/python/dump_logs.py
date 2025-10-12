# python/dump_logs.py
# 役割：保存済みの会話を「会話内容」ヘッダを付けてまとめて返す
# 出力形式：JSON {"content": "<テキスト全文>"}

import json
from history import dump_with_header

def main():
    content = dump_with_header("会話内容")
    print(json.dumps({"content": content}, ensure_ascii=False))

if __name__ == "__main__":
    main()
