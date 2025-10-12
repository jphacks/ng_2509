"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };
type ApiResp = { reply?: string; audioBase64?: string | null; mime?: string; error?: string };

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

export default function Chat({ onFinish }: { onFinish?: (content: string) => void }) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "こんにちは！テキスト入力 or 🎤で話しかけてね。" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // 完了音（kanryo.mp3）
  const endAudioRef = useRef<HTMLAudioElement | null>(null);

  // 応答音声（毎回生成するBlob URLを管理）
  const replyAudioRef = useRef<HTMLAudioElement | null>(null);
  const replyUrlRef = useRef<string | null>(null);

  // スクロール
  const chatRef = useRef<HTMLDivElement | null>(null);

  // 音声入力
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [sttSupported, setSttSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState("");

  useEffect(() => {
    const audio = new Audio("/kanryo.mp3");
    audio.preload = "auto";
    endAudioRef.current = audio;
  }, []);

  // 再生中のすべての音声/読み上げを停止
  function stopPlayback() {
    // 応答音声
    try {
      if (replyAudioRef.current) {
        replyAudioRef.current.pause();
        replyAudioRef.current.currentTime = 0;
      }
    } catch {}
    // 完了音
    try {
      if (endAudioRef.current) {
        endAudioRef.current.pause();
        endAudioRef.current.currentTime = 0;
      }
    } catch {}
    // ObjectURL解放
    if (replyUrlRef.current) {
      URL.revokeObjectURL(replyUrlRef.current);
      replyUrlRef.current = null;
    }
    // ブラウザ読み上げも止める（万一使われた場合）
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
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
      for (let i = e.results.length - 1; i >= 0; i--) {
        const r = e.results[i];
        const t = r[0].transcript;
        if (r.isFinal) {
          finalText = t;
          break;
        } else {
          interim = t;
        }
      }
      if (interim) setInterimText(interim);
      if (finalText) {
        setInterimText("");
        void onSend(finalText.trim());
      }
    };
    rec.onerror = () => {
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
      stopPlayback(); // アンマウント時もクリーンアップ
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canEnd = useMemo(() => !loading, [loading]);

  // 自動スクロール
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTo({
        top: chatRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, interimText, loading]);

  // 応答音声を再生（新規開始前に必ず既存を停止）
  async function playVoice(base64: string, mime = "audio/mpeg") {
    try {
      stopPlayback(); // ★ 二重再生防止
      const bin = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const blob = new Blob([bin], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = new Audio(url);
      replyAudioRef.current = a;
      replyUrlRef.current = url;
      await a.play();
      // 明示的なrevokeは stopPlayback() 側でまとめて行う
    } catch {
      /* 自動再生できない場合は黙ってスキップ */
    }
  }

  // 送信
  async function onSend(textArg?: string) {
    // ★ 送信時点で再生を停止
    stopPlayback();

    const text = (textArg ?? input).trim();
    if (!text) return;
    setInput("");
    setMessages((p) => [...p, { role: "user", content: text }]);
    setLoading(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        cache: "no-store",
      });
      const data: ApiResp = await res.json();
      const reply =
        typeof data?.reply === "string" ? data.reply : "（応答の取得に失敗しました）";
      setMessages((p) => [...p, { role: "assistant", content: reply }]);
      if (data?.audioBase64) await playVoice(data.audioBase64, data.mime || "audio/mpeg");
    } catch {
      setMessages((p) => [
        ...p,
        { role: "assistant", content: "エラーが発生しました。あとで再試行してください。" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // マイク開始/停止
  function toggleListen() {
    // ★ 話すボタンでも再生を停止
    stopPlayback();

    if (!sttSupported) return;
    if (listening) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setListening(false);
      setInterimText("");
      return;
    }
    try {
      setInterimText("");
      recognitionRef.current?.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }

  // 対話終了：完了音再生の前に停止 → ログ取得 → onFinish
  async function onEnd() {
    if (!canEnd) return;

    // ★ 対話終了でも再生を停止
    stopPlayback();

    // 完了音（MP3 or Web Speech API）
    let played = false;
    if (endAudioRef.current) {
      try {
        await endAudioRef.current.play();
        played = true;
      } catch {
        played = false;
      }
    }
    if (!played && "speechSynthesis" in window) {
      const utt = new SpeechSynthesisUtterance("実行完了！");
      utt.lang = "ja-JP";
      window.speechSynthesis.speak(utt);
    }

    // ログ取得 → 親へ渡してエディタへ切替（親が制御）
    try {
      const r = await fetch("/api/finish", { method: "POST", cache: "no-store" });
      const { content } = (await r.json()) as { content?: string };
      const text = content || "（会話ログはまだありません）";
      if (onFinish) onFinish(text);
      else setMessages((p) => [...p, { role: "assistant", content: text }]); // 互換
    } catch {
      if (onFinish) onFinish("会話ログの取得に失敗しました。");
      else
        setMessages((p) => [
          ...p,
          { role: "assistant", content: "会話ログの取得に失敗しました。" },
        ]);
    }
  }

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div ref={chatRef} className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${
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
        {loading && <div className="text-xs text-gray-500">Pythonで応答＆ログ保存/音声生成中…</div>}
      </div>

      <div className="border-t p-3 flex gap-2 items-center">
        <button
          type="button"
          onClick={toggleListen}
          disabled={!sttSupported}
          className={`rounded-lg px-3 py-2 text-sm font-medium border transition
            ${listening ? "bg-red-600 text-white border-red-700" : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"}
          `}
          title={sttSupported ? "音声入力の開始/停止" : "このブラウザは音声入力に未対応です"}
        >
          {listening ? "■ 停止" : "🎤 話す"}
        </button>

        {!sttSupported && (
          <span className="text-xs text-gray-500">音声入力は Chrome 系でご利用ください。</span>
        )}

        <input
          className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="メッセージを入力…（🎤でもOK）"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          disabled={loading}
        />
        <button
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          onClick={() => onSend()}
          disabled={loading || !input.trim()}
        >
          送 信
        </button>
        <button
          className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          onClick={onEnd}
          disabled={!canEnd}
          title="対話終了（エディタに移動）"
        >
          対話終了
        </button>
      </div>
    </div>
  );
}
