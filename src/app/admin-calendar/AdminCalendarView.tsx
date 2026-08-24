"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { Announcement, Closure } from "@/lib/data/announcements";
import type { School } from "@/lib/data/schools";
import type { SchoolEvent } from "@/lib/data/school-events";
import type { AdminTodo } from "@/lib/data/admin-todos";
import {
  setClosureAction,
  clearClosureAction,
  createAnnouncementAction,
  deleteAnnouncementAction,
  createSchoolEventAction,
  deleteSchoolEventAction,
  deleteSchoolAction,
  createTodoAction,
  toggleTodoAction,
  deleteTodoAction,
} from "./actions";

function monthLabel(year: number, month: number) {
  return `${year}年${month}月`;
}

export function AdminCalendarView({
  year,
  month,
  closures,
  announcements,
  schoolEvents,
  schools,
  todos,
}: {
  year: number;
  month: number;
  closures: Closure[];
  announcements: Announcement[];
  schoolEvents: (SchoolEvent & { schoolName: string })[];
  schools: School[];
  todos: AdminTodo[];
}) {
  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">カレンダー管理</h1>
        <div className="flex items-center gap-3 text-sm">
          <Link href={`/admin-calendar?y=${prev.y}&m=${prev.m}`} className="underline">
            ← 前月
          </Link>
          <span className="font-medium">{monthLabel(year, month)}</span>
          <Link href={`/admin-calendar?y=${next.y}&m=${next.m}`} className="underline">
            翌月 →
          </Link>
        </div>
      </div>

      <ClosureSection closures={closures} />
      <AnnouncementSection announcements={announcements} />
      <SchoolEventSection schoolEvents={schoolEvents} schools={schools} />
      <TodoSection todos={todos} />
    </div>
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

function ClosureSection({ closures }: { closures: Closure[] }) {
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState("");
  const [status, setStatus] = useState<"closed" | "open">("closed");
  const [note, setNote] = useState("");

  return (
    <SectionCard title="休講・特別開講(1日単位の例外設定)">
      <p className="text-xs text-[var(--color-ink-soft)]">
        デフォルトは日曜・月曜が休講。ここで登録した日はデフォルトより優先されます(例: 月曜でも特別開講にする、平日を臨時休講にする、など)。
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "closed" | "open")}
          className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
        >
          <option value="closed">休講</option>
          <option value="open">開講(特別)</option>
        </select>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="メモ(任意)"
          className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
        />
        <button
          disabled={isPending || !date}
          onClick={() =>
            startTransition(async () => {
              await setClosureAction(date, status, note || undefined);
              setDate("");
              setNote("");
            })
          }
          className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: "var(--color-accent)" }}
        >
          登録
        </button>
      </div>
      <ul className="space-y-1 text-sm">
        {closures.map((c) => (
          <li key={c.closure_date} className="flex items-center justify-between">
            <span>
              {c.closure_date} — {c.status === "closed" ? "休講" : "開講(特別)"}
              {c.note && ` (${c.note})`}
            </span>
            <button
              disabled={isPending}
              onClick={() => startTransition(() => clearClosureAction(c.closure_date))}
              className="text-xs text-[var(--color-ink-soft)] underline"
            >
              解除
            </button>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function AnnouncementSection({ announcements }: { announcements: Announcement[] }) {
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [timeRange, setTimeRange] = useState("");
  const [note, setNote] = useState("");

  return (
    <SectionCard title="塾からのお知らせ・予定">
      <div className="flex flex-wrap items-end gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
        />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="タイトル"
          className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
        />
        <input
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          placeholder="時間帯(任意)"
          className="w-28 rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="メモ(任意)"
          className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
        />
        <button
          disabled={isPending || !date || !title}
          onClick={() =>
            startTransition(async () => {
              await createAnnouncementAction({
                event_date: date,
                title,
                time_range: timeRange || undefined,
                note: note || undefined,
              });
              setDate("");
              setTitle("");
              setTimeRange("");
              setNote("");
            })
          }
          className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: "var(--color-accent)" }}
        >
          追加
        </button>
      </div>
      <ul className="space-y-1 text-sm">
        {announcements.map((a) => (
          <li key={a.id} className="flex items-center justify-between">
            <span>
              {a.event_date} {a.time_range && `(${a.time_range})`} — {a.title}
            </span>
            <button
              disabled={isPending}
              onClick={() => startTransition(() => deleteAnnouncementAction(a.id))}
              className="text-xs text-[var(--color-ink-soft)] underline"
            >
              削除
            </button>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function SchoolEventSection({
  schoolEvents,
  schools,
}: {
  schoolEvents: (SchoolEvent & { schoolName: string })[];
  schools: School[];
}) {
  const [isPending, startTransition] = useTransition();
  const [schoolName, setSchoolName] = useState("");
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");

  return (
    <SectionCard title="生徒の学校行事">
      <p className="text-xs text-[var(--color-ink-soft)]">
        学校名は既存のものと同じ表記で入力すると同じ学校として扱われます(新しい名前なら自動的に学校として登録されます)。登録済みの学校: {schools.map((s) => s.name).join("、") || "なし"}
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <input
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
          placeholder="学校名"
          list="school-list"
          className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
        />
        <datalist id="school-list">
          {schools.map((s) => (
            <option key={s.id} value={s.name} />
          ))}
        </datalist>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
        />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="行事名"
          className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="メモ(任意)"
          className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
        />
        <button
          disabled={isPending || !schoolName || !date || !title}
          onClick={() =>
            startTransition(async () => {
              await createSchoolEventAction({
                schoolName,
                event_date: date,
                title,
                note: note || undefined,
              });
              setDate("");
              setTitle("");
              setNote("");
            })
          }
          className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: "var(--color-accent)" }}
        >
          追加
        </button>
      </div>
      <ul className="space-y-1 text-sm">
        {schoolEvents.map((e) => (
          <li key={e.id} className="flex items-center justify-between">
            <span>
              {e.event_date} [{e.schoolName}] {e.title}
            </span>
            <button
              disabled={isPending}
              onClick={() => startTransition(() => deleteSchoolEventAction(e.id))}
              className="text-xs text-[var(--color-ink-soft)] underline"
            >
              削除
            </button>
          </li>
        ))}
      </ul>
      {schools.length > 0 && (
        <details className="text-xs text-[var(--color-ink-soft)]">
          <summary className="cursor-pointer">学校一覧を編集</summary>
          <ul className="mt-2 space-y-1">
            {schools.map((s) => (
              <li key={s.id} className="flex items-center justify-between">
                <span>{s.name}</span>
                <button
                  disabled={isPending}
                  onClick={() => startTransition(() => deleteSchoolAction(s.id))}
                  className="underline"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </SectionCard>
  );
}

function TodoSection({ todos }: { todos: AdminTodo[] }) {
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState("");
  const [content, setContent] = useState("");

  return (
    <SectionCard title="自分のTODO(生徒には表示されません)">
      <div className="flex flex-wrap items-end gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
        />
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="内容"
          className="flex-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
        />
        <button
          disabled={isPending || !date || !content}
          onClick={() =>
            startTransition(async () => {
              await createTodoAction({ todo_date: date, content });
              setDate("");
              setContent("");
            })
          }
          className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: "var(--color-accent)" }}
        >
          追加
        </button>
      </div>
      <ul className="space-y-1 text-sm">
        {todos.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={t.done}
                onChange={(e) =>
                  startTransition(() => toggleTodoAction(t.id, e.target.checked))
                }
              />
              <span style={t.done ? { textDecoration: "line-through", opacity: 0.5 } : undefined}>
                {t.todo_date} {t.content}
              </span>
            </label>
            <button
              disabled={isPending}
              onClick={() => startTransition(() => deleteTodoAction(t.id))}
              className="text-xs text-[var(--color-ink-soft)] underline"
            >
              削除
            </button>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
