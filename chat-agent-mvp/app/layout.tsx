// app/layout.tsx
// Tailwindを読み込む共通レイアウト。/styles/globals.css を使う指定にしています。
import "../styles/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "対話型エージェント MVP",
  description: "Next.js + TypeScript + Tailwind + Python(child_process)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
