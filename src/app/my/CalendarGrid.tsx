"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { CalendarDay, CalendarDayItem } from "@/lib/data/calendar";
import { submitRequestAction, addMakeupDateAction } from "@/app/my/request/actions";

function lessonLabel(item: Extract<CalendarDayItem, { type: "lesson" }>) {
  const base = `${item.periodLabel} ${item.subject}`;
  switch (item.status) {
    case "absent":
      return `${base}(欠席)`;
    case "no_show":
      return `${base}(無断欠席)`;
    case "late":
      return `${base}(遅刻)`;
    case "makeup":
      return item.transferToDate
        ? `${base}(振替→${item.transferToDate})`
        : `${base}(振替・日程未定)`;
    case "makeup_added":
      return `${base}(振替追加・元${item.transferFromDate ?? ""} ${item.transferFromPeriodLabel ?? ""})`;
    default:
      return base;
  }
}

// 白(通常)/グレー(振替元・無断欠席)/青(振替先)/赤(欠席)
function itemStyle(item: CalendarDayItem) {
  if (item.type === "announcement") return { background: "#FFF3CD" };
  if (item.type === "school_event") return { background: "#E3EEFB" };
  switch (item.status) {
    case "absent":
      return { background: "var(--color-absent)", color: "white" };
    case "makeup":
    case "no_show":
      return { background: "#B9B9B9", color: "white" };
    case "makeup_added":
      return { background: "var(--color-makeup)", color: "white" };
    case "late":
      return { background: "var(--color-late)", color: "white" };
    default: // scheduled / present
      return { background: "white", color: "var(--color-ink)", border: "1px solid var(--color-border)" };
  }
}

function monthLabel(year: number, month: number) {
  return `${year}年${month}月`;
}

// 元の授業日から4週間後の日付(振替日inputのmax用)
function fourWeeksAfter(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + 28);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
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
  periods: { id: number; name: string; start_time: string | null }[];
}) {
  const [selected, setSelected] = useState<SelectedLesson | null>(null);

  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const leadingBlanks = Array.from({ length: firstWeekday });
  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };

  return (
    <div className="rounded-lg border-2 border-[var(--color-ink)] bg-[var(--color-surface)] p-4">
      <div className="mb-3 flex items-center justify-center gap-4">
        <Link href={`/my?y=${prev.y}&m=${prev.m}`} className="rounded-full border border-[var(--color-ink)] px-2 py-0.5 text-sm">
          ←
        </Link>
        <span className="font-display font-bold">{monthLabel(year, month)}</span>
        <Link href={`/my?y=${next.y}&m=${next.m}`} className="rounded-full border border-[var(--color-ink)] px-2 py-0.5 text-sm">
          →
        </Link>
      </div>

      <div className="mb-2 flex flex-wrap gap-3 text-[10px] text-[var(--color-ink-soft)]">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full border border-[var(--color-border)]" style={{ background: "white" }} />
          通常授業
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--color-absent)" }} />
          欠席
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#B9B9B9" }} />
          振替元・無断欠席
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
        授業をタップすると詳細と登録ができます(開始5分前まで)。
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
                <span className="ml-1 font-bold" style={{ color: "var(--color-accent-dark)" }}>休</span>
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
                  <div key={i} className="truncate rounded px-1 text-[10px]" style={itemStyle(item)} title={item.title}>
                    {item.title}
                  </div>
                )
              )}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <LessonModal selected={selected} periods={periods} onClose={() => setSelected(null)} />
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
  periods: { id: number; name: string; start_time: string | null }[];
  onClose: () => void;
}) {
  const { date, item } = selected;
  const periodId = periods.find((p) => p.name === item.periodLabel)?.id ?? "";

  // 振替先(振替追加)コマは表示のみ。二重登録を避けるためここからは何も登録させない。
  if (item.status === "makeup_added") {
    return (
      <Overlay onClose={onClose}>
        <ModalHeader date={date} item={item} onClose={onClose} />
        <p className="text-sm text-[var(--color-ink-soft)]">
          このコマは {item.transferFromDate} {item.transferFromPeriodLabel} からの振替で追加されたコマです。
          出欠は「出欠入力」画面(講師側)で管理されます。
        </p>
      </Overlay>
    );
  }

  // 振替日が未確定(欠席、または振替だが日程未定)の場合は「振替日を追加」フォームを出す
  const needsMakeupDate =
    item.status === "absent" || (item.status === "makeup" && !item.transferToDate);

  if (needsMakeupDate && item.attendanceRecordId) {
    return (
      <Overlay onClose={onClose}>
        <ModalHeader date={date} item={item} onClose={onClose} />
        <AddMakeupDateForm
          targetDate={date}
          attendanceRecordId={item.attendanceRecordId}
          periods={periods}
        />
      </Overlay>
    );
  }

  return (
    <Overlay onClose={onClose}>
      <ModalHeader date={date} item={item} onClose={onClose} />
      <NewRegistrationForm date={date} periodId={periodId} periods={periods} />
    </Overlay>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm space-y-4 rounded-lg bg-white p-5" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({
  date,
  item,
  onClose,
}: {
  date: string;
  item: Extract<CalendarDayItem, { type: "lesson" }>;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <p className="font-display font-bold">{date}</p>
        <p className="text-sm text-[var(--color-ink-soft)]">
          {item.periodLabel} {item.subject}
        </p>
      </div>
      <button onClick={onClose} className="text-[var(--color-ink-soft)]">✕</button>
    </div>
  );
}

