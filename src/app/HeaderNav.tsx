"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const STUDENT_SIDE = ["/my", "/login"];

export function HeaderNav() {
  const pathname = usePathname();
  const isStudentSide = STUDENT_SIDE.some((p) => pathname.startsWith(p));

  if (isStudentSide) {
    // 生徒側は/myページ自体にログアウトボタンがあるため、ここでは何も出さない
    return null;
  }

  return (
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
      <Link
        href="/requests"
        className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
      >
        申請
      </Link>
      <Link
        href="/admin-calendar"
        className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
      >
        カレンダー管理
      </Link>
      <Link
        href="/materials"
        className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
      >
        教材・料金
      </Link>
    </nav>
  );
}
