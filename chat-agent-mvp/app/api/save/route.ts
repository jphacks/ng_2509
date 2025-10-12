import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

export const runtime = "nodejs";

function runPythonWithStdin(scriptPath: string, args: string[], stdinText: string) {
  const pyCmd = process.platform === "win32" ? "python" : "python3";
  return new Promise<{ code: number; out: string; err: string }>((resolve) => {
    const child = spawn(pyCmd, [scriptPath, ...args], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (err += d.toString()));
    child.on("close", (code) => resolve({ code: code ?? 0, out, err }));
    child.stdin.write(stdinText ?? "");
    child.stdin.end();
  });
}

export async function POST(req: Request) {
  try {
    const { date, content } = await req.json().catch(() => ({} as any));
    if (!date || typeof date !== "string") {
      return NextResponse.json({ error: "date is required (YYYY-MM-DD)" }, { status: 400 });
    }
    const script = join(process.cwd(), "python", "save_text_by_date.py");
    if (!existsSync(script)) {
      return NextResponse.json({ error: `script not found: ${script}` }, { status: 500 });
    }

    const { code, out, err } = await runPythonWithStdin(script, ["--date", date], String(content ?? ""));
    if (code !== 0) {
      // Python 側のエラーをそのまま返す
      return NextResponse.json({ error: err || "python exited with non-zero code" }, { status: 500 });
    }
    // 正常：保存先パス（絶対パス）を返す
    return NextResponse.json({ ok: true, path: out.trim() });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unexpected error" }, { status: 500 });
  }
}
