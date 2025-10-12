# setup_mvp.py
import os, pathlib

files = [
    "app/page.tsx",
    "app/layout.tsx",
    "app/api/ask/route.ts",
    "components/Chat.tsx",
    "styles/globals.css",
    "python/agent.py",
    "package.json",
    "tsconfig.json",
    "tailwind.config.ts",
    "postcss.config.js",
    ".gitignore",
]

# 必要なフォルダをまとめて作成
for f in files:
    pathlib.Path(os.path.dirname(f) or ".").mkdir(parents=True, exist_ok=True)
    pathlib.Path(f).write_text("", encoding="utf-8")

# publicフォルダも追加（任意）
pathlib.Path("public").mkdir(exist_ok=True)
print("✅ MVP用の空ファイル構成を作成しました！")
print("👉 これで前回のコードをそれぞれ貼り付けて完成です。")
