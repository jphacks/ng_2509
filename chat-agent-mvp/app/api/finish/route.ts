// app/api/finish/route.ts
import { NextResponse } from "next/server";
import { spawn } from "node:child_process";

export const runtime = "nodejs";

async function runPython(scriptPath: string, stdinText = "") {
  const pyCmd = process.platform === "win32" ? "python" : "python3";
  const py = spawn(pyCmd, [scriptPath], {
    cwd: process.cwd(),
    stdio: ["pipe", "pipe", "pipe"],
  });

  let out = "";
  let err = "";

  py.stdout.on("data", (d) => (out += d.toString()));
  py.stderr.on("data", (d) => (err += d.toString()));

  if (stdinText) {
    py.stdin.write(stdinText);
  }
  py.stdin.end();

  const code: number = await new Promise((resolve) => {
    py.on("close", (c) => resolve(c ?? 0));
  });

  return { code, out, err };
}

export async function POST() {
  try {
    const { code, out, err } = await runPython("python/dump_logs.py");
    if (code !== 0) {
      return NextResponse.json({ error: err || "dump_logs failed" }, { status: 500 });
    }
    const data = JSON.parse(out);
    return NextResponse.json({ content: data?.content ?? "" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unexpected error" }, { status: 500 });
  }
}
