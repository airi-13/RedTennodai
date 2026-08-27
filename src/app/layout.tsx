import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";
import { HeaderNav } from "./HeaderNav";

export const metadata: Metadata = {
  title: "自立学習RED 天王台教室",
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
          <header className="border-b border-gray-200 bg-white">
            <div className="mx-auto flex max-w-4xl items-center gap-6 bg-white px-4 py-3">
              <Link href="/" className="shrink-0">
                <Image src="/logo.png" alt="自立学習RED" width={140} height={40} priority />
              </Link>
              <HeaderNav />
            </div>
          </header>
          <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
