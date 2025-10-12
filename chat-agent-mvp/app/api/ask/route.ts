// app/api/ask/route.ts
import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

export const runtime = "nodejs";

async function runPython(scriptPath: string, stdinText: string, extraArgs: string[] = []) {
  const pyCmd = process.platform === "win32" ? "python" : "python3";
  const py = spawn(pyCmd, [scriptPath, ...extraArgs], {
    cwd: process.cwd(),
    stdio: ["pipe", "pipe", "pipe"],
  });

  let out = "";
  let err = "";

  py.stdout.on("data", (d) => (out += d.toString()));
  py.stderr.on("data", (d) => (err += d.toString()));

  py.stdin.write(stdinText);
  py.stdin.end();

  const code: number = await new Promise((resolve) => {
    py.on("close", (c) => resolve(c ?? 0));
  });

  return { code, out, err };
}

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    const input = String(text ?? "");

    console.log("1. Received input text:", input); // ① 入力テキストを受け取ったか

    const res = await fetch("http://localhost:8000/chat", { // ← URLを直接記述
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history_text: input }), 
    });

    console.log("3. API response status:", res.status, res.statusText); // ③ FastAPIからの応答ステータス

    // APIサーバーがエラーを返した場合の処理
    if (!res.ok) {
      const errorText = await res.text(); // JSONではなくまずテキストとしてエラー内容を取得
      console.error("4. API returned an error:", errorText); // ④ エラー内容をログに出力
      return NextResponse.json(
        { error: "API request failed", detail: errorText },
        { status: res.status }
      );
    }

    // FastAPIからの正常な応答をJSONとして受け取る
    const apiResponse = await res.json();
    console.log("5. Parsed API response:", apiResponse); // ⑤ JSONは正しくパースできたか

    const reply = apiResponse.response_text;
    if (!reply) {
      console.error("6. 'response_text' key not found in API response!"); // ⑥ 目的のキーは存在したか
      throw new Error("'response_text' key not found in API response");
    }
    
    console.log("7. Extracted reply:", reply); // ⑦ 応答テキストの取り出しに成功

    // 2) 応答テキストを Python で音声化 → 一時ファイルに保存
    const tmpOut = path.join(os.tmpdir(), `voice-${Date.now()}.mp3`);
    const voiceProc = await runPython("python/voice.py", reply, [
      "--out",
      tmpOut,
      "--lang",
      "ja",
      "--tld",
      "co.jp",
      "--speed",
      "1.25",
    ]);

    let audioBase64: string | null = null;
    if (voiceProc.code === 0) {
      try {
        const buf = await fs.readFile(tmpOut);
        audioBase64 = buf.toString("base64");
        await fs.unlink(tmpOut).catch(() => {});
      } catch (e) {
        // 読み込みに失敗したら無音で返す
        audioBase64 = null;
      }
    } else {
      // 音声化失敗（gTTS/FFmpegが無い or ネットワーク不通）→ テキストのみ返す
      audioBase64 = null;
    }

    return NextResponse.json({ reply, audioBase64, mime: "audio/mpeg" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unexpected error" }, { status: 500 });
  }
}
