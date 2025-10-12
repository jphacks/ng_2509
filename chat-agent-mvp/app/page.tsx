"use client";

import { useMemo, useState } from "react";
import Chat from "@/components/Chat";
import Editor from "@/components/Editor";

function toYMD(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function toHM(date = new Date()) {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function Page() {
  // 初期値は「今日」
  const [selectedDate, setSelectedDate] = useState<string>(toYMD());
  const [selectedTime, setSelectedTime] = useState<string>(toHM());
  const [showDatePanel, setShowDatePanel] = useState(false);

  // 画面状態
  const [started, setStarted] = useState(false);      // チャットの“セッションが始まっている”か
  const [initing, setIniting] = useState(false);      // 初期化中表示
  const [editorOpen, setEditorOpen] = useState(false); // エディタ表示中か
  const [editorText, setEditorText] = useState("");    // エディタに渡すテキスト

  const selectedDisplay = useMemo(
    () => `${selectedDate} ${selectedTime}`,
    [selectedDate, selectedTime]
  );

  // 「執筆開始」→ 一時ログ初期化してチャットを開く
  async function onStart() {
    setIniting(true);
    try {
      const res = await fetch("/api/start", { method: "POST" });
      if (!res.ok) throw new Error("ログ初期化に失敗しました");
      setStarted(true);       // ✅ チャットを表示
      setEditorOpen(false);   // 念のため閉じる
      setEditorText("");
    } catch (e) {
      alert("ログ初期化エラー: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIniting(false);
    }
  }

  // チャットの「対話終了」で呼ばれる → エディタへ
  function handleFinishToEditor(content: string) {
    setEditorText(content);
    setEditorOpen(true);   // ✅ エディタは開く
    // ❌ setStarted(false) はしない！ → チャットを残す（非表示に切り替えるだけ）
  }

  // 保存/削除後：初期画面へ
  function backToHome() {
    setEditorOpen(false);
    setStarted(false);   // ✅ ここだけは初期画面へ戻す仕様
    setEditorText("");
  }

  // 「閉じる」→ チャットに戻る（チャットはアンマウントしてないので履歴が残る）
  function handleCloseToChat() {
    setEditorOpen(false); // ✅ これだけ。started は触らない
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="text-3xl font-bold tracking-tight">対話型エージェント（執筆支援）</h1>
        <p className="text-sm text-gray-600 mt-1">Pythonで応答・音声生成。音声入力対応。</p>

        {/* タイトル画面（チャット未開始 & エディタ非表示時のみ） */}
        {!started && !editorOpen && (
          <div className="mt-4 rounded-xl border bg-white p-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700">保存対象の日付/時刻:</span>
              <span className="rounded-md bg-gray-100 px-2 py-1 text-sm font-mono">
                {selectedDisplay}
              </span>
              <button
                type="button"
                onClick={() => setShowDatePanel((v) => !v)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                日付を変更
              </button>
            </div>

            {showDatePanel && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">日付</label>
                  <input
                    type="date"
                    className="rounded-lg border px-3 py-2 text-sm"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">時刻</label>
                  <input
                    type="time"
                    className="rounded-lg border px-3 py-2 text-sm"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowDatePanel(false)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  適用
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate(toYMD());
                    setSelectedTime(toHM());
                  }}
                  className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
                >
                  今日へリセット
                </button>
              </div>
            )}

            <div className="mt-6">
              <button
                type="button"
                onClick={onStart}
                disabled={initing}
                className={`inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium ${
                  initing ? "bg-gray-400 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
                aria-label="執筆開始"
              >
                {initing ? "初期化中..." : "[執筆開始]"}
              </button>
              <p className="mt-3 text-xs text-gray-500">
                ボタンを押すと会話ログを初期化してチャットが開始します。保存すると
                <code className="mx-1">python/logs/YYYY-MM-DD.txt</code>
                に上書き保存されます（選択された日付）。
              </p>
            </div>
          </div>
        )}

        {/* チャット（started 中は常にマウント。エディタ表示中は非表示化） */}
        {started && (
          <div className={`mt-6 ${editorOpen ? "hidden" : "block"}`}>
            <Chat onFinish={handleFinishToEditor} />
          </div>
        )}

        {/* エディタ（閉じる→チャットに戻る / 保存・削除→初期画面へ） */}
        {editorOpen && (
          <div className="mt-6">
            <Editor
              initialText={editorText}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onClose={handleCloseToChat} // ← 閉じる：チャットへ戻す（startedはtrueのまま）
              onDone={backToHome}        // ← 保存/削除：初期画面へ
            />
          </div>
        )}
      </div>
    </main>
  );
}
