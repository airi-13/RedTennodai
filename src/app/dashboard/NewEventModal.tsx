"use client";

import { useState, useTransition } from "react";
import type { Period, Subject, Student } from "@/lib/types";
import type { School } from "@/lib/data/schools";
import type { CalendarEventType, CalendarEventVisibility } from "@/lib/data/calendar-events";
import { createCalendarEventAction } from "@/app/admin-calendar/actions";
import { createSchoolEventAction } from "@/app/admin-calendar/actions";

type Kind = "school_event" | "lesson" | "teacher" | "juku";

const KIND_LABEL: Record<Kind, string> = {
  school_event: "学校行事",
  lesson: "単発授業",
  teacher: "先生の予定(面談など)",
  juku: "塾の予定",
};

export function NewEventModal({
  periods,
  subjects,
  students,
  schools,
  onClose,
}: {
  periods: Period[];
  subjects: Subject[];
  students: Student[];
  schools: School[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [kind, setKind] = useState<Kind>("lesson");
  const [error, setError] = useState<string | null>(null);

  // 共通
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");

  // 学校行事
  const [schoolName, setSchoolName] = useState("");

  // 単発授業
  const [periodId, setPeriodId] = useState<number | "">(periods[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState<number | "">(subjects[0]?.id ?? "");

  // 先生の予定・塾の予定(自由な時刻)
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // 可視性・対象生徒
  const [visibility, setVisibility] = useState<CalendarEventVisibility>(
    kind === "lesson" ? "selected" : "admin_only"
  );
  const [studentIds, setStudentIds] = useState<number[]>([]);

  function changeKind(next: Kind) {
    setKind(next);
    setError(null);
    if (next === "lesson") setVisibility("selected");
    else if (next === "juku") setVisibility("all");
    else setVisibility("admin_only");
  }

  function toggleStudent(id: number) {
    setStudentIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  function submit() {
    setError(null);
    if (!date) {
      setError("日付を入力してください。");
      return;
    }

    if (kind === "school_event") {
      if (!schoolName.trim() || !title.trim()) {
        setError("学校名と行事名を入力してください。");
        return;
      }
      startTransition(async () => {
        try {
          await createSchoolEventAction({
            schoolName: schoolName.trim(),
            event_date: date,
            title: title.trim(),
            note: note.trim() || undefined,
          });
          onClose();
        } catch (e: any) {
          setError(e?.message ?? "登録に失敗しました");
        }
      });
      return;
    }

    if (kind === "lesson") {
      if (!periodId || !subjectId) {
        setError("コマと科目を選んでください。");
        return;
      }
      if (visibility !== "all" && studentIds.length === 0) {
        setError("対象の生徒を1人以上選んでください。");
        return;
      }
      const subjectName = subjects.find((s) => s.id === subjectId)?.name ?? "授業";
      startTransition(async () => {
        try {
          await createCalendarEventAction({
            eventType: "lesson",
            eventDate: date,
            periodId: Number(periodId),
            subjectId: Number(subjectId),
            title: title.trim() || subjectName,
            note: note.trim() || undefined,
            visibility,
            studentIds,
          });
          onClose();
        } catch (e: any) {
          setError(e?.message ?? "登録に失敗しました");
        }
      });
      return;
    }

    // teacher / juku
    if (!title.trim()) {
      setError("タイトルを入力してください。");
      return;
    }
    if (visibility === "selected" && studentIds.length === 0) {
      setError("対象の生徒を1人以上選んでください。");
      return;
    }
    startTransition(async () => {
      try {
        await createCalendarEventAction({
          eventType: kind,
          eventDate: date,
          startTime: startTime || undefined,
          endTime: endTime || undefined,
          title: title.trim(),
          note: note.trim() || undefined,
          visibility,
          studentIds: visibility === "selected" ? studentIds : undefined,
        });
        onClose();
      } catch (e: any) {
        setError(e?.message ?? "登録に失敗しました");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-[var(--color-surface)] p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">新規登録</h2>
          <button onClick={onClose} className="text-sm text-[var(--color-ink-soft)] underline">
            閉じる
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
            <button
              key={k}
              onClick={() => changeKind(k)}
              className="rounded-full border px-3 py-1 text-xs font-medium"
              style={
                kind === k
                  ? { background: "var(--color-accent)", borderColor: "var(--color-accent)", color: "white" }
                  : { borderColor: "var(--color-border)", color: "var(--color-ink-soft)" }
              }
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <Field label="日付">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
            />
          </Field>

          {kind === "school_event" && (
            <>
              <Field label="学校名">
                <input
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  list="dashboard-school-list"
                  placeholder="○○小学校"
                  className="w-full rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
                />
                <datalist id="dashboard-school-list">
                  {schools.map((s) => (
                    <option key={s.id} value={s.name} />
                  ))}
                </datalist>
              </Field>
              <Field label="行事名">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
                />
              </Field>
            </>
          )}

          {kind === "lesson" && (
            <>
              <div className="flex gap-2">
                <Field label="コマ">
                  <select
                    value={periodId}
                    onChange={(e) => setPeriodId(Number(e.target.value))}
                    className="w-full rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
                  >
                    {periods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="科目">
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(Number(e.target.value))}
                    className="w-full rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="タイトル(任意、空欄なら科目名)">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
                />
              </Field>
            </>
          )}

          {(kind === "teacher" || kind === "juku") && (
            <>
              <div className="flex gap-2">
                <Field label="開始時刻(任意)">
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
                  />
                </Field>
                <Field label="終了時刻(任意)">
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
                  />
                </Field>
              </div>
              <Field label="タイトル">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={kind === "teacher" ? "例: 山田さん面談" : "例: 保護者会のお知らせ"}
                  className="w-full rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
                />
              </Field>
            </>
          )}

          {kind !== "school_event" && (
            <Field label="メモ(任意)">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
              />
            </Field>
          )}

          {kind === "school_event" && (
            <Field label="メモ(任意)">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
              />
            </Field>
          )}

          {kind !== "school_event" && (
            <Field label="表示する範囲">
              <div className="flex flex-wrap gap-3 text-sm">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    checked={visibility === "admin_only"}
                    onChange={() => setVisibility("admin_only")}
                    disabled={kind === "lesson"}
                  />
                  管理者のみ
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    checked={visibility === "selected"}
                    onChange={() => setVisibility("selected")}
                  />
                  選んだ生徒に表示
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    checked={visibility === "all"}
                    onChange={() => setVisibility("all")}
                  />
                  全員に表示
                </label>
              </div>
              {kind === "lesson" && (
                <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
                  単発授業は出欠を記録するため「管理者のみ」は選べません。
                </p>
              )}
            </Field>
          )}

          {kind !== "school_event" &&
            (visibility === "selected" || (kind === "lesson" && visibility !== "all")) && (
              <Field label="対象の生徒">
                <div className="max-h-40 overflow-y-auto rounded-md border border-[var(--color-border)] p-2">
                  {students.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 py-0.5 text-sm">
                      <input
                        type="checkbox"
                        checked={studentIds.includes(s.id)}
                        onChange={() => toggleStudent(s.id)}
                      />
                      {s.name}
                    </label>
                  ))}
                  {students.length === 0 && (
                    <p className="text-xs text-[var(--color-ink-soft)]">生徒が登録されていません</p>
                  )}
                </div>
              </Field>
            )}

          {error && (
            <p className="text-sm" style={{ color: "var(--color-absent)" }}>
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              disabled={isPending}
              className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              onClick={submit}
              disabled={isPending}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: "var(--color-accent)" }}
            >
              登録する
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-xs text-[var(--color-ink-soft)]">
      {label}
      {children}
    </label>
  );
}
