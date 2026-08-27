import Link from "next/link";

export const dynamic = "force-dynamic";

export default function MyRequestPage() {
  return (
    <div className="max-w-sm space-y-4">
      <h1 className="text-lg font-semibold">欠席・振替の申請</h1>
      <p className="text-sm text-[var(--color-ink-soft)]">
        欠席・振替は、カレンダー上で該当する授業をタップして申請してください。
      </p>
      <Link
        href="/my"
        className="inline-block rounded-md px-4 py-2 text-sm font-medium text-white"
        style={{ background: "var(--color-accent)" }}
      >
        カレンダーを開く
      </Link>
    </div>
  );
}
