"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import type { CalendarDay, CalendarDayItem } from "@/lib/data/calendar";
import { submitRequestAction } from "@/app/my/request/actions";

function lessonLabel(item: Extract<CalendarDayItem, { type: "lesson" }>) {
  const base = `${item.periodLabel} ${item.subject}`;
  switch (item.status) {
    case "absent": return `${base}(欠席)`;
    case "no_show": return `${base}(無断欠席)`;
    case "late": return `${base}(遅刻)`;
    case "makeup": return `${base}(振替済)`;
    case "makeup_added": return `${base}(振替授業)`;
    default: return base;
  }
}

function itemStyle(item: CalendarDayItem) {
  if (item.type === "announcement") return { background: "#FFF3CD" };
  if (item.type === "school_event") return { background: "#E3EEFB" };
  switch (item.status) {
    case "absent": return { background: "var(--color-absent)", color: "white" };
    case "makeup":
    case "no_show": return { background: "#B9B9B9", color: "white" };
    case "makeup_added": return { background: "var(--color-makeup)", color: "white" };
    case "late": return { background: "var(--color-late)", color: "white" };
    default: return { background: "white", color: "var(--color-ink)", border: "1px solid var(--color-border)" };
  }
}

function monthLabel(year: number, month: number) { return `${year}年${month}月`; }
function todayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
function fourWeeksAfter(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + 28);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}
function formatDateTime(date: string, start: string | null) {
  const [, m, d] = date.split("-").map(Number);
  return `${m}/${d} ${start ? start.slice(0, 5) : ""}〜`;
}

type SelectedLesson = { date: string; item: Extract<CalendarDayItem, { type: "lesson" }> };

export function CalendarGrid({ year, month, days, periods }: {
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
        <Link href={`/my?y=${prev.y}&m=${prev.m}`} className="rounded-full border border-[var(--color-ink)] px-2 py-0.5 text-sm">←</Link>
        <span className="font-display font-bold">{monthLabel(year, month)}</span>
        <Link href={`/my?y=${next.y}&m=${next.m}`} className="rounded-full border border-[var(--color-ink)] px-2 py-0.5 text-sm">→</Link>
      </div>
      <div className="mb-2 flex flex-wrap gap-3 text-[10px] text-[var(--color-ink-soft)]">
        <span>○ 通常授業</span><span>○ 欠席</span><span>○ 振替授業</span><span>○ 学校行事</span><span>○ 塾のお知らせ</span>
      </div>
      <p className="mb-2 text-[10px] text-[var(--color-ink-soft)]">授業をタップすると詳細と申請ができます。</p>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-[var(--color-ink-soft)]">
        {["日", "月", "火", "水", "木", "金", "土"].map((d) => <div key={d}>{d}</div>)}
        {leadingBlanks.map((_, i) => <div key={`blank-${i}`} />)}
        {days.map((day) => (
          <div key={day.date} className="min-h-[72px] rounded-md border border-[var(--color-border)] bg-white p-1 text-left" style={day.status === "closed" ? { background: "var(--color-accent-soft)" } : undefined}>
            <div className="text-[10px] text-[var(--color-ink-soft)]">{Number(day.date.slice(-2))}{day.status === "closed" && <span className="ml-1 font-bold" style={{ color: "var(--color-accent-dark)" }}>休</span>}</div>
            <div className="mt-0.5 space-y-0.5">
              {day.items.map((item, i) => item.type === "lesson" ? (
                <button key={i} onClick={() => setSelected({ date: day.date, item })} className="block w-full truncate rounded px-1 text-left text-[10px]" style={itemStyle(item)} title={lessonLabel(item)}>{lessonLabel(item)}</button>
              ) : <div key={i} className="truncate rounded px-1 text-[10px]" style={itemStyle(item)} title={item.title}>{item.title}</div>)}
            </div>
          </div>
        ))}
      </div>
      {selected && <LessonModal selected={selected} periods={periods} onClose={() => setSelected(null)} />}
    </div>
  );
}

function LessonModal({ selected, periods, onClose }: { selected: SelectedLesson; periods: { id: number; name: string; start_time: string | null }[]; onClose: () => void }) {
  const { date, item } = selected;
  const period = periods.find((p) => p.name === item.periodLabel);
  if (item.status === "makeup") {
    const destinationPeriod = periods.find((p) => p.id === item.transferToPeriodId);
    return <Overlay onClose={onClose}><div className="space-y-1 text-sm font-medium text-[var(--color-ink)]"><p className="font-bold">振替済</p><p>{formatDateTime(date, period?.start_time ?? null)}</p><p className="pl-8">↓</p><p>{formatDateTime(item.transferToDate ?? date, destinationPeriod?.start_time ?? null)}</p></div></Overlay>;
  }
  if (item.status === "makeup_added") {
    const sourcePeriod = periods.find((p) => p.name === item.transferFromPeriodLabel);
    return <MakeupDestinationModal selected={selected} targetPeriodId={period?.id ?? ""} sourceTime={formatDateTime(item.transferFromDate ?? date, sourcePeriod?.start_time ?? null)} destinationTime={formatDateTime(date, period?.start_time ?? null)} onClose={onClose} />;
  }
  return <Overlay onClose={onClose}><ModalHeader date={date} item={item} onClose={onClose} /><NewRegistrationForm date={date} periodId={period?.id ?? ""} periods={periods} /></Overlay>;
}

