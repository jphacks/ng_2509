"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };
type ApiResp = { 
  audioBase64: string | null;
  mime: string;
  reply: string;
};

/* ---- Web Speech API 型の最小宣言 ---- */
type SpeechRecognitionEventLike = { results: SpeechRecognitionResultList };
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: any) => void) | null;
  start: () => void;
  stop: () => void;
};
declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    SpeechRecognition?: new () => SpeechRecognitionLike;
  }
}
/* ------------------------------------ */

// ★ このコンポーネントは会話機能に集中するため、onFinishは必須とする
export default function Chat({ onFinish }: { onFinish: (content: string) => void }) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "こんばんは。お疲れ様です。\n今日はどんな一日でしたか？" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const replyAudioRef = useRef<HTMLAudioElement | null>(null);
  const replyUrlRef = useRef<string | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [sttSupported, setSttSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState("");

  function stopPlayback() {
    try {
      if (replyAudioRef.current) {
        replyAudioRef.current.pause();
      }
    } catch {}
    if (replyUrlRef.current) {
      URL.revokeObjectURL(replyUrlRef.current);
      replyUrlRef.current = null;
    }
  }

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    setSttSupported(true);

    const rec = new SR();
    rec.lang = "ja-JP";
    rec.continuous = false;
    rec.interimResults = true;

    rec.onresult = (e: SpeechRecognitionEventLike) => {
      let finalText = "";
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        const t = r[0].transcript;
        if (r.isFinal) {
          finalText += t;
        } else {
          interim += t;
        }
      }
      setInterimText(interim);
      if (finalText) {
        setInterimText("");
        void onSend(finalText.trim());
      }
    };
    rec.onerror = (err) => {
      console.error("Speech Recognition Error", err);
      setListening(false);
      setInterimText("");
    };
    rec.onend = () => {
      setListening(false);
    };

    recognitionRef.current = rec;
    return () => {
      try {
        rec.stop();
      } catch {}
      recognitionRef.current = null;
      stopPlayback();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTo({
        top: chatRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, interimText, loading]);

  async function playVoice(base64: string, mime = "audio/mpeg") {
    // 省略：音声再生部分は変更なし
  }
  
  // 送信処理
  async function onSend(textArg?: string) {
    stopPlayback();

    const text = (textArg ?? input).trim();
    if (!text) return;

    const newMessages: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    // ★ 変更点 1: バックエンドが期待する形式で会話ログを作成
    const historyText = newMessages
      .map((m) => `[${m.role.toUpperCase()}] ${m.content}`)
      .join("\n");

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // ★ 変更点 2: `text`キーに完全な会話履歴を渡す
        body: JSON.stringify({ text: historyText }),
        cache: "no-store",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.detail || `エラーが発生しました (${res.status})`;
        setMessages((p) => [...p, { role: "assistant", content: errorMessage }]);
        return;
      }

      const data: ApiResp = await res.json();
      console.log("API Response:", data);
      const reply = data.reply || "（応答の取得に失敗しました）"; // ← "response_text" を参照する
      console.log("Extracted Reply:", reply);
      
      setMessages((p) => [...p, { role: "assistant", content: reply }]);

    } catch(e) {
      setMessages((p) => [
        ...p,
        { role: "assistant", content: "通信エラーが発生しました。あとで再試行してください。" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function toggleListen() {
    stopPlayback();
    if (!sttSupported) return;
    if (listening) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setListening(false);
    } else {
      try {
        setInterimText("");
        recognitionRef.current?.start();
        setListening(true);
      } catch {
        setListening(false);
      }
    }
  }

  // 対話終了
  function handleFinish() {
    stopPlayback();
    const finalHistory = messages
      .map((m) => `[${m.role.toUpperCase()}] ${m.content}`)
      .join("\n");
    onFinish(finalHistory);
  }

  return (
    <div className="rounded-2xl border bg-white shadow-sm flex flex-col h-[70vh]">
      <div ref={chatRef} className="p-4 space-y-3 flex-1 overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`px-3 py-2 rounded-xl text-sm whitespace-pre-wrap max-w-[80%] ${
                m.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {!!interimText && (
          <div className="flex justify-end">
            <div className="px-3 py-2 rounded-xl text-sm bg-blue-50 text-blue-700 border border-blue-200">
              {interimText}
              <span className="ml-1 animate-pulse">…</span>
            </div>
          </div>
        )}
        {loading && <div className="text-xs text-gray-500 text-center">返事を考えています…</div>}
      </div>

      <div className="border-t p-3 flex gap-2 items-center">
        <button
          type="button"
          onClick={toggleListen}
          disabled={!sttSupported}
          className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium border transition ${
            listening ? "bg-red-600 text-white border-red-700" : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
          }`}
          title={sttSupported ? "音声入力" : "音声入力はサポートされていません"}
        >
          {listening ? "■ 停止" : "🎤 話す"}
        </button>

        <form className="flex-1 flex gap-2" onSubmit={(e) => { e.preventDefault(); onSend(); }}>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="メッセージを入力…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={loading || !input.trim()}
          >
            送信
          </button>
        </form>
        <button
          className="shrink-0 rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          onClick={handleFinish}
          disabled={loading}
          title="対話終了"
        >
          対話終了
        </button>
      </div>
    </div>
  );
}