"use client";

import { useMemo, useState, useTransition } from "react";
import type { AttendanceRequestWithStudent, Period } from "@/lib/types";
import type { StudentRequest } from "@/lib/data/student-requests";
import { ADDITIONAL_REQUEST_LABEL } from "@/lib/data/student-requests";
import { approveRequestAction, rejectRequestAction, cancelApprovedRequestAction, approveStudentRequestAction, rejectStudentRequestAction } from "./actions";

const TYPE_LABEL = { absence: "欠席", makeup: "振替" } as const;
const STATUS_LABEL = { pending: "確認待ち", approved: "登録済み", rejected: "取り消し済み" } as const;
const DAYS = ["日", "月", "火", "水", "木", "金", "土"];

export function RequestsView({ requests, studentRequests, periods }: { requests: AttendanceRequestWithStudent[]; studentRequests: StudentRequest[]; periods: Period[] }) {
  const periodById = useMemo(() => new Map(periods.map((p) => [p.id, p.name])), [periods]);
  const pending = requests.filter((r) => r.status === "pending");
  const processed = requests.filter((r) => r.status !== "pending");
  const additionalPending = studentRequests.filter((r) => r.status === "pending");
  const additionalProcessed = studentRequests.filter((r) => r.status !== "pending");

  return <div className="space-y-8">
    <div><h1 className="text-lg font-semibold">申請</h1><p className="mt-1 text-sm text-[var(--color-ink-soft)]">生徒からの各種申請を確認・処理します。</p></div>
    <section className="space-y-3"><h2 className="text-sm font-medium text-[var(--color-ink-soft)]">各種申請（確認待ち・{additionalPending.length}件）</h2>{additionalPending.length === 0 ? <p className="text-sm text-[var(--color-ink-soft)]">ありません</p> : <ul className="divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">{additionalPending.map((r) => <AdditionalRequestRow key={r.id} request={r} periods={periods} />)}</ul>}</section>
    {additionalProcessed.length > 0 && <section className="space-y-3"><h2 className="text-sm font-medium text-[var(--color-ink-soft)]">各種申請の履歴</h2><ul className="divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">{additionalProcessed.map((r) => <AdditionalRequestRow key={r.id} request={r} periods={periods} />)}</ul></section>}
    <section className="space-y-3"><h2 className="text-sm font-medium text-[var(--color-ink-soft)]">欠席・振替（確認待ち・{pending.length}件）</h2>{pending.length === 0 ? <p className="text-sm text-[var(--color-ink-soft)]">ありません</p> : <ul className="divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">{pending.map((r) => <RequestRow key={r.id} request={r} periodById={periodById} actionable />)}</ul>}</section>
    {processed.length > 0 && <section className="space-y-3"><h2 className="text-sm font-medium text-[var(--color-ink-soft)]">欠席・振替の履歴</h2><ul className="divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">{processed.map((r) => <RequestRow key={r.id} request={r} periodById={periodById} actionable={false} />)}</ul></section>}
  </div>;
}

function AdditionalRequestRow({ request, periods }: { request: StudentRequest; periods: Period[] }) {
  const [isPending, startTransition] = useTransition();
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const d = request.details;
  const detail = request.request_type === "textbook_purchase"
    ? `テキスト: ${d.textbook_title ?? `ID:${d.textbook_id ?? "-"}`} ／ ${d.quantity ?? "1"}冊`
    : request.request_type === "interview"
      ? `希望日: ${d.preferred_date ?? "-"} ／ ${d.preferred_time ?? "-"}`
      : request.request_type === "lesson_count_change"
        ? `希望週: ${d.desired_count ?? "-"}コマ`
        : `変更元: ${DAYS[Number(d.current_day_of_week)] ?? "-"}曜 ${d.current_period_name || periodName(periods, d.current_period_id)} ／ 変更後: ${DAYS[Number(d.desired_day_of_week)] ?? "-"}曜 ${periodName(periods, d.desired_period_id)}`;

  return <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"><div><div className="flex items-center gap-2"><span className="font-medium">{request.studentName}</span><span className="rounded-full bg-[var(--color-accent-soft)] px-2 py-0.5 text-xs text-[var(--color-accent)]">{ADDITIONAL_REQUEST_LABEL[request.request_type]}</span></div><p className="mt-1 text-sm text-[var(--color-ink-soft)]">{detail}</p>{request.reason && <p className="mt-1 text-sm text-[var(--color-ink-soft)]">備考: {request.reason}</p>}</div><div className="flex flex-col items-end gap-1">{request.status === "pending" ? <div className="flex gap-2"><button disabled={isPending} onClick={() => startTransition(async () => { await approveStudentRequestAction(request.id); setResultMsg("承認しました"); })} className="rounded-md px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50" style={{ background: "var(--color-present)" }}>承認</button><button disabled={isPending} onClick={() => startTransition(async () => { await rejectStudentRequestAction(request.id); setResultMsg("却下しました"); })} className="rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-50" style={{ borderColor: "var(--color-absent)", color: "var(--color-absent)" }}>却下</button></div> : <span className="text-xs text-[var(--color-ink-soft)]">{STATUS_LABEL[request.status]}</span>}{resultMsg && <span className="text-[10px] text-[var(--color-ink-soft)]">{resultMsg}</span>}</div></li>;
}

function periodName(periods: Period[], id?: string) { return periods.find((p) => p.id === Number(id))?.name ?? "-"; }

function RequestRow({ request, periodById, actionable }: { request: AttendanceRequestWithStudent; periodById: Map<number, string>; actionable: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  return <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"><div><div className="flex items-center gap-2"><span className="font-medium">{request.studentName}</span><span className="rounded-full bg-[var(--color-accent-soft)] px-2 py-0.5 text-xs text-[var(--color-accent)]">{TYPE_LABEL[request.request_type]}</span></div><p className="mt-1 text-sm text-[var(--color-ink-soft)]">対象: {request.target_date}{request.target_period_id && ` ${periodById.get(request.target_period_id) ?? ""}`}{request.request_type === "makeup" && request.makeup_date && <> → 振替先: {request.makeup_date} {request.makeup_period_id && periodById.get(request.makeup_period_id)}</>}</p>{request.reason && <p className="mt-1 text-sm text-[var(--color-ink-soft)]">理由: {request.reason}</p>}</div><div className="flex flex-col items-end gap-1">{actionable ? <div className="flex gap-2"><button disabled={isPending} onClick={() => startTransition(async () => { const res = await approveRequestAction(request.id); setResultMsg(res.reflected ? "承認し、出欠にも反映しました" : "承認しました（出欠には未反映）"); })} className="rounded-md px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50" style={{ background: "var(--color-present)" }}>承認</button><button disabled={isPending} onClick={() => startTransition(async () => { await rejectRequestAction(request.id); setResultMsg("却下しました"); })} className="rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-50" style={{ borderColor: "var(--color-absent)", color: "var(--color-absent)" }}>却下</button></div> : request.status === "approved" ? <button disabled={isPending} onClick={() => startTransition(async () => { await cancelApprovedRequestAction(request.id); setResultMsg("取り消しました"); })} className="rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-50" style={{ borderColor: "var(--color-absent)", color: "var(--color-absent)" }}>取り消す</button> : <span className="text-xs text-[var(--color-ink-soft)]">{STATUS_LABEL[request.status]}</span>}{resultMsg && <span className="max-w-[16rem] text-right text-[10px] text-[var(--color-ink-soft)]">{resultMsg}</span>}</div></li>;
}
