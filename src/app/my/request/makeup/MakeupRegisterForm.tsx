"use client";

import { useActionState } from "react";
import { registerMakeupAction } from "./actions";

const inputClass = "w-full rounded-xl border border-[var(--color-border)] bg-white/70 px-3.5 py-3 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/10";

type Period = { id: number; name: string };

export function MakeupRegisterForm({ recordId, minDate, maxDate, periods }: { recordId: number; minDate: string; maxDate: string; periods: Period[] }) {
  const [state, action, pending] = useActionState(registerMakeupAction, undefined);

  return (
    <form action={action} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <input type="hidden" name="recordId" value={recordId} />
      <label className="block space-y-1.5 text-sm">
        <span className="text-xs font-medium">振替日</span>
        <input type="date" name="makeupDate" min={minDate} max={maxDate} required className={inputClass} />
      </label>
      <label className="block space-y-1.5 text-sm">
        <span className="text-xs font-medium">振替コマ</span>
        <select name="makeupPeriodId" required className={inputClass}>
          <option value="">選択してください</option>
          {periods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <button type="submit" disabled={pending} className="rounded-xl px-4 py-3 text-sm font-bold text-white transition hover:opacity-95 disabled:opacity-50" style={{ background: "var(--color-accent)" }}>
        {pending ? "登録中…" : "振替日を登録"}
      </button>
      {state?.error && <p role="alert" className="text-xs text-[var(--color-absent)] sm:col-span-3">{state.error}</p>}
      {state?.success && <p className="text-xs text-[var(--color-ink-soft)] sm:col-span-3">振替を登録しました。</p>}
    </form>
  );
}
