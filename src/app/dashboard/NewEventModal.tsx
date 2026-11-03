"use client";

import { useState, useTransition } from "react";
import type { Period, Subject, Student } from "@/lib/types";
import type { School } from "@/lib/data/schools";
import type { CalendarEventVisibility } from "@/lib/data/calendar-events";
import { createCalendarEventAction } from "@/app/admin-calendar/actions";
import { createSchoolEventAction } from "@/app/admin-calendar/actions";
import { createNoticeAction, createTodoAction, setClosureAction } from "@/app/admin-calendar/actions";

type Kind = "school_event" | "lesson" | "teacher" | "juku" | "closure" | "notice" | "todo";

const KIND_LABEL: Record<Kind, string> = {
  school_event: "学校行事",
  lesson: "単発授業",
  teacher: "先生の予定(面談など)",
  juku: "塾のお知らせ・予定",
  closure: "休講・特別開講",
  notice: "お知らせ欄",
  todo: "自分のTODO",
};

export function NewEventModal({
  periods,
  subjects,
  students,
  schools,
  defaultDates,
  onClose,
}: {
  periods: Period[];
  subjects: Subject[];
  students: Student[];
  schools: School[];
  // カレンダーで選択した日を最初から入れておく(編集モードの「選択した日に追加」用)
  defaultDates?: string[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [kind, setKind] = useState<Kind>("lesson");
  const [error, setError] = useState<string | null>(null);

  // 共通
  // 日付は複数指定できる(同じ内容を複数日にまとめて登録するため)
  const [dates, setDates] = useState<string[]>(() => [...new Set(defaultDates ?? [])].sort());
  const [dateInput, setDateInput] = useState("");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [title, setTitle] = useState("");

  // 休講・特別開講
  const [closureStatus, setClosureStatus] = useState<"closed" | "open">("closed");
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

  const MAX_DATES = 62;

  function addDate(value: string) {
    if (!value) return;
    setDates((prev) => (prev.includes(value) ? prev : [...prev, value].sort()));
  }

  function removeDate(value: string) {
    setDates((prev) => prev.filter((d) => d !== value));
  }

  // 期間(開始日〜終了日)を1日ずつに展開して追加する。UTCで進めるのでタイムゾーンによるずれは起きない。
  function addRange() {
    setError(null);
    if (!rangeFrom || !rangeTo) {
      setError("期間の開始日と終了日を入力してください。");
      return;
    }
    if (rangeFrom > rangeTo) {
      setError("終了日は開始日以降にしてください。");
      return;
    }
    const [y1, m1, d1] = rangeFrom.split("-").map(Number);
    const [y2, m2, d2] = rangeTo.split("-").map(Number);
    const end = Date.UTC(y2, m2 - 1, d2);
    const expanded: string[] = [];
    for (let t = Date.UTC(y1, m1 - 1, d1); t <= end; t += 86400000) {
      expanded.push(new Date(t).toISOString().slice(0, 10));
      if (expanded.length > MAX_DATES) break;
    }
    if (expanded.length > MAX_DATES) {
      setError(`一度に追加できるのは${MAX_DATES}日までです。期間を分けてください。`);
      return;
    }
    setDates((prev) => [...new Set([...prev, ...expanded])].sort());
    setRangeFrom("");
    setRangeTo("");
  }

  function submit() {
    setError(null);

    // お知らせ欄は日付を持たない(生徒トップページに新しい順で表示される)
    if (kind === "notice") {
      if (!title.trim()) {
        setError("タイトルを入力してください。");
        return;
      }
      startTransition(async () => {
        try {
          await createNoticeAction({ title: title.trim(), body: note.trim() || undefined });
          onClose();
        } catch (e: any) {
          setError(e?.message ?? "登録に失敗しました");
        }
      });
      return;
    }

    if (dates.length === 0) {
      setError("日付を1つ以上追加してください。");
      return;
    }
    if (dates.length > MAX_DATES) {
      setError(`一度に登録できるのは${MAX_DATES}日までです。`);
      return;
    }

    // 種類ごとに入力を検証し、「1日分を登録する処理」を組み立てる。
    // 選んだ日付の数だけ同じ処理を繰り返す(登録内容は日付以外すべて同じ)。
    let runOne: (date: string) => Promise<unknown>;

    if (kind === "closure") {
      runOne = (d) => setClosureAction(d, closureStatus, note.trim() || undefined);
    } else if (kind === "todo") {
      if (!title.trim()) {
        setError("内容を入力してください。");
        return;
      }
      runOne = (d) => createTodoAction({ todo_date: d, content: title.trim() });
    } else if (kind === "school_event") {
      if (!schoolName.trim() || !title.trim()) {
        setError("学校名と行事名を入力してください。");
        return;
      }
      runOne = (d) =>
        createSchoolEventAction({
          schoolName: schoolName.trim(),
          event_date: d,
          title: title.trim(),
          note: note.trim() || undefined,
        });
    } else if (kind === "lesson") {
      if (!periodId || !subjectId) {
        setError("コマと科目を選んでください。");
        return;
      }
      if (visibility !== "all" && studentIds.length === 0) {
        setError("対象の生徒を1人以上選んでください。");
        return;
      }
      const subjectName = subjects.find((s) => s.id === subjectId)?.name ?? "授業";
      runOne = (d) =>
        createCalendarEventAction({
          eventType: "lesson",
          eventDate: d,
          periodId: Number(periodId),
          subjectId: Number(subjectId),
          title: title.trim() || subjectName,
          note: note.trim() || undefined,
          visibility,
          studentIds,
        });
    } else {
      // teacher / juku
      if (!title.trim()) {
        setError("タイトルを入力してください。");
        return;
      }
      if (visibility === "selected" && studentIds.length === 0) {
        setError("対象の生徒を1人以上選んでください。");
        return;
      }
      runOne = (d) =>
        createCalendarEventAction({
          eventType: kind,
          eventDate: d,
          startTime: startTime || undefined,
          endTime: endTime || undefined,
          title: title.trim(),
          note: note.trim() || undefined,
          visibility,
          studentIds: visibility === "selected" ? studentIds : undefined,
        });
    }

    startTransition(async () => {
      let done = 0;
      for (const d of dates) {
        try {
          await runOne(d);
          done++;
        } catch (e: any) {
          // 途中で失敗したら止める。ここまでに登録できた分はそのまま残る。
          setError(`${done}/${dates.length}日分を登録した後、${d}でエラーになりました: ${e?.message ?? "登録に失敗しました"}`);
          return;
        }
      }
      onClose();
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
          {kind !== "notice" && (
            <div className="space-y-2">
              <span className="text-xs text-[var(--color-ink-soft)]">
                日付(複数選べます。同じ内容がすべての日に登録されます)
              </span>
              <div className="flex flex-wrap gap-1">
                {dates.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-white px-2 py-0.5 text-xs"
                  >
                    {d}
                    <button
                      type="button"
                      onClick={() => removeDate(d)}
                      aria-label={`${d}を外す`}
                      className="text-[var(--color-ink-soft)]"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {dates.length === 0 && (
                  <span className="text-xs text-[var(--color-ink-soft)]">まだ選ばれていません</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    addDate(dateInput);
                    setDateInput("");
                  }}
                  disabled={!dateInput}
                  className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs disabled:opacity-50"
                >
                  日付を追加
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-ink-soft)]">
                <span>期間で追加:</span>
                <input
                  type="date"
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(e.target.value)}
                  className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
                />
                <span>〜</span>
                <input
                  type="date"
                  value={rangeTo}
                  onChange={(e) => setRangeTo(e.target.value)}
                  className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
                />
                <button
                  type="button"
                  onClick={addRange}
                  disabled={!rangeFrom || !rangeTo}
                  className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs disabled:opacity-50"
                >
                  期間を追加
                </button>
              </div>
            </div>
          )}

          {kind === "closure" && (
            <div className="space-y-1">
              <span className="text-xs text-[var(--color-ink-soft)]">種類</span>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    checked={closureStatus === "closed"}
                    onChange={() => setClosureStatus("closed")}
                  />
                  休講
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    checked={closureStatus === "open"}
                    onChange={() => setClosureStatus("open")}
                  />
                  特別開講
                </label>
              </div>
              <p className="text-xs text-[var(--color-ink-soft)]">
                日曜・月曜は通常休講です。ここで登録した日は、通常の設定より優先されます。
              </p>
            </div>
          )}

          {kind === "notice" && (
            <Field label="タイトル">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: 夏期講習のお知らせ"
                className="w-full rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
              />
            </Field>
          )}

          {kind === "todo" && (
            <Field label="内容">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: ○○さんに電話する"
                className="w-full rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
              />
            </Field>
          )}

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

          {kind !== "school_event" && kind !== "todo" && (
            <Field label={kind === "notice" ? "本文(任意)" : "メモ(任意)"}>
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

          {kind !== "school_event" && kind !== "notice" && kind !== "todo" && kind !== "closure" && (
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
            kind !== "notice" &&
            kind !== "todo" &&
            kind !== "closure" &&
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
            <p className="text-sm" style={{ color: "var(--color-error)" }}>
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
