"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { submitRequestAction } from "./actions";

const inputClass = "w-full rounded-xl border border-[var(--color-border)] bg-white/70 px-3.5 py-3 text-sm outline-none transition placeholder:text-[var(--color-ink-soft)]/70 focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/10";

export type RequestDraft = {
  requestType: "absence" | "makeup";
  targetDate: string;
  targetPeriodId: string;
  makeupDate: string;
  makeupPeriodId: string;
  reason: string;
};

export function RequestForm({ periods }: { periods: { id: number; name: string }[] }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(submitRequestAction, undefined);
  const [requestType, setRequestType] = useState<"absence" | "makeup">("absence");

  function goToConfirmation(form: HTMLFormElement) {
    const data = new FormData(form);
    const draft: RequestDraft = {
      requestType,
      targetDate: String(data.get("targetDate") ?? ""),
      targetPeriodId: String(data.get("targetPeriodId") ?? ""),
      makeupDate: String(data.get("makeupDate") ?? ""),
      makeupPeriodId: String(data.get("makeupPeriodId") ?? ""),
      reason: String(data.get("reason") ?? ""),
    };

    if (!draft.targetDate) return;
    sessionStorage.setItem("red-tennodai-request-draft", JSON.stringify(draft));
    router.push("/my/request/confirm");
  }

  return (
    <div className="mx-auto w-full max-w-2xl pb-10">
      <Link href="/my" className="inline-flex items-center gap-1 py-2 text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">← マイページに戻る</Link>
      <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_12px_30px_rgba(27,42,74,0.06)]">
        <header className="border-b border-[var(--color-border)] px-5 py-6 sm:px-8">
          <p className="text-xs font-bold tracking-[0.16em] text-[var(--color-accent)]">ATTENDANCE REQUEST</p>
          <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">欠席・振替を申請する</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--color-ink-soft)]">授業を休む場合や、別の日への振替を希望する場合はこちらから申請してください。</p>
        </header>

        <form action={formAction} onSubmit={(event) => { event.preventDefault(); goToConfirmation(event.currentTarget); }} className="space-y-7 px-5 py-6 sm:px-8 sm:py-8">
          <section>
            <SectionTitle number="01" title="申請内容" />
            <div className="grid grid-cols-2 gap-3">
              <TypeButton active={requestType === "absence"} onClick={() => setRequestType("absence")} title="欠席" description="授業を休む" icon="休" />
              <TypeButton active={requestType === "makeup"} onClick={() => setRequestType("makeup")} title="振替" description="別の日へ変更" icon="替" />
            </div>
            <input type="hidden" name="requestType" value={requestType} />
          </section>

          <section className="space-y-4">
            <SectionTitle number="02" title="対象の授業" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="対象日" required hint="休む・変更したい授業の日"><input type="date" name="targetDate" required className={inputClass} /></Field>
              <Field label="対象のコマ" hint="分かる場合のみ"><select name="targetPeriodId" className={inputClass}><option value="">指定しない</option>{periods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
            </div>
          </section>

          {requestType === "makeup" && <section className="space-y-4">
            <SectionTitle number="03" title="振替の希望" />
            <div className="rounded-xl border border-[var(--color-makeup)]/25 bg-[var(--color-makeup)]/5 p-4 text-sm leading-6 text-[var(--color-ink-soft)]">希望は任意です。空欄でも申請でき、担当者と相談して決定できます。</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="振替希望日" hint="任意・相談の上決定"><input type="date" name="makeupDate" className={inputClass} /></Field>
              <Field label="振替希望のコマ" hint="任意"><select name="makeupPeriodId" className={inputClass}><option value="">指定しない</option>{periods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
            </div>
          </section>}

          <section className="space-y-4">
            <SectionTitle number={requestType === "makeup" ? "04" : "03"} title="連絡事項" />
            <Field label="理由・連絡事項"><textarea name="reason" rows={4} placeholder="必要があれば、担当者への連絡事項を入力してください" className={`${inputClass} resize-y`} /></Field>
          </section>

          {state?.error && <div role="alert" className="rounded-xl border border-[var(--color-absent)]/25 bg-[var(--color-accent-soft)] px-4 py-3 text-sm leading-6 text-[var(--color-absent)]">{state.error}</div>}

          <div className="border-t border-[var(--color-border)] pt-6">
            <button type="submit" disabled={isPending} className="w-full rounded-xl px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50" style={{ background: "var(--color-accent)" }}>{isPending ? "確認しています…" : "入力内容を確認する"}</button>
            <p className="mt-3 text-center text-xs leading-5 text-[var(--color-ink-soft)]">次の画面で内容を確認してから申請できます。</p>
          </div>
        </form>
      </div>
    </div>
  );
}

function SectionTitle({ number, title }: { number: string; title: string }) {
  return <div className="mb-3 flex items-baseline gap-2"><span className="text-xs font-bold tracking-widest text-[var(--color-accent)]">{number}</span><h2 className="text-sm font-bold">{title}</h2></div>;
}

function TypeButton({ active, onClick, title, description, icon }: { active: boolean; onClick: () => void; title: string; description: string; icon: string }) {
  return <button type="button" onClick={onClick} aria-pressed={active} className={`rounded-xl border p-4 text-left transition ${active ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]/60 ring-2 ring-[var(--color-accent)]/10" : "border-[var(--color-border)] bg-white/40 hover:border-[var(--color-ink-soft)]"}`}>
    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${active ? "bg-[var(--color-accent)] text-white" : "bg-[var(--color-bg)] text-[var(--color-ink-soft)]"}`}>{icon}</span>
    <span className="mt-3 block text-sm font-bold">{title}</span><span className="mt-1 block text-xs text-[var(--color-ink-soft)]">{description}</span>
  </button>;
}

function Field({ label, hint, required = false, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block space-y-1.5 text-sm"><span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 font-medium">{label}{required && <span className="text-xs font-bold text-[var(--color-accent)]">必須</span>}{hint && <span className="text-xs font-normal text-[var(--color-ink-soft)]">{hint}</span>}</span>{children}</label>;
}
