"use client";

import { useMemo, useState } from "react";
import Chat from "@/components/Chat";
import Editor from "@/components/Editor";
import Diary from "@/components/Diary";

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
  // 時刻はUIに出さない（互換のため内部維持）
  const [selectedTime, setSelectedTime] = useState<string>(toHM());
  const [showDatePanel, setShowDatePanel] = useState(false);

  // 画面状態
  const [started, setStarted] = useState(false);       // チャット画面表示
  const [initing, setIniting] = useState(false);       // 初期化中表示
  const [editorOpen, setEditorOpen] = useState(false); // エディタ表示
  const [editorText, setEditorText] = useState("");    // エディタに渡すテキスト

  // 日記ブラウザ（カレンダー）表示
  const [diaryOpen, setDiaryOpen] = useState(false);

  // 表示は日付のみ
  const selectedDisplay = useMemo(() => selectedDate, [selectedDate]);

  // 「日記を書く」→ 一時ログ初期化してチャットを開く
  async function onStart() {
    setIniting(true);
    try {
      const res = await fetch("/api/start", { method: "POST" });
      if (!res.ok) throw new Error("ログ初期化に失敗しました");
      setStarted(true);
      setEditorOpen(false);
      setEditorText("");
      setDiaryOpen(false);
    } catch (e) {
      alert("ログ初期化エラー: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIniting(false);
    }
  }

  // チャットの「対話終了」で呼ばれる → エディタへ
  function handleFinishToEditor(content: string) {
    setEditorText(content);
    setEditorOpen(true); // チャットはマウント維持（startedはtrueのまま）
  }

  // 保存/削除後：初期画面へ
  function backToHome() {
    setEditorOpen(false);
    setStarted(false);
    setEditorText("");
    setDiaryOpen(false);
  }

  // エディタの「閉じる」→ チャットに戻る（チャットはアンマウントしない）
  function handleCloseToChat() {
    setEditorOpen(false);
    setStarted(true);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="text-3xl font-bold tracking-tight">らくらく・おしゃべり日記</h1>
        <p className="text-sm text-gray-600 mt-1">あなたの思い出を簡単に記録しよう。</p>

        {/* タイトル画面（チャット未開始 & エディタ非表示 & 日記非表示） */}
        {!started && !editorOpen && !diaryOpen && (
          <>
            <div className="mt-4 rounded-xl border bg-white p-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-700">この日の日記を書く:</span>
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
                      setSelectedTime(toHM()); // 内部の時刻は今日の時刻に戻す（UIには出さない）
                    }}
                    className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
                  >
                    今日へリセット
                  </button>
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={onStart}
                  disabled={initing}
                  className={`inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium ${
                    initing ? "bg-gray-400 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                  aria-label="日記を書く"
                >
                  {initing ? "初期化中..." : "日記を書く"}
                </button>

                <button
                  type="button"
                  onClick={() => setDiaryOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium border border-gray-300 hover:bg-gray-50"
                >
                  今までの日記
                </button>
              </div>

              <p className="mt-3 text-xs text-gray-500">
                「今までの日記」でカレンダーを開いて、今までの日記を閲覧/編集/削除できるよ。
              </p>
            </div>
          </>
        )}

        {/* チャット（started 中は常にマウント。エディタ表示中は非表示化） */}
        {started && (
          <div className={`mt-6 ${editorOpen ? "hidden" : "block"}`}>
            <Chat onFinish={handleFinishToEditor} />
          </div>
        )}

        {/* エディタ（閉じる→チャット / 保存・削除→初期画面） */}
        {editorOpen && (
          <div className="mt-6">
            <Editor
              initialText={editorText}
              selectedDate={selectedDate}
              selectedTime={selectedTime} // 型互換のため残すがUIには出さない
              onClose={handleCloseToChat}
              onDone={backToHome}
            />
          </div>
        )}

        {/* 日記カレンダー */}
        {diaryOpen && !started && !editorOpen && (
          <div className="mt-6">
            <Diary onBack={() => setDiaryOpen(false)} />
          </div>
        )}
      </div>
    </main>
  );
}
