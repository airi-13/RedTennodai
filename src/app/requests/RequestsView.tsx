"use client";

import { useMemo, useTransition } from "react";
import type { AttendanceRequestWithStudent, Period } from "@/lib/types";
import { approveRequestAction, rejectRequestAction } from "./actions";

const TYPE_LABEL = { absence: "欠席申請", makeup: "振替申請" } as const;
const STATUS_LABEL = { pending: "確認待ち", approved: "承認済み", rejected: "却下" } as const;

export function RequestsView({
  requests,
  periods,
}: {
  requests: AttendanceRequestWithStudent[];
  periods: Period[];
}) {
  const periodById = useMemo(
    () => new Map(periods.map((p) => [p.id, p.name])),
    [periods]
  );
  const pending = requests.filter((r) => r.status === "pending");
  const processed = requests.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold">申請一覧</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
          承認しても出欠記録は自動更新されません。承認後、必要に応じて「出欠入力」画面から反映してください。
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-[var(--color-ink-soft)]">
          確認待ち({pending.length}件)
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-soft)]">ありません</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
            {pending.map((r) => (
              <RequestRow key={r.id} request={r} periodById={periodById} actionable />
            ))}
          </ul>
        )}
      </section>

      {processed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-[var(--color-ink-soft)]">履歴</h2>
          <ul className="divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
            {processed.map((r) => (
              <RequestRow key={r.id} request={r} periodById={periodById} actionable={false} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function RequestRow({
  request,
  periodById,
  actionable,
}: {
  request: AttendanceRequestWithStudent;
  periodById: Map<number, string>;
  actionable: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium">{request.studentName}</span>
          <span className="rounded-full bg-[var(--color-accent-soft)] px-2 py-0.5 text-xs text-[var(--color-accent)]">
            {TYPE_LABEL[request.request_type]}
          </span>
        </div>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
          対象: {request.target_date}
          {request.target_period_id && ` ${periodById.get(request.target_period_id) ?? ""}`}
          {request.request_type === "makeup" && request.makeup_date && (
            <> → 振替先: {request.makeup_date}{" "}
              {request.makeup_period_id && periodById.get(request.makeup_period_id)}
            </>
          )}
        </p>
        {request.reason && (
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">理由: {request.reason}</p>
        )}
      </div>

      {actionable ? (
        <div className="flex gap-2">
          <button
            disabled={isPending}
            onClick={() => startTransition(() => approveRequestAction(request.id))}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            style={{ background: "var(--color-present)" }}
          >
            承認
          </button>
          <button
            disabled={isPending}
            onClick={() => startTransition(() => rejectRequestAction(request.id))}
            className="rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            style={{ borderColor: "var(--color-absent)", color: "var(--color-absent)" }}
          >
            却下
          </button>
        </div>
      ) : (
        <span className="text-xs text-[var(--color-ink-soft)]">
          {STATUS_LABEL[request.status]}
        </span>
      )}
    </li>
  );
}
