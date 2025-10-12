import { NextResponse } from "next/server";
import { spawn } from "node:child_process";

export const runtime = "nodejs";

function runPython(scriptPath: string, args: string[], stdinText: string) {
  const pyCmd = process.platform === "win32" ? "python" : "python3";
  const py = spawn(pyCmd, [scriptPath, ...args], { cwd: process.cwd(), stdio: ["pipe", "pipe", "pipe"] });
  let out = ""; let err = "";
  py.stdout.on("data", d => (out += d.toString()));
  py.stderr.on("data", d => (err += d.toString()));
  py.stdin.write(stdinText); py.stdin.end();
  return new Promise<{ code: number; out: string; err: string }>((resolve) => {
    py.on("close", (c) => resolve({ code: c ?? 0, out, err }));
  });
}

export async function POST(req: Request) {
  try {
    const { date, content } = await req.json();
    const args = ["--date", String(date || "")];
    const { code, out, err } = await runPython("python/diary_save.py", args, String(content ?? ""));
    if (code !== 0) return NextResponse.json({ error: err || "diary_save failed" }, { status: 500 });
    return NextResponse.json({ ok: true, path: out.trim() });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unexpected error" }, { status: 500 });
  }
}
