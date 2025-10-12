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

    // 1) 応答テキストを Python で生成
    const replyProc = await runPython("python/agent.py", input);
    if (replyProc.code !== 0) {
      return NextResponse.json(
        { error: replyProc.err || "agent.py failed" },
        { status: 500 }
      );
    }

    // agent.py は {"reply": "..."} を出力
    let reply = "（応答解析に失敗しました）";
    try {
      const json = JSON.parse(replyProc.out);
      reply = String(json.reply ?? reply);
    } catch {
      reply = replyProc.out?.trim() || reply;
    }

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
