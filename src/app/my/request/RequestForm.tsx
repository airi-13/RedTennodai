"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { submitRequestAction } from "./actions";

export function RequestForm({
  periods,
}: {
  periods: { id: number; name: string }[];
}) {
  const [state, formAction, isPending] = useActionState(
    submitRequestAction,
    undefined
  );
  const [requestType, setRequestType] = useState<"absence" | "makeup">(
    "absence"
  );

  return (
    <div className="max-w-md space-y-4">
      <Link href="/my" className="text-sm text-[var(--color-ink-soft)] underline">
        ← マイページに戻る
      </Link>
      <h1 className="text-lg font-semibold">欠席・振替を申請する</h1>

      <form action={formAction} className="space-y-4">
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="requestType"
              value="absence"
              checked={requestType === "absence"}
              onChange={() => setRequestType("absence")}
            />
            欠席
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="requestType"
              value="makeup"
              checked={requestType === "makeup"}
              onChange={() => setRequestType("makeup")}
            />
            振替
          </label>
        </div>

        <Field label="対象日(休む/変更したい授業の日)">
          <input
            type="date"
            name="targetDate"
            required
            className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
          />
        </Field>

        <Field label="対象のコマ(任意)">
          <select
            name="targetPeriodId"
            className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
          >
            <option value="">指定しない</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>

        {requestType === "makeup" && (
          <>
            <Field label="振替希望日(任意、相談の上決定)">
              <input
                type="date"
                name="makeupDate"
                className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
              />
            </Field>
            <Field label="振替希望のコマ(任意)">
              <select
                name="makeupPeriodId"
                className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
              >
                <option value="">指定しない</option>
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}

        <Field label="理由・連絡事項(任意)">
          <textarea
            name="reason"
            rows={3}
            className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
          />
        </Field>

        {state?.error && (
          <p className="text-sm" style={{ color: "var(--color-absent)" }}>
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: "var(--color-accent)" }}
        >
          送信する
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-[var(--color-ink-soft)]">{label}</span>
      {children}
    </label>
  );
}
