import Link from "next/link";

export const dynamic = "force-dynamic";

export default function RequestCompletePage() {
  return (
    <div className="mx-auto w-full max-w-2xl pb-10">
      <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_12px_30px_rgba(27,42,74,0.06)]">
        <div className="px-5 py-10 text-center sm:px-8 sm:py-14">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-present)]/15 text-2xl font-bold text-[var(--color-present)]" aria-hidden="true">✓</div>
          <p className="mt-6 text-xs font-bold tracking-[0.16em] text-[var(--color-accent)]">REQUEST RECEIVED</p>
          <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">申請を受け付けました</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[var(--color-ink-soft)]">申請内容を受け付けました。担当者が確認のうえ対応します。</p>
          <Link href="/my" className="mt-8 inline-flex w-full items-center justify-center rounded-xl px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:opacity-95 sm:w-auto sm:min-w-56" style={{ background: "var(--color-accent)" }}>マイページへ戻る</Link>
        </div>
      </div>
    </div>
  );
}
