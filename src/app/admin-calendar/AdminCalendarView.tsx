"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { Period, PeriodAvailability } from "@/lib/types";
import { setPeriodAvailabilityAction } from "./actions";

const DOW_LABEL = ["日", "月", "火", "水", "木", "金", "土"];

// このページは「開講枠(曜日×コマの開講/休止)」と「受付人数の上限」の管理専用。
// 休講・お知らせ・学校行事・塾の予定・TODOなどは、カレンダー(全体)の「新規登録」「編集」から操作する。
export function AdminCalendarView({
  periods,
  periodAvailability,
  enrollmentCounts,
}: {
  periods: Period[];
  periodAvailability: PeriodAvailability[];
  enrollmentCounts: Record<string, number>;
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">カレンダー管理(開講枠・人数)</h1>
        <p className="text-xs text-[var(--color-ink-soft)]">
          曜日×コマごとの開講/休止と、受付人数の上限を設定します。休講・お知らせ・学校行事・TODOなどの予定は、
          <Link href="/dashboard" className="underline">
            カレンダー(全体)
          </Link>
          の「新規登録」「編集」から操作してください。
        </p>
      </div>

      <PeriodAvailabilitySection
        periods={periods}
        periodAvailability={periodAvailability}
        enrollmentCounts={enrollmentCounts}
      />
    </div>
  );
}

function PeriodAvailabilitySection({
  periods,
  periodAvailability,
  enrollmentCounts,
}: {
  periods: Period[];
  periodAvailability: PeriodAvailability[];
  enrollmentCounts: Record<string, number>;
}) {
  const [isPending, startTransition] = useTransition();
  // 楽観的に画面側でも即時反映しておく(保存自体はセルごとに個別実行)
  const [localAvailability, setLocalAvailability] = useState(periodAvailability);
  const [capacityText, setCapacityText] = useState<Record<string, string>>(
    Object.fromEntries(periodAvailability.map((a) => [`${a.day_of_week}:${a.period_id}`, a.capacity == null ? "" : String(a.capacity)]))
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const byKey = new Map(localAvailability.map((a) => [`${a.day_of_week}:${a.period_id}`, a]));

  function updateLocal(dayOfWeek: number, periodId: number, patch: Partial<PeriodAvailability>) {
    setLocalAvailability((current) =>
      current.map((a) => (a.day_of_week === dayOfWeek && a.period_id === periodId ? { ...a, ...patch } : a))
    );
  }

  function toggleOpen(dayOfWeek: number, periodId: number, current: PeriodAvailability) {
    const nextOpen = !current.is_open;
    const prevOpen = current.is_open;
    updateLocal(dayOfWeek, periodId, { is_open: nextOpen });
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await setPeriodAvailabilityAction(dayOfWeek, periodId, nextOpen, current.capacity);
      } catch (e: any) {
        updateLocal(dayOfWeek, periodId, { is_open: prevOpen });
        setErrorMsg(e?.message ?? "保存に失敗しました");
      }
    });
  }

  // 入力中は文字列だけ保持し、フォーカスが外れた時にまとめて保存する
  // (キー入力のたびにサーバーへ送ると、数字が確定する前の状態でエラーになりやすいため)。
  function onCapacityInput(dayOfWeek: number, periodId: number, text: string) {
    setCapacityText((prev) => ({ ...prev, [`${dayOfWeek}:${periodId}`]: text }));
  }

  function commitCapacity(dayOfWeek: number, periodId: number, current: PeriodAvailability) {
    const key = `${dayOfWeek}:${periodId}`;
    const text = capacityText[key] ?? "";
    const capacity = text.trim() === "" ? null : Number(text);
    if (Number.isNaN(capacity)) {
      setCapacityText((prev) => ({ ...prev, [key]: current.capacity == null ? "" : String(current.capacity) }));
      return;
    }
    if (capacity === current.capacity) return;
    const prevCapacity = current.capacity;
    updateLocal(dayOfWeek, periodId, { capacity });
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await setPeriodAvailabilityAction(dayOfWeek, periodId, current.is_open, capacity);
      } catch (e: any) {
        updateLocal(dayOfWeek, periodId, { capacity: prevCapacity });
        setCapacityText((prev) => ({ ...prev, [key]: prevCapacity == null ? "" : String(prevCapacity) }));
        setErrorMsg(e?.message ?? "保存に失敗しました");
      }
    });
  }

  return (
    <SectionCard title="開講枠・人数管理(デフォルトの曜日・コマ設定)">
      <p className="text-xs text-[var(--color-ink-soft)]">
        曜日×コマごとに、その枠を受け付けるか(開講/休講)と、人数の上限(空欄=無制限)を設定できます。
        「在籍」は現在その枠に定期スケジュールを持つ生徒数です。特定の1日だけの休講・特別開講は下の「休講・特別開講」で設定してください。
      </p>
      {errorMsg && (
        <p className="text-xs" style={{ color: "var(--color-error)" }}>
          {errorMsg}
        </p>
      )}
      <div className="overflow-auto">
        <table className="min-w-[900px] border-collapse text-xs">
          <thead>
            <tr>
              <th className="border-b border-r border-[var(--color-border)] px-2 py-2 text-left">コマ</th>
              {DOW_LABEL.map((label) => (
                <th key={label} className="border-b border-r border-[var(--color-border)] px-2 py-2 text-center">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((period) => (
              <tr key={period.id}>
                <td className="whitespace-nowrap border-b border-r border-[var(--color-border)] px-2 py-2 font-medium">{period.name}</td>
                {DOW_LABEL.map((_, dayOfWeek) => {
                  const key = `${dayOfWeek}:${period.id}`;
                  const availability = byKey.get(key);
                  if (!availability) {
                    return <td key={dayOfWeek} className="border-b border-r border-[var(--color-border)] px-2 py-2 text-center text-[var(--color-ink-soft)]">-</td>;
                  }
                  const count = enrollmentCounts[key] ?? 0;
                  const overCapacity = availability.capacity != null && count > availability.capacity;
                  return (
                    <td key={dayOfWeek} className="border-b border-r border-[var(--color-border)] px-2 py-1 text-center align-top">
                      <div className="flex flex-col items-center gap-1">
                        <button
                          disabled={isPending}
                          onClick={() => toggleOpen(dayOfWeek, period.id, availability)}
                          className="rounded-full border px-2 py-0.5 text-[10px] font-medium disabled:opacity-50"
                          style={
                            availability.is_open
                              ? { background: "var(--color-present)", borderColor: "var(--color-present)", color: "white" }
                              : { borderColor: "var(--color-border)", color: "var(--color-ink-soft)" }
                          }
                        >
                          {availability.is_open ? "開講" : "休講"}
                        </button>
                        {availability.is_open && (
                          <>
                            <input
                              value={capacityText[key] ?? ""}
                              onChange={(e) => onCapacityInput(dayOfWeek, period.id, e.target.value)}
                              onBlur={() => commitCapacity(dayOfWeek, period.id, availability)}
                              placeholder="無制限"
                              inputMode="numeric"
                              className="w-14 rounded border border-[var(--color-border)] px-1 py-0.5 text-center text-[10px]"
                            />
                            <span className="text-[10px]" style={overCapacity ? { color: "var(--color-error)", fontWeight: "bold" } : { color: "var(--color-ink-soft)" }}>
                              在籍 {count}{availability.capacity != null && ` / ${availability.capacity}`}
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h2 className="font-medium">{title}</h2>
      {children}
    </section>
  );
}
