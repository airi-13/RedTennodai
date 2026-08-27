"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useActionState } from "react";
import { submitRequestAction } from "../actions";
import type { RequestDraft } from "../RequestForm";

const STORAGE_KEY = "red-tennodai-request-draft";

export default function RequestConfirmPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<RequestDraft | null>(null);
  const [state, formAction, isPending] = useActionState(submitRequestAction, undefined);

  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      router.replace("/my/request");
      return;
    }
    try {
      setDraft(JSON.parse(raw));
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
      router.replace("/my/request");
    }
  }, [router]);

  if (!draft) return null;

  const targetPeriod = draft.targetPeriodId || "指定しない";
  const makeupPeriod = draft.makeupPeriodId || "指定しない";

  return (
    <div className="mx-auto w-full max-w-2xl pb-10">
      <Link href="/my/request" className="inline-flex items-center gap-1 py-2 text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">← 入力画面に戻る</Link>
      <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_12px_30px_rgba(27,42,74,0.06)]">
        <header className="border-b border-[var(--color-border)] px-5 py-6 sm:px-8">
          <p className="text-xs font-bold tracking-[0.16em] text-[var(--color-accent)]">CONFIRM REQUEST</p>
          <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">申請内容の確認</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--color-ink-soft)]">内容をご確認ください。問題なければ「申請を送信する」を押してください。</p>
        </header>

        <form action={formAction} className="px-5 py-6 sm:px-8 sm:py-8">
          <input type="hidden" name="requestType" value={draft.requestType} />
          <input type="hidden" name="targetDate" value={draft.targetDate} />
          <input type="hidden" name="targetPeriodId" value={draft.targetPeriodId} />
          <input type="hidden" name="makeupDate" value={draft.makeupDate} />
          <input type="hidden" name="makeupPeriodId" value={draft.makeupPeriodId} />
          <input type="hidden" name="reason" value={draft.reason} />

          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-white/40">
            <SummaryRow label="申請内容" value={draft.requestType === "absence" ? "欠席" : "振替"} />
            <SummaryRow label="対象日" value={draft.targetDate} />
            <SummaryRow label="対象のコマ" value={targetPeriod} />
            {draft.requestType === "makeup" && <>
              <SummaryRow label="振替希望日" value={draft.makeupDate || "指定しない"} />
              <SummaryRow label="振替希望のコマ" value={makeupPeriod} />
            </>}
            <SummaryRow label="理由・連絡事項" value={draft.reason || "記載なし"} multiline />
          </div>

          {state?.error && <div role="alert" className="mt-5 rounded-xl border border-[var(--color-absent)]/25 bg-[var(--color-accent-soft)] px-4 py-3 text-sm leading-6 text-[var(--color-absent)]">{state.error}</div>}

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
            <Link href="/my/request" className="inline-flex items-center justify-center rounded-xl border border-[var(--color-border)] px-4 py-3.5 text-sm font-bold text-[var(--color-ink)] transition hover:bg-white/60">入力内容を修正する</Link>
            <button type="submit" disabled={isPending} onClick={() => sessionStorage.removeItem(STORAGE_KEY)} className="flex-1 rounded-xl px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50" style={{ background: "var(--color-accent)" }}>{isPending ? "送信しています…" : "申請を送信する"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  return <div className="grid gap-1 border-b border-[var(--color-border)] px-4 py-4 last:border-b-0 sm:grid-cols-[10rem_1fr] sm:gap-4"><span className="text-xs font-medium text-[var(--color-ink-soft)]">{label}</span><span className={`text-sm font-medium ${multiline ? "whitespace-pre-wrap leading-6" : ""}`}>{value}</span></div>;
}
