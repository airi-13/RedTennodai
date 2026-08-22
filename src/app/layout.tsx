import type { Metadata } from "next";
import "./globals.css";
import { HeaderNav } from "./HeaderNav";

export const metadata: Metadata = {
  title: "RED教室 出欠管理",
  description: "RED教室の生徒管理・出欠管理システム",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <div className="min-h-screen">
          <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="mx-auto flex max-w-4xl items-center gap-6 px-4 py-3">
              <span className="font-semibold tracking-tight text-[var(--color-ink)]">
                RED教室
              </span>
              <HeaderNav />
            </div>
          </header>
          <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
