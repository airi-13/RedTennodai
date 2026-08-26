"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { studentLogoutAction } from "@/app/login/actions";
import { adminLogoutAction } from "@/app/admin-login/actions";

const STUDENT_SIDE = ["/my", "/login"];
const ADMIN_SIDE = [
  "/attendance",
  "/students",
  "/requests",
  "/admin-calendar",
  "/materials",
  "/dashboard",
];

const adminLinks = [
  { href: "/dashboard", label: "カレンダー" },
  { href: "/attendance", label: "出欠入力" },
  { href: "/students", label: "生徒管理" },
  { href: "/requests", label: "申請" },
  { href: "/admin-calendar", label: "カレンダー管理" },
  { href: "/materials", label: "教材・料金" },
];

const studentLinks = [
  { href: "/my", label: "カレンダー" },
  { href: "/my/history", label: "出欠履歴" },
  { href: "/my/textbooks", label: "使用テキスト" },
  { href: "/my/pricing", label: "費用シミュレーション" },
  { href: "/my/request", label: "欠席・振替を申請" },
];

export function HeaderNav() {
  const pathname = usePathname();
  const isStudentSide = STUDENT_SIDE.some((p) => pathname.startsWith(p));
  const isAdminSide = ADMIN_SIDE.some((p) => pathname.startsWith(p));

  if (!isStudentSide && !isAdminSide) return null;

  const links = isStudentSide ? studentLinks : adminLinks;

  return (
    <nav className="flex flex-1 flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-4 text-sm">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={
              pathname === l.href
                ? "font-bold text-[var(--color-accent)]"
                : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
            }
          >
            {l.label}
          </Link>
        ))}
      </div>
      <form action={isStudentSide ? studentLogoutAction : adminLogoutAction}>
        <button className="text-xs text-[var(--color-ink-soft)] underline">
          ログアウト
        </button>
      </form>
    </nav>
  );
}
