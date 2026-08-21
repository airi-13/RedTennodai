import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

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
              <nav className="flex gap-4 text-sm">
                <Link
                  href="/attendance"
                  className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                >
                  出欠入力
                </Link>
                <Link
                  href="/students"
                  className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                >
                  生徒管理
                </Link>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
