// app/api/save/route.ts
import { NextResponse } from "next/server";
import { spawn } from "node:child_process";

export const runtime = "nodejs";

async function runPython(scriptPath: string, stdinText: string, args: string[]) {
  const pyCmd = process.platform === "win32" ? "python" : "python3";
  const py = spawn(pyCmd, [scriptPath, ...args], {
    cwd: process.cwd(),
    stdio: ["pipe", "pipe", "pipe"],
  });

  let out = "";
  let err = "";
  py.stdout.on("data", (d) => (out += d.toString()));
  py.stderr.on("data", (d) => (err += d.toString()));
  py.stdin.write(stdinText);
  py.stdin.end();

  const code: number = await new Promise((r) => py.on("close", (c) => r(c ?? 0)));
  return { code, out, err };
}

export async function POST(req: Request) {
  try {
    const { content, date, time } = await req.json();
    const text = String(content ?? "");
    const d = typeof date === "string" && date ? date : "";
    const t = typeof time === "string" && time ? time : "";

    const args: string[] = [];
    if (d) args.push("--date", d);
    if (t) args.push("--time", t);

    const { code, out, err } = await runPython("python/save_text_by_date.py", text, args);
    if (code !== 0) {
      return NextResponse.json({ error: err || "save_text_by_date failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, path: out.trim() });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unexpected error" }, { status: 500 });
  }
}
