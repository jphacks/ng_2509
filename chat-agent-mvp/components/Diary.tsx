"use client";

import { useEffect, useMemo, useState } from "react";

// 月一覧APIの戻り値
type MonthCell = { date: string; hasLog: boolean; preview: string }; // previewは先頭20文字
type MonthData = {
  year: number;
  month: number; // 1-12
  days: MonthCell[]; // 1日〜月末
};

export default function Diary({ onBack }: { onBack?: () => void }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12

  const [monthData, setMonthData] = useState<MonthData | null>(null);
  const [loading, setLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewContent, setViewContent] = useState<string>("");
  const [viewLoading, setViewLoading] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

  const ymLabel = useMemo(() => `${year}年 ${String(month).padStart(2, "0")}月`, [year, month]);

  // ---------- 月選択ドロップダウン ----------
  // 「表示中の月」を基準に、前年1月〜来年12月を生成
  const monthOptions = useMemo(() => {
    const options: { y: number; m: number; label: string; value: string }[] = [];
    const start = new Date(year - 1, 0, 1);   // 表示月の前年1月
    const end   = new Date(year + 1, 11, 1); // 表示月の来年12月
    const cur = new Date(start);
    while (cur <= end) {
      const y = cur.getFullYear();
      const m = cur.getMonth() + 1;
      const label = `${y}/${String(m).padStart(2, "0")}`;
      const value = `${y}-${String(m).padStart(2, "0")}`;
      options.push({ y, m, label, value });
      cur.setMonth(cur.getMonth() + 1);
    }
    return options;
  }, [year]); // ← 表示年が変わったらリストを更新（十分）

  const selectedYMValue = `${year}-${String(month).padStart(2, "0")}`;

  function resetViewer() {
    setSelectedDate(null);
    setEditing(false);
    setViewContent("");
    setEditContent("");
  }

  async function handleChangeMonth(e: React.ChangeEvent<HTMLSelectElement>) {
    const [yStr, mStr] = e.target.value.split("-");
    const yi = parseInt(yStr, 10);
    const mi = parseInt(mStr, 10);
    if (!Number.isFinite(yi) || !Number.isFinite(mi) || mi < 1 || mi > 12) return;

    // ★ 月変更時：閲覧/編集エリアを閉じる
    resetViewer();

    setYear(yi);
    setMonth(mi);
  }
  // ----------------------------------------

  // 月一覧を取得
  async function fetchMonth() {
    setLoading(true);
    try {
      const res = await fetch(`/api/diary/month?year=${year}&month=${month}`, { cache: "no-store" });
      const data = (await res.json()) as MonthData;
      setMonthData(data);
    } catch {
      setMonthData(null);
      alert("月データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  // 日付をクリック → 閲覧
  async function openDate(date: string) {
    setSelectedDate(date);
    setEditing(false);
    setViewLoading(true);
    try {
      const r = await fetch(`/api/diary/get?date=${date}`, { cache: "no-store" });
      const { content } = (await r.json()) as { content?: string };
      setViewContent(content ?? "");
    } catch {
      setViewContent("");
      alert("日記の取得に失敗しました");
    } finally {
      setViewLoading(false);
    }
  }

  // 削除 → ファイルを消してカレンダーへ戻る
  async function onDelete() {
    if (!selectedDate) return;
    if (!confirm(`${selectedDate} の日記を削除します。よろしいですか？`)) return;
    try {
      const r = await fetch(`/api/diary/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate }),
      });
      if (!r.ok) throw new Error("delete failed");
      resetViewer();
      await fetchMonth();
    } catch {
      alert("削除に失敗しました");
    }
  }

  // 編集開始（★その時点の本文で初期化。無い場合は空欄）
  function onEdit() {
    setEditContent(viewContent || "");
    setEditing(true);
  }

  // 編集保存 → 上書き保存して閲覧に戻る
  async function onSave() {
    if (!selectedDate) return;
    try {
      const r = await fetch(`/api/diary/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, content: editContent }),
      });
      if (!r.ok) throw new Error("save failed");
      setEditing(false);
      setViewContent(editContent);
      await fetchMonth();
    } catch {
      alert("保存に失敗しました");
    }
  }

  // 閉じる（閲覧/編集からカレンダーに戻る）※編集は反映しない
  function onCloseViewer() {
    resetViewer();
  }

  // カレンダー用：週の始まりを日曜に合わせる
  const firstDay = useMemo(() => new Date(year, month - 1, 1).getDay(), [year, month]); // 0(日)〜6(土)
  const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [year, month]);

  // 表示用セルを生成（前詰めの空セル + 実日付）
  const cells: Array<{ label: string; date?: string; hasLog?: boolean; preview?: string }> = [];
  for (let i = 0; i < firstDay; i++) cells.push({ label: "" });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const cell = monthData?.days.find((x) => x.date === date);
    cells.push({
      label: String(d),
      date,
      hasLog: cell?.hasLog,
      preview: cell?.preview ?? "",
    });
  }
  while (cells.length % 7 !== 0) cells.push({ label: "" });

  return (
    <div className="rounded-2xl border bg-white shadow-sm p-4">
      {/* ヘッダ */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {/* 前月 / ドロップダウン（表示月基準） / 次月 */}
          <button
            onClick={() => {
              const dt = new Date(year, month - 2, 1); // 前月
              resetViewer(); // ★ 閲覧/編集を閉じる
              setYear(dt.getFullYear());
              setMonth(dt.getMonth() + 1);
            }}
            className="rounded-md border px-2 py-1 text-sm hover:bg-gray-50"
            aria-label="前の月"
          >
            ←
          </button>

          <select
            className="rounded-md border px-3 py-1.5 text-sm"
            value={selectedYMValue}
            onChange={handleChangeMonth}
            title="年月を選択"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              const dt = new Date(year, month, 1); // 次月
              resetViewer(); // ★ 閲覧/編集を閉じる
              setYear(dt.getFullYear());
              setMonth(dt.getMonth() + 1);
            }}
            className="rounded-md border px-2 py-1 text-sm hover:bg-gray-50"
            aria-label="次の月"
          >
            →
          </button>

          {/* 今月へ（残す） */}
          <button
            onClick={() => {
              resetViewer(); // ★ 閲覧/編集を閉じる
              setYear(now.getFullYear());
              setMonth(now.getMonth() + 1);
            }}
            className="ml-2 rounded-md border px-2 py-1 text-sm hover:bg-gray-50"
            aria-label="今月へ"
          >
            今月
          </button>

          <span className="text-xs text-gray-500 ml-2">{ymLabel}</span>
        </div>

        <button
          onClick={onBack}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          戻る（タイトルへ）
        </button>
      </div>

      {/* カレンダー */}
      <div className="mt-4 grid grid-cols-7 gap-2">
        {["日", "月", "火", "水", "木", "金", "土"].map((w) => (
          <div key={w} className="text-center text-xs text-gray-500">{w}</div>
        ))}
        {loading ? (
          <div className="col-span-7 text-center text-sm text-gray-500 py-8">読み込み中…</div>
        ) : (
          cells.map((c, idx) => (
            <button
              key={idx}
              disabled={!c.date}
              onClick={() => c.date && openDate(c.date)}
              className={`h-24 rounded-lg border p-2 text-left text-xs relative
                ${c.date ? "hover:bg-gray-50" : "bg-gray-50 opacity-60 cursor-default"}
                ${c.hasLog ? "border-blue-300" : "border-gray-200"}`}
            >
              <div className="text-[10px] absolute right-2 top-1 text-gray-500">{c.label}</div>
              <div className="mt-4 line-clamp-3 whitespace-pre-wrap">
                {c.hasLog ? c.preview : ""}
              </div>
            </button>
          ))
        )}
      </div>

      {/* 閲覧 / 編集 */}
      {selectedDate && (
        <div className="mt-6 rounded-xl border p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {selectedDate} の日記
            </h3>
            {!editing && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditContent(viewContent || ""); // ★ 編集初期化
                    setEditing(true);
                  }}
                  className="rounded-md bg-gray-700 text-white px-3 py-1.5 text-sm hover:bg-gray-800"
                >
                  編集
                </button>
                <button
                  onClick={onDelete}
                  className="rounded-md bg-red-600 text-white px-3 py-1.5 text-sm hover:bg-red-700"
                >
                  削除
                </button>
                <button
                  onClick={onCloseViewer}
                  className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  閉じる
                </button>
              </div>
            )}
          </div>

          {!editing ? (
            <div className="mt-3">
              {viewLoading ? (
                <div className="text-sm text-gray-500">読み込み中…</div>
              ) : viewContent ? (
                <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 rounded-lg p-3 border">
{viewContent}
                </pre>
              ) : (
                <div className="text-sm text-gray-500">日記がありません</div>
              )}
              {!viewLoading && (
                <div className="mt-3">
                  <button
                    onClick={() => {
                      setEditContent(viewContent || ""); // ★ 編集初期化（再掲：安全のため）
                      setEditing(true);
                    }}
                    className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
                  >
                    編集
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3">
              <textarea
                key={selectedDate}  // ★ 日付切替で確実に初期化
                className="w-full h-48 rounded-lg border p-3 text-sm font-mono"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="ここに日記を入力…"
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={onSave}
                  className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700"
                >
                  保存
                </button>
                <button
                  onClick={() => {
                    // 反映せず閲覧へ戻る
                    setEditing(false);
                    setEditContent("");
                  }}
                  className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
                >
                  閉じる
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
