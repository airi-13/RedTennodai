"use client";

import { useMemo, useState, useTransition } from "react";
import type { AttendanceRequestWithStudent, Period } from "@/lib/types";
import { approveRequestAction, rejectRequestAction, cancelApprovedRequestAction } from "./actions";

const TYPE_LABEL = { absence: "欠席", makeup: "振替" } as const;
const STATUS_LABEL = { pending: "確認待ち", approved: "登録済み", rejected: "取り消し済み" } as const;

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
        <h1 className="text-lg font-semibold">生徒からの欠席・振替 履歴</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
          生徒が登録した欠席・振替は承認不要でその場で出欠に反映されます。ここは履歴確認用です。誤登録などがあれば「取り消す」で出欠の反映を取り消せます。
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-[var(--color-ink-soft)]">
          未反映(対象コマ不明などで自動反映できなかったもの、{pending.length}件)
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
  const [resultMsg, setResultMsg] = useState<string | null>(null);

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

      <div className="flex flex-col items-end gap-1">
        {actionable ? (
          <div className="flex gap-2">
            <button
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const res = await approveRequestAction(request.id);
                  setResultMsg(
                    res.reflected
                      ? "承認し、出欠にも反映しました"
                      : "承認しました(対象コマ未指定のため出欠には未反映。/attendanceから手動入力してください)"
                  );
                })
              }
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
        ) : request.status === "approved" ? (
          <button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await cancelApprovedRequestAction(request.id);
                setResultMsg("取り消しました(出欠記録も削除しました)");
              })
            }
            className="rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            style={{ borderColor: "var(--color-absent)", color: "var(--color-absent)" }}
          >
            取り消す
          </button>
        ) : (
          <span className="text-xs text-[var(--color-ink-soft)]">
            {STATUS_LABEL[request.status]}
          </span>
        )}
        {resultMsg && (
          <span className="max-w-[16rem] text-right text-[10px] text-[var(--color-ink-soft)]">
            {resultMsg}
          </span>
        )}
      </div>
    </li>
  );
}
