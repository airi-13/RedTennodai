"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { AdminCalendarDay } from "@/lib/data/calendar";
import type { Period, Subject, Student } from "@/lib/types";
import type { School } from "@/lib/data/schools";
import { toggleTodoAction, deleteCalendarEventAction } from "@/app/admin-calendar/actions";
import { NewEventModal } from "./NewEventModal";

function monthLabel(year: number, month: number) {
  return `${year}年${month}月`;
}

function itemStyle(item: AdminCalendarDay["items"][number]) {
  if (item.type === "school_event") return { background: "#E3EEFB" };
  if (item.type === "announcement") return { background: "#FFF3CD" };
  if (item.type === "calendar_event") {
    if (item.eventType === "lesson") return { background: "var(--color-accent)", color: "white" };
    if (item.eventType === "teacher") return { background: "#E8E0F5" };
    return { background: "#DDF3E4" };
  }
  return { background: "var(--color-accent-soft)" };
}

function itemLabel(item: AdminCalendarDay["items"][number]) {
  if (item.type === "school_event") return `[${item.schoolName}] ${item.title}`;
  if (item.type === "announcement") return item.title;
  if (item.type === "calendar_event") {
    const prefix = item.eventType === "lesson" ? "授業" : item.eventType === "teacher" ? "予定" : "塾";
    return `[${prefix}] ${item.timeRange ? `${item.timeRange} ` : ""}${item.title}`;
  }
  return `TODO: ${item.content}`;
}

export function DashboardView({
  year,
  month,
  days,
  periods,
  subjects,
  students,
  schools,
}: {
  year: number;
  month: number;
  days: AdminCalendarDay[];
  periods: Period[];
  subjects: Subject[];
  students: Student[];
  schools: School[];
}) {
  const [isPending, startTransition] = useTransition();
  const [showNewEvent, setShowNewEvent] = useState(false);
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const leadingBlanks = Array.from({ length: firstWeekday });
  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-lg font-bold">カレンダー(全体)</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewEvent(true)}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-white"
            style={{ background: "var(--color-accent)" }}
          >
            ＋ 新規登録
          </button>
          <Link href="/admin-calendar" className="text-sm underline">
            休講・お知らせ・行事・TODOを編集 →
          </Link>
        </div>
      </div>

      {showNewEvent && (
        <NewEventModal
          periods={periods}
          subjects={subjects}
          students={students}
          schools={schools}
          onClose={() => setShowNewEvent(false)}
        />
      )}

      <div className="rounded-lg border-2 border-[var(--color-ink)] bg-[var(--color-surface)] p-4">
        <div className="mb-3 flex items-center justify-center gap-4">
          <Link
            href={`/dashboard?y=${prev.y}&m=${prev.m}`}
            className="rounded-full border border-[var(--color-ink)] px-2 py-0.5 text-sm"
          >
            ←
          </Link>
          <span className="font-display font-bold">{monthLabel(year, month)}</span>
          <Link
            href={`/dashboard?y=${next.y}&m=${next.m}`}
            className="rounded-full border border-[var(--color-ink)] px-2 py-0.5 text-sm"
          >
            →
          </Link>
        </div>

        <div className="mb-2 flex flex-wrap gap-3 text-[10px] text-[var(--color-ink-soft)]">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#E3EEFB" }} />
            学校行事
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#FFF3CD" }} />
            塾のお知らせ
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--color-accent)" }} />
            単発授業
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#E8E0F5" }} />
            先生の予定
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#DDF3E4" }} />
            塾の予定
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--color-accent-soft)" }} />
            自分のTODO
          </span>
        </div>

        <p className="mb-2 text-[10px] text-[var(--color-ink-soft)]">
          単発授業・先生の予定・塾の予定はクリックすると削除できます。
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
              className="min-h-[80px] rounded-md border border-[var(--color-border)] bg-white p-1 text-left"
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
                {day.items.map((item, i) => (
                  <div
                    key={i}
                    className="truncate rounded px-1 text-[10px]"
                    style={{
                      ...itemStyle(item),
                      textDecoration:
                        item.type === "todo" && item.done ? "line-through" : undefined,
                      cursor: item.type === "todo" || item.type === "calendar_event" ? "pointer" : undefined,
                    }}
                    title={itemLabel(item)}
                    onClick={() => {
                      if (item.type === "todo") {
                        startTransition(() => toggleTodoAction(item.id, !item.done));
                        return;
                      }
                      if (item.type === "calendar_event") {
                        startTransition(() => deleteCalendarEventAction(item.id));
                        return;
                      }
                    }}
                  >
                    {itemLabel(item)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
