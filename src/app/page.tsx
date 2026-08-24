import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto mt-20 max-w-sm space-y-8 text-center">
      <h1 className="text-xl font-semibold">RED教室</h1>
      <div className="space-y-3">
        <Link
          href="/login"
          className="block w-full rounded-md py-3 text-sm font-medium text-white"
          style={{ background: "var(--color-accent)" }}
        >
          生徒ログイン
        </Link>
        <Link
          href="/admin-login"
          className="block w-full rounded-md border border-[var(--color-border)] py-3 text-sm text-[var(--color-ink-soft)]"
        >
          管理者ログイン
        </Link>
      </div>
    </div>
  );
}
