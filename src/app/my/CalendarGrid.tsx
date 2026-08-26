"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { CalendarDay, CalendarDayItem } from "@/lib/data/calendar";
import { submitRequestAction } from "@/app/my/request/actions";

function lessonLabel(item: Extract<CalendarDayItem, { type: "lesson" }>) {
  const base = `${item.periodLabel} ${item.subject}`;
  switch (item.status) {
    case "absent":
      return `${base}(欠席)`;
    case "late":
      return `${base}(遅刻)`;
    case "makeup":
      return `${base}(振替→${item.transferToDate ?? "未定"})`;
    case "makeup_added":
      return `${base}(振替追加・元${item.transferFromDate ?? ""} ${item.transferFromPeriodLabel ?? ""})`;
    default:
      return base;
  }
}

function itemStyle(item: CalendarDayItem) {
  if (item.type === "announcement") return { background: "#FFF3CD" };
  if (item.type === "school_event") return { background: "#E3EEFB" };
  switch (item.status) {
    case "absent":
    case "makeup":
      return { background: "var(--color-absent)", color: "white" };
    case "makeup_added":
      return { background: "var(--color-makeup)", color: "white" };
    case "late":
      return { background: "var(--color-late)", color: "white" };
    default:
      return { background: "transparent", color: "var(--color-ink)", border: "1px solid var(--color-border)" };
  }
}

function monthLabel(year: number, month: number) {
  return `${year}年${month}月`;
}

type SelectedLesson = {
  date: string;
  item: Extract<CalendarDayItem, { type: "lesson" }>;
};

export function CalendarGrid({
  year,
  month,
  days,
  periods,
}: {
  year: number;
  month: number;
  days: CalendarDay[];
  periods: { id: number; name: string }[];
}) {
  const [selected, setSelected] = useState<SelectedLesson | null>(null);

  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const leadingBlanks = Array.from({ length: firstWeekday });
  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };

  return (
    <div className="rounded-lg border-2 border-[var(--color-ink)] bg-[var(--color-surface)] p-4">
      <div className="mb-3 flex items-center justify-center gap-4">
        <Link
          href={`/my?y=${prev.y}&m=${prev.m}`}
          className="rounded-full border border-[var(--color-ink)] px-2 py-0.5 text-sm"
        >
          ←
        </Link>
        <span className="font-display font-bold">{monthLabel(year, month)}</span>
        <Link
          href={`/my?y=${next.y}&m=${next.m}`}
          className="rounded-full border border-[var(--color-ink)] px-2 py-0.5 text-sm"
        >
          →
        </Link>
      </div>

      <div className="mb-2 flex flex-wrap gap-3 text-[10px] text-[var(--color-ink-soft)]">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full border border-[var(--color-border)]" />
          通常授業
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--color-absent)" }} />
          欠席・振替元
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--color-makeup)" }} />
          振替先
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#E3EEFB" }} />
          学校行事
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#FFF3CD" }} />
          塾のお知らせ
        </span>
      </div>
      <p className="mb-2 text-[10px] text-[var(--color-ink-soft)]">
        授業をタップすると、欠席・振替の申請ができます。
      </p>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-[var(--color-ink-soft)]">
        {["日", "月", "火", "水", "木", "金", "土"].map((d) => (
          <div key={d}>{d}</div>
        ))}
        {leadingBlanks.map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map((day) => (
          <div
            key={day.date}
            className="min-h-[72px] rounded-md border border-[var(--color-border)] bg-white p-1 text-left"
            style={day.status === "closed" ? { background: "var(--color-accent-soft)" } : undefined}
          >
            <div className="text-[10px] text-[var(--color-ink-soft)]">
              {Number(day.date.slice(-2))}
              {day.status === "closed" && (
                <span className="ml-1 font-bold" style={{ color: "var(--color-accent-dark)" }}>
                  休
                </span>
              )}
            </div>
            <div className="mt-0.5 space-y-0.5">
              {day.items.map((item, i) =>
                item.type === "lesson" ? (
                  <button
                    key={i}
                    onClick={() => setSelected({ date: day.date, item })}
                    className="block w-full truncate rounded px-1 text-left text-[10px]"
                    style={itemStyle(item)}
                    title={lessonLabel(item)}
                  >
                    {lessonLabel(item)}
                  </button>
                ) : (
                  <div
                    key={i}
                    className="truncate rounded px-1 text-[10px]"
                    style={itemStyle(item)}
                    title={item.title}
                  >
                    {item.title}
                  </div>
                )
              )}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <LessonModal
          selected={selected}
          periods={periods}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function LessonModal({
  selected,
  periods,
  onClose,
}: {
  selected: SelectedLesson;
  periods: { id: number; name: string }[];
  onClose: () => void;
}) {
  const { date, item } = selected;
  const [requestType, setRequestType] = useState<"absence" | "makeup">("absence");
  const [state, formAction, isPending] = useActionState(submitRequestAction, undefined);

  // 振替先(この授業自体がmakeup_addedの場合)や振替元の情報からコマIDを逆引き
  const periodId = periods.find((p) => p.name === item.periodLabel)?.id ?? "";

  if (state && !state.error) {
    // 成功時はredirectされる想定だが、念のためここでも閉じておく
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm space-y-4 rounded-lg bg-white p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="font-display font-bold">{date}</p>
            <p className="text-sm text-[var(--color-ink-soft)]">
              {item.periodLabel} {item.subject}
            </p>
          </div>
          <button onClick={onClose} className="text-[var(--color-ink-soft)]">
            ✕
          </button>
        </div>

        <form action={formAction} className="space-y-3">
          <input type="hidden" name="targetDate" value={date} />
          <input type="hidden" name="targetPeriodId" value={periodId} />

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

          {requestType === "makeup" && (
            <div className="flex gap-2">
              <input
                type="date"
                name="makeupDate"
                className="flex-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
              />
              <select
                name="makeupPeriodId"
                className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
              >
                <option value="">コマ未定</option>
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <textarea
            name="reason"
            rows={2}
            placeholder="理由・連絡事項(任意)"
            className="w-full rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
          />

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
            この授業について申請する
          </button>
        </form>
      </div>
    </div>
  );
}
