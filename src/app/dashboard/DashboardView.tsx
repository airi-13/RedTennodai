"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { AdminCalendarDay } from "@/lib/data/calendar";
import type { Period, Subject, Student } from "@/lib/types";
import type { School } from "@/lib/data/schools";
import type { Notice } from "@/lib/data/notices";
import { toggleTodoAction } from "@/app/admin-calendar/actions";
import { deleteCalendarItemsAction, type DeletableItem } from "./actions";
import { NewEventModal } from "./NewEventModal";

type DayItem = AdminCalendarDay["items"][number];

function monthLabel(year: number, month: number) {
  return `${year}年${month}月`;
}

function itemStyle(item: DayItem) {
  if (item.type === "school_event") return { background: "var(--color-school)", color: "white" };
  if (item.type === "announcement") return { background: "var(--color-juku)", color: "white" };
  if (item.type === "closure") {
    // 臨時休講=スレート(グレー系・「休み」の意味)、特別開講=からし色。塾(赤)・授業(紺)と混同しない色にする
    return item.closureStatus === "closed"
      ? { background: "var(--color-ink-soft)", color: "white" }
      : { background: "var(--color-late)", color: "var(--color-ink)" };
  }
  if (item.type === "calendar_event") {
    if (item.eventType === "lesson") return { background: "var(--color-makeup)", color: "white", border: "1.5px solid var(--color-makeup-border)" };
    if (item.eventType === "teacher") return { background: "var(--color-teacher)", color: "white" };
    return { background: "var(--color-juku)", color: "white" };
  }
  return { background: "var(--color-teacher)", color: "white" };
}

function itemLabel(item: DayItem) {
  if (item.type === "school_event") return `[${item.schoolName}] ${item.title}`;
  if (item.type === "announcement") return item.title;
  if (item.type === "closure") {
    return `${item.closureStatus === "closed" ? "臨時休講" : "特別開講"}${item.note ? `(${item.note})` : ""}`;
  }
  if (item.type === "calendar_event") {
    const prefix = item.eventType === "lesson" ? "授業" : item.eventType === "teacher" ? "予定" : "塾";
    return `[${prefix}] ${item.timeRange ? `${item.timeRange} ` : ""}${item.title}`;
  }
  return `TODO: ${item.content}`;
}

// 選択状態の管理用キー(種類+ID)。同じ日に同種の予定が複数あっても区別できる。
function itemKey(item: DayItem): string {
  switch (item.type) {
    case "closure":
      return `closure:${item.date}`;
    default:
      return `${item.type}:${item.id}`;
  }
}

function toDeletable(item: DayItem): DeletableItem {
  switch (item.type) {
    case "closure":
      return { type: "closure", date: item.date };
    case "calendar_event":
      return { type: "calendar_event", id: item.id };
    default:
      return { type: item.type, id: item.id };
  }
}

const noticeKey = (n: Notice) => `notice:${n.id}`;

