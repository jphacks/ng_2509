// app/api/delete/route.ts
import { NextResponse } from "next/server";
import { spawn } from "node:child_process";

export const runtime = "nodejs";

async function runPython(scriptPath: string) {
  const pyCmd = process.platform === "win32" ? "python" : "python3";
  const py = spawn(pyCmd, [scriptPath], {
    cwd: process.cwd(),
    stdio: ["pipe", "pipe", "pipe"],
  });

  let out = ""; let err = "";
  py.stdout.on("data", d => (out += d.toString()));
  py.stderr.on("data", d => (err += d.toString()));

  const code: number = await new Promise((r) => py.on("close", (c) => r(c ?? 0)));
  return { code, out, err };
}

export async function POST() {
  try {
    // 保存は行わず、conversation.txt だけ初期化
    const { code, err } = await runPython("python/delete_logs.py");
    if (code !== 0) {
      return NextResponse.json({ error: err || "delete_logs failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unexpected error" }, { status: 500 });
  }
}
