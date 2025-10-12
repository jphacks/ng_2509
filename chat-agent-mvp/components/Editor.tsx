"use client";

import { useState } from "react";

export default function Editor({
  initialText,
  selectedDate,
  selectedTime,
  onClose,
  onDone, // 保存/削除後に初期画面へ戻す
}: {
  initialText: string;
  selectedDate: string;
  selectedTime: string;
  onClose?: () => void;
  onDone?: () => void;
}) {
  const [text, setText] = useState(initialText);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: text,
          date: selectedDate, // YYYY-MM-DD
          time: selectedTime, // HH:mm
        }),
      });
      if (!res.ok) throw new Error("保存に失敗しました");
      onDone?.(); // 成功 → 初期画面へ
    } catch (e) {
      setMessage("保存エラー: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteClick() {
    if (!confirm("保存せずに削除（破棄）しますか？")) return;
    setDeleting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/delete", { method: "POST" });
      if (!res.ok) throw new Error("削除に失敗しました");
      onDone?.(); // 削除（保存しない）→ 初期画面へ
    } catch (e) {
      setMessage("削除エラー: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-white shadow-sm p-4">
      <h2 className="text-xl font-semibold">日記（編集可能）</h2>
      <p className="text-xs text-gray-500 mt-1">
        保存すると <code>python/logs/{selectedDate}.txt</code> に上書き保存されます（先頭に
        選択日時を書き込みます）。
      </p>

      <textarea
        className="mt-4 w-full h-[50vh] resize-none rounded-lg border p-3 text-sm font-mono"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="mt-3 flex gap-2">
        <button
          onClick={onSave}
          disabled={saving}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            saving ? "bg-gray-400 text-white" : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {saving ? "保存中..." : "保存"}
        </button>
        <button
          onClick={onDeleteClick}
          disabled={deleting}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            deleting ? "bg-gray-400 text-white" : "bg-red-600 text-white hover:bg-red-700"
          }`}
        >
          {deleting ? "削除中..." : "保存しない（削除）"}
        </button>
        {onClose && (
            <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium border border-gray-300 hover:bg-gray-50"
            >
            閉じる（編集をやめる）
            </button>
        )}
      </div>

      {message && <div className="mt-2 text-sm text-gray-700">{message}</div>}
    </div>
  );
}