function NewRegistrationForm({
  date,
  periodId,
  periods,
}: {
  date: string;
  periodId: number | "";
  periods: { id: number; name: string; start_time: string | null }[];
}) {
  const [requestType, setRequestType] = useState<"absence" | "makeup">("absence");
  const [state, formAction, isPending] = useActionState(submitRequestAction, undefined);
  const maxMakeup = fourWeeksAfter(date);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="targetDate" value={date} />
      <input type="hidden" name="targetPeriodId" value={periodId} />

      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-1">
          <input type="radio" name="requestType" value="absence" checked={requestType === "absence"} onChange={() => setRequestType("absence")} />
          欠席
        </label>
        <label className="flex items-center gap-1">
          <input type="radio" name="requestType" value="makeup" checked={requestType === "makeup"} onChange={() => setRequestType("makeup")} />
          振替
        </label>
      </div>

      {requestType === "makeup" && (
        <div className="flex gap-2">
          <input type="date" name="makeupDate" min={date} max={maxMakeup} className="flex-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-sm" />
          <select name="makeupPeriodId" className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm">
            <option value="">コマは後で決める</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}
      {requestType === "makeup" && (
        <p className="text-[10px] text-[var(--color-ink-soft)]">
          振替日は元の授業日から4週間以内({maxMakeup}まで)。未定でも登録でき、後から追加できます。
        </p>
      )}

      <textarea name="reason" rows={2} placeholder="理由・連絡事項(任意)" className="w-full rounded-md border border-[var(--color-border)] px-2 py-1 text-sm" />

      {state?.error && <p className="text-sm" style={{ color: "var(--color-absent)" }}>{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md py-2 text-sm font-medium text-white disabled:opacity-50"
        style={{ background: "var(--color-accent)" }}
      >
        登録する(承認不要・即時反映)
      </button>
      <p className="text-[10px] text-[var(--color-ink-soft)]">
        この授業の開始5分前を過ぎると登録できません。
      </p>
    </form>
  );
}

function AddMakeupDateForm({
  targetDate,
  attendanceRecordId,
  periods,
}: {
  targetDate: string;
  attendanceRecordId: number;
  periods: { id: number; name: string; start_time: string | null }[];
}) {
  const [state, formAction, isPending] = useActionState(addMakeupDateAction, undefined);
  const maxMakeup = fourWeeksAfter(targetDate);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="attendanceRecordId" value={attendanceRecordId} />
      <input type="hidden" name="targetDate" value={targetDate} />

      <p className="text-sm text-[var(--color-ink-soft)]">振替日がまだ決まっていません。決まったら登録してください。</p>

      <div className="flex gap-2">
        <input type="date" name="makeupDate" min={targetDate} max={maxMakeup} required className="flex-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-sm" />
        <select name="makeupPeriodId" required className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm">
          <option value="">コマを選択</option>
          {periods.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <p className="text-[10px] text-[var(--color-ink-soft)]">4週間以内({maxMakeup}まで)</p>

      {state?.error && <p className="text-sm" style={{ color: "var(--color-absent)" }}>{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md py-2 text-sm font-medium text-white disabled:opacity-50"
        style={{ background: "var(--color-makeup)" }}
      >
        振替日を追加する
      </button>
    </form>
  );
}
