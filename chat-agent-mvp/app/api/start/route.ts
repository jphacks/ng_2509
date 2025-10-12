// app/api/start/route.ts
import { NextResponse } from "next/server";
import { spawn } from "node:child_process";

export const runtime = "nodejs";

async function runPython(scriptPath: string) {
  const pyCmd = process.platform === "win32" ? "python" : "python3";
  const py = spawn(pyCmd, [scriptPath], {
    cwd: process.cwd(),
    stdio: ["pipe", "pipe", "pipe"],
  });

  let out = "";
  let err = "";
  py.stdout.on("data", (d) => (out += d.toString()));
  py.stderr.on("data", (d) => (err += d.toString()));

  const code: number = await new Promise((resolve) => {
    py.on("close", (c) => resolve(c ?? 0));
  });

  return { code, out, err };
}

export async function POST() {
  try {
    const { code, err } = await runPython("python/init_logs.py");
    if (code !== 0) {
      return NextResponse.json({ error: err || "init_logs failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unexpected error" }, { status: 500 });
  }
}
