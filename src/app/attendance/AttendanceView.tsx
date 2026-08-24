"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AttendanceSlot, AttendanceStatus, Period, Subject } from "@/lib/types";
import { setAttendanceStatus } from "./actions";

const DOW_LABEL = ["日", "月", "火", "水", "木", "金", "土"];

const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "出席" },
  { value: "absent", label: "欠席" },
  { value: "late", label: "遅刻" },
  { value: "makeup", label: "振替" },
];

function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

export function AttendanceView({
  date,
  dayOfWeek,
  periods,
  subjects,
  slots,
}: {
  date: string;
  dayOfWeek: number;
  periods: Period[];
  subjects: Subject[];
  slots: AttendanceSlot[];
}) {
  const router = useRouter();

  const slotsByPeriod = useMemo(() => {
    const map = new Map<number, AttendanceSlot[]>();
    for (const s of slots) {
      const list = map.get(s.periodId) ?? [];
      list.push(s);
      map.set(s.periodId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.studentName.localeCompare(b.studentName, "ja"));
    }
    return map;
  }, [slots]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">出欠入力</h1>
        <div className="flex items-center gap-2">
          <button
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm"
            onClick={() => router.push(`/attendance?date=${shiftDate(date, -1)}`)}
          >
            ←前日
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => router.push(`/attendance?date=${e.target.value}`)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm"
          />
          <span className="text-sm text-[var(--color-ink-soft)]">
            ({DOW_LABEL[dayOfWeek]})
          </span>
          <button
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm"
            onClick={() => router.push(`/attendance?date=${shiftDate(date, 1)}`)}
          >
            翌日→
          </button>
        </div>
      </div>

      {periods.length === 0 && (
        <p className="text-sm text-[var(--color-ink-soft)]">
          この曜日は受け付けているコマがありません。(period_availabilityで設定)
        </p>
      )}

      {periods.map((period) => (
        <PeriodCard
          key={period.id}
          period={period}
          periods={periods}
          subjects={subjects}
          date={date}
          slots={slotsByPeriod.get(period.id) ?? []}
        />
      ))}
    </div>
  );
}

function PeriodCard({
  period,
  periods,
  subjects,
  date,
  slots,
}: {
  period: Period;
  periods: Period[];
  subjects: Subject[];
  date: string;
  slots: AttendanceSlot[];
}) {
  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
      <header className="flex items-baseline gap-2 border-b border-[var(--color-border)] px-4 py-2">
        <span className="font-medium">{period.name}</span>
        {period.start_time && period.end_time && (
          <span className="text-xs text-[var(--color-ink-soft)]">
            {period.start_time.slice(0, 5)}〜{period.end_time.slice(0, 5)}
          </span>
        )}
      </header>
      {slots.length === 0 ? (
        <p className="px-4 py-3 text-sm text-[var(--color-ink-soft)]">
          予定されている生徒はいません
        </p>
      ) : (
        <ul className="divide-y divide-[var(--color-border)]">
          {slots.map((slot) =>
            slot.isTransferAddition ? (
              <TransferAdditionRow
                key={`transfer-${slot.attendanceRecordId}`}
                slot={slot}
                periods={periods}
              />
            ) : (
              <StudentRow
                key={`${slot.studentId}-${slot.periodId}`}
                slot={slot}
                subjects={subjects}
                periods={periods}
                date={date}
                periodId={period.id}
              />
            )
          )}
        </ul>
      )}
    </section>
  );
}

// 他の日の振替先としてこのコマに追加された生徒。表示専用(元の記録側で編集する)。
function TransferAdditionRow({ slot, periods }: { slot: AttendanceSlot; periods: Period[] }) {
  const fromPeriodName = periods.find((p) => p.id === slot.transferFromPeriodId)?.name ?? "";
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3" style={{ background: "#EAF1FB" }}>
      <span className="min-w-[7rem] font-medium">{slot.studentName}</span>
      <span
        className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
        style={{ background: "var(--color-makeup)" }}
      >
        振替追加
      </span>
      <span className="text-xs text-[var(--color-ink-soft)]">
        元: {slot.transferFromDate} {fromPeriodName}
      </span>
    </li>
  );
}

function StudentRow({
  slot,
  subjects,
  periods,
  date,
  periodId,
}: {
  slot: AttendanceSlot;
  subjects: Subject[];
  periods: Period[];
  date: string;
  periodId: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [subjectId, setSubjectId] = useState(slot.subjectId);
  const [status, setStatus] = useState<AttendanceStatus | null>(slot.status);
  const [makeupDate, setMakeupDate] = useState(slot.makeupDate ?? "");
  const [makeupPeriodId, setMakeupPeriodId] = useState<number | "">(
    slot.makeupPeriodId ?? ""
  );

  function apply(
    newStatus: AttendanceStatus,
    newSubjectId: number,
    newMakeupDate: string,
    newMakeupPeriodId: number | ""
  ) {
    setStatus(newStatus);
    startTransition(async () => {
      await setAttendanceStatus({
        studentId: slot.studentId,
        date,
        periodId,
        subjectId: newSubjectId,
        status: newStatus,
        makeupDate: newStatus === "makeup" ? newMakeupDate || null : null,
        makeupPeriodId:
          newStatus === "makeup" && newMakeupPeriodId !== "" ? newMakeupPeriodId : null,
      });
    });
  }

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="min-w-[7rem] font-medium">{slot.studentName}</span>

        <select
          value={subjectId}
          onChange={(e) => {
            const next = Number(e.target.value);
            setSubjectId(next);
            if (status) apply(status, next, makeupDate, makeupPeriodId);
          }}
          className="rounded-md border border-[var(--color-border)] bg-transparent px-2 py-1 text-sm"
        >
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <div className="flex gap-1">
          {STATUS_OPTIONS.map((opt) => {
            const active = status === opt.value;
            return (
              <button
                key={opt.value}
                disabled={isPending}
                onClick={() => apply(opt.value, subjectId, makeupDate, makeupPeriodId)}
                className="rounded-full border px-3 py-1 text-xs font-medium transition disabled:opacity-50"
                style={
                  active
                    ? {
                        background: `var(--color-${opt.value})`,
                        borderColor: `var(--color-${opt.value})`,
                        color: "white",
                      }
                    : {
                        borderColor: "var(--color-border)",
                        color: "var(--color-ink-soft)",
                      }
                }
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {!status && (
          <span className="text-xs text-[var(--color-ink-soft)]">未確定</span>
        )}
      </div>

      {status === "makeup" && (
        <div className="ml-[7rem] flex flex-wrap items-center gap-2 text-sm">
          <span className="text-xs text-[var(--color-ink-soft)]">振替先:</span>
          <input
            type="date"
            value={makeupDate}
            onChange={(e) => {
              setMakeupDate(e.target.value);
              apply("makeup", subjectId, e.target.value, makeupPeriodId);
            }}
            className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs"
          />
          <select
            value={makeupPeriodId}
            onChange={(e) => {
              const next = e.target.value ? Number(e.target.value) : "";
              setMakeupPeriodId(next);
              apply("makeup", subjectId, makeupDate, next);
            }}
            className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs"
          >
            <option value="">コマ未指定</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {makeupDate && makeupPeriodId !== "" && (
            <span className="text-xs" style={{ color: "var(--color-makeup)" }}>
              {makeupDate}の該当コマに「振替追加」として表示されます
            </span>
          )}
        </div>
      )}
    </li>
  );
}