function MakeupDestinationModal({ selected, targetPeriodId, sourceTime, destinationTime, onClose }: { selected: SelectedLesson; targetPeriodId: number | ""; sourceTime: string; destinationTime: string; onClose: () => void }) {
  const [state, formAction, isPending] = useActionState(submitRequestAction, undefined);
  return <Overlay onClose={onClose}>
    <div className="space-y-2"><p className="font-bold">振替授業</p><p className="text-sm">{sourceTime}</p><p className="pl-8 text-sm">↓</p><p className="text-sm">{destinationTime}</p><p className="inline-block rounded-full border border-[var(--color-makeup)] px-3 py-1 text-xs font-medium" style={{ color: "var(--color-makeup)" }}>[振替]</p></div>
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="requestType" value="absence" />
      <input type="hidden" name="targetDate" value={selected.date} />
      <input type="hidden" name="targetPeriodId" value={targetPeriodId} />
      <textarea name="reason" rows={2} placeholder="理由・連絡事項" className="w-full rounded-md border border-[var(--color-border)] px-2 py-1 text-sm" />
      {state?.error && <p className="text-sm" style={{ color: "var(--color-absent)" }}>{state.error}</p>}
      <button type="submit" disabled={isPending || targetPeriodId === ""} className="w-full rounded-md py-2 text-sm font-medium text-white disabled:opacity-50" style={{ background: "var(--color-absent)" }}>欠席</button>
      <p className="text-[10px] text-[var(--color-ink-soft)]">授業開始5分前まで申請できます。</p>
    </form>
  </Overlay>;
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}><div className="w-full max-w-sm space-y-4 rounded-lg bg-white p-5" onClick={(e) => e.stopPropagation()}>{children}</div></div>; }
function ModalHeader({ date, item, onClose }: { date: string; item: Extract<CalendarDayItem, { type: "lesson" }>; onClose: () => void }) { return <div className="flex items-start justify-between"><div><p className="font-display font-bold">{date}</p><p className="text-sm text-[var(--color-ink-soft)]">{item.periodLabel} {item.subject}</p></div><button onClick={onClose} className="text-[var(--color-ink-soft)]">✕</button></div>; }

function NewRegistrationForm({ date, periodId, periods }: { date: string; periodId: number | ""; periods: { id: number; name: string; start_time: string | null }[] }) {
  const [requestType, setRequestType] = useState<"absence" | "makeup">("absence");
  const [makeupDate, setMakeupDate] = useState("");
  const [makeupPeriodId, setMakeupPeriodId] = useState<number | "">("");
  const [state, formAction, isPending] = useActionState(submitRequestAction, undefined);
  const maxMakeup = fourWeeksAfter(date);
  const today = todayString();
  const availablePeriods = useMemo(() => {
    if (makeupDate !== today) return periods;
    const now = new Date();
    return periods.filter((p) => {
      if (!p.start_time) return false;
      const [h, m] = p.start_time.split(":").map(Number);
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
      return start.getTime() >= now.getTime();
    });
  }, [makeupDate, periods, today]);

  return <form action={formAction} className="space-y-3">
    <input type="hidden" name="targetDate" value={date} /><input type="hidden" name="targetPeriodId" value={periodId} />
    <div className="flex gap-4 text-sm"><label className="flex items-center gap-1"><input type="radio" name="requestType" value="absence" checked={requestType === "absence"} onChange={() => setRequestType("absence")} />欠席</label><label className="flex items-center gap-1"><input type="radio" name="requestType" value="makeup" checked={requestType === "makeup"} onChange={() => setRequestType("makeup")} />振替</label></div>
    {requestType === "makeup" && <><div className="space-y-2"><label className="block text-xs text-[var(--color-ink-soft)]">振替授業</label><input type="date" name="makeupDate" value={makeupDate} onChange={(e) => setMakeupDate(e.target.value)} min={today} max={maxMakeup} required className="w-full rounded-md border border-[var(--color-border)] px-2 py-1 text-sm" /><select name="makeupPeriodId" value={makeupPeriodId} onChange={(e) => setMakeupPeriodId(e.target.value ? Number(e.target.value) : "")} required className="w-full rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"><option value="">コマを選択</option>{availablePeriods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div><p className="text-[10px] text-[var(--color-ink-soft)]">振替授業は現在時刻以降、元授業日の4週間後23:59まで選択できます。</p></>}
    <textarea name="reason" rows={2} placeholder="理由・連絡事項" className="w-full rounded-md border border-[var(--color-border)] px-2 py-1 text-sm" />
    {state?.error && <p className="text-sm" style={{ color: "var(--color-absent)" }}>{state.error}</p>}
    <button type="submit" disabled={isPending || (requestType === "makeup" && (!makeupDate || makeupPeriodId === ""))} className="w-full rounded-md py-2 text-sm font-medium text-white disabled:opacity-50" style={{ background: "var(--color-accent)" }}>申請</button>
    {requestType === "absence" && <p className="text-[10px] text-[var(--color-ink-soft)]">欠席は授業開始5分前まで申請できます。</p>}
    {requestType === "makeup" && <p className="text-[10px] text-[var(--color-ink-soft)]">振替の元授業は、現在時刻から5分以上先の授業のみ選択できます。</p>}
  </form>;
}
