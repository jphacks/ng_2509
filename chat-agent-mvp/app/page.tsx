// app/page.tsx
"use client";

import { useState } from "react";
import Chat from "@/components/Chat";
import Editor from "@/components/Editor";

export default function Page() {
  const [started, setStarted] = useState(false);
  const [initing, setIniting] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorText, setEditorText] = useState("");

  async function onStart() {
    setIniting(true);
    try {
      const res = await fetch("/api/start", { method: "POST" });
      if (!res.ok) throw new Error("ログ初期化に失敗しました");
      setStarted(true);
      setEditorOpen(false);
      setEditorText("");
    } catch (e) {
      alert("ログ初期化エラー: " + (e instanceof Error ? e.message : e));
    } finally {
      setIniting(false);
    }
  }

  // Chatの「対話終了」で呼ばれる → エディタへ
  function handleFinishToEditor(content: string) {
    setEditorText(content);
    setEditorOpen(true);
    setStarted(false);
  }

  // 保存/削除後：初期画面へ戻す
  function backToHome() {
    setEditorOpen(false);
    setStarted(false);
    setEditorText("");
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="text-3xl font-bold tracking-tight">対話型エージェント（執筆支援）</h1>
        <p className="text-sm text-gray-600 mt-1">Pythonで応答・音声生成。音声入力対応。</p>

        {!started && !editorOpen && (
          <div className="mt-8">
            <button
              type="button"
              onClick={onStart}
              disabled={initing}
              className={`inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium ${
                initing ? "bg-gray-400 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {initing ? "初期化中..." : "[執筆開始]"}
            </button>
            <p className="mt-4 text-sm text-gray-500">
              ボタンを押すと会話ログを初期化してチャットが開始します。
            </p>
          </div>
        )}

        {started && !editorOpen && (
          <div className="mt-6">
            <Chat onFinish={handleFinishToEditor} />
          </div>
        )}

        {editorOpen && !started && (
          <div className="mt-6">
            <Editor
              initialText={editorText}
              onClose={() => setEditorOpen(false)}
              onDone={backToHome}  // ← 保存/削除後は初期画面へ
            />
          </div>
        )}
      </div>
    </main>
  );
}