export function DashboardView({
  year,
  month,
  days,
  periods,
  subjects,
  students,
  schools,
  notices,
}: {
  year: number;
  month: number;
  days: AdminCalendarDay[];
  periods: Period[];
  subjects: Subject[];
  students: Student[];
  schools: School[];
  notices: Notice[];
}) {
  const [isPending, startTransition] = useTransition();
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [newEventDates, setNewEventDates] = useState<string[]>([]);

  // 編集モード: 予定を複数選んで削除 / 日付を複数選んで同じ予定をまとめて追加
  const [editMode, setEditMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const leadingBlanks = Array.from({ length: firstWeekday });
  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };

  function toggleInSet(setter: React.Dispatch<React.SetStateAction<Set<string>>>, key: string) {
    setConfirmingDelete(false);
    setMessage(null);
    setter((prevSet) => {
      const nextSet = new Set(prevSet);
      if (nextSet.has(key)) nextSet.delete(key);
      else nextSet.add(key);
      return nextSet;
    });
  }

  function clearSelection() {
    setSelectedItems(new Set());
    setSelectedDates(new Set());
    setConfirmingDelete(false);
  }

  function toggleEditMode() {
    setEditMode((v) => !v);
    clearSelection();
    setMessage(null);
  }

  function openNew(dates: string[]) {
    setNewEventDates(dates);
    setShowNewEvent(true);
  }

  function deleteSelected() {
    // 選択中のキーに該当する予定(カレンダー上+お知らせ欄)を集める
    const targets: DeletableItem[] = [];
    for (const day of days) {
      for (const item of day.items) {
        if (selectedItems.has(itemKey(item))) targets.push(toDeletable(item));
      }
    }
    for (const n of notices) {
      if (selectedItems.has(noticeKey(n))) targets.push({ type: "notice", id: n.id });
    }
    setConfirmingDelete(false);
    startTransition(async () => {
      const res = await deleteCalendarItemsAction(targets);
      if (res.error) {
        setMessage(res.error);
        return;
      }
      setSelectedItems(new Set());
      setMessage(
        res.failed > 0
          ? `${res.deleted}件を削除しました。${res.failed}件は削除できませんでした。`
          : `${res.deleted}件を削除しました。`
      );
    });
  }

  const itemCount = selectedItems.size;
  const dateCount = selectedDates.size;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-lg font-bold">カレンダー(全体)</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openNew([])}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-white"
            style={{ background: "var(--color-accent)" }}
          >
            ＋ 新規登録
          </button>
          <button
            onClick={toggleEditMode}
            className="rounded-md border px-3 py-1.5 text-sm font-medium"
            style={
              editMode
                ? { background: "var(--color-ink)", color: "white", borderColor: "var(--color-ink)" }
                : { borderColor: "var(--color-ink)" }
            }
          >
            {editMode ? "編集を終了" : "編集"}
          </button>
        </div>
      </div>

      {showNewEvent && (
        <NewEventModal
          periods={periods}
          subjects={subjects}
          students={students}
          schools={schools}
          defaultDates={newEventDates}
          onClose={() => {
            setShowNewEvent(false);
            setSelectedDates(new Set());
          }}
        />
      )}

      {editMode && (
        <div
          className="space-y-2 rounded-lg border-2 p-3 text-sm"
          style={{ borderColor: "var(--color-accent)", background: "var(--color-accent-soft)" }}
        >
          <p className="text-xs">
            編集モード: <b>予定・お知らせをタップ</b>で選択して削除、<b>日付のマス(予定の無い部分)をタップ</b>
            で日付を選択して、その日すべてに同じ予定をまとめて追加できます。
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              disabled={itemCount === 0 || isPending}
              onClick={() => setConfirmingDelete(true)}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
              style={{ background: "var(--color-accent-dark)" }}
            >
              選択した予定を削除({itemCount}件)
            </button>
            <button
              disabled={dateCount === 0 || isPending}
              onClick={() => openNew(Array.from(selectedDates).sort())}
              className="rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-40"
              style={{ borderColor: "var(--color-ink)" }}
            >
              選択した日に追加({dateCount}日)
            </button>
            <button
              disabled={itemCount + dateCount === 0}
              onClick={clearSelection}
              className="rounded-md px-2 py-1.5 text-xs underline disabled:opacity-40"
            >
              選択をすべて解除
            </button>
          </div>
          {confirmingDelete && (
            <div className="flex flex-wrap items-center gap-2 rounded-md bg-white p-2 text-xs">
              <span>選んだ{itemCount}件を削除します。元に戻せません。よろしいですか?</span>
              <button
                onClick={deleteSelected}
                disabled={isPending}
                className="rounded-md px-3 py-1 font-medium text-white disabled:opacity-50"
                style={{ background: "var(--color-accent-dark)" }}
              >
                削除する
              </button>
              <button onClick={() => setConfirmingDelete(false)} className="underline">
                やめる
              </button>
            </div>
          )}
          {message && <p className="text-xs">{message}</p>}
        </div>
      )}

      <div className="space-y-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p className="font-display text-sm font-bold">生徒トップページのお知らせ欄</p>
        {notices.length === 0 ? (
          <p className="text-xs text-[var(--color-ink-soft)]">
            お知らせはありません。「＋ 新規登録」→「お知らせ欄」から追加できます。
          </p>
        ) : (
          <ul className="space-y-1 text-sm">
            {notices.map((n) => {
              const key = noticeKey(n);
              const selected = selectedItems.has(key);
              return (
                <li
                  key={n.id}
                  role={editMode ? "button" : undefined}
                  aria-pressed={editMode ? selected : undefined}
                  onClick={() => editMode && toggleInSet(setSelectedItems, key)}
                  className="rounded px-2 py-1"
                  style={{
                    cursor: editMode ? "pointer" : undefined,
                    outline: selected ? "2px solid var(--color-accent-dark)" : undefined,
                    background: selected ? "var(--color-accent-soft)" : undefined,
                  }}
                >
                  {editMode && <span className="mr-1">{selected ? "☑" : "☐"}</span>}
                  <span className="font-medium">{n.title}</span>
                  {n.body && <span className="text-[var(--color-ink-soft)]"> — {n.body}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </div>

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
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--color-school)" }} />
            学校行事
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--color-juku)" }} />
            塾のお知らせ・塾の予定
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--color-makeup)", border: "1.5px solid var(--color-makeup-border)" }} />
            単発授業・振替授業
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--color-teacher)" }} />
            先生の予定・自分のTODO
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--color-ink-soft)" }} />
            臨時休講
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--color-late)" }} />
            特別開講
          </span>
        </div>

        {!editMode && (
          <p className="mb-2 text-[10px] text-[var(--color-ink-soft)]">
            「編集」を押すと、予定を選んで削除したり、日付を選んで同じ予定をまとめて追加できます(TODOは今のままタップで完了/未完了を切り替えられます)。
          </p>
        )}

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-[var(--color-ink-soft)]">
          {["日", "月", "火", "水", "木", "金", "土"].map((d) => (
            <div key={d}>{d}</div>
          ))}
          {leadingBlanks.map((_, i) => (
            <div key={`blank-${i}`} />
          ))}
          {days.map((day) => {
            const dateSelected = selectedDates.has(day.date);
            return (
              <div
                key={day.date}
                onClick={() => editMode && toggleInSet(setSelectedDates, day.date)}
                className="min-h-[80px] rounded-md border border-[var(--color-border)] bg-white p-1 text-left"
                style={{
                  ...(day.status === "closed" ? { background: "var(--color-accent-soft)" } : {}),
                  cursor: editMode ? "pointer" : undefined,
                  outline: dateSelected ? "2px solid var(--color-accent)" : undefined,
                  outlineOffset: dateSelected ? "-2px" : undefined,
                }}
              >
                <div className="text-[10px] text-[var(--color-ink-soft)]">
                  {editMode && <span className="mr-0.5">{dateSelected ? "☑" : "☐"}</span>}
                  {Number(day.date.slice(-2))}
                  {day.status === "closed" && (
                    <span className="ml-1 font-bold" style={{ color: "var(--color-accent-dark)" }}>
                      休
                    </span>
                  )}
                </div>
                <div className="mt-0.5 space-y-0.5">
                  {day.items.map((item) => {
                    const key = itemKey(item);
                    const selected = selectedItems.has(key);
                    return (
                      <div
                        key={key}
                        role={editMode ? "button" : undefined}
                        aria-pressed={editMode ? selected : undefined}
                        className="truncate rounded px-1 text-[10px]"
                        style={{
                          ...itemStyle(item),
                          textDecoration: item.type === "todo" && item.done ? "line-through" : undefined,
                          cursor: editMode || item.type === "todo" ? "pointer" : undefined,
                          outline: selected ? "2px solid var(--color-ink)" : undefined,
                          outlineOffset: selected ? "1px" : undefined,
                        }}
                        title={itemLabel(item)}
                        onClick={(e) => {
                          if (editMode) {
                            e.stopPropagation(); // 日付の選択と混ざらないようにする
                            toggleInSet(setSelectedItems, key);
                            return;
                          }
                          if (item.type === "todo") {
                            startTransition(() => toggleTodoAction(item.id, !item.done));
                          }
                        }}
                      >
                        {editMode && <span className="mr-0.5">{selected ? "☑" : "☐"}</span>}
                        {itemLabel(item)}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
