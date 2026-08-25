import { redirect } from "next/navigation";
import Link from "next/link";
import { createAnonClient } from "@/lib/supabase-anon";
import { buildStudentCalendar } from "@/lib/data/calendar";

export const dynamic = "force-dynamic";

function lessonLabel(item: Extract<import("@/lib/data/calendar").CalendarDayItem, { type: "lesson" }>) {
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

function itemStyle(item: import("@/lib/data/calendar").CalendarDayItem) {
  if (item.type === "announcement") return { bg: "#FFF3CD" };
  if (item.type === "school_event") return { bg: "#E3EEFB" };
  switch (item.status) {
    case "absent":
      return { bg: "var(--color-absent)", color: "white" };
    case "makeup":
      return { bg: "var(--color-makeup)", color: "white" };
    case "makeup_added":
      return { bg: "var(--color-makeup)", color: "white" };
    case "late":
      return { bg: "var(--color-late)", color: "white" };
    default:
      return { bg: "var(--color-accent-soft)" };
  }
}

function monthLabel(year: number, month: number) {
  return `${year}年${month}月`;
}

export default async function MyCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = params.y ? Number(params.y) : now.getFullYear();
  const month = params.m ? Number(params.m) : now.getMonth() + 1;

  const supabase = await createAnonClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: student } = await supabase
    .from("students")
    .select("id, name, school_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!student) {
    return <p>生徒情報が見つかりませんでした。教室までお問い合わせください。</p>;
  }

  const days = await buildStudentCalendar({
    studentId: student.id,
    schoolId: student.school_id,
    year,
    month,
  });

  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const leadingBlanks = Array.from({ length: firstWeekday });

  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{student.name}さんのカレンダー</h1>
        <div className="flex gap-3 text-sm">
          <Link href="/my/history" className="text-[var(--color-ink-soft)] underline">
            出欠履歴
          </Link>
          <Link href="/my/textbooks" className="text-[var(--color-ink-soft)] underline">
            使用テキスト
          </Link>
          <Link href="/my/pricing" className="text-[var(--color-ink-soft)] underline">
            費用シミュレーション
          </Link>
          <Link
            href="/my/request"
            className="rounded-md px-3 py-1 font-medium text-white"
            style={{ background: "var(--color-accent)" }}
          >
            欠席・振替を申請
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <Link
          href={`/my?y=${prev.y}&m=${prev.m}`}
          className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
        >
          ← 前月
        </Link>
        <span className="font-medium">{monthLabel(year, month)}</span>
        <Link
          href={`/my?y=${next.y}&m=${next.m}`}
          className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
        >
          翌月 →
        </Link>
      </div>

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
            className="min-h-[72px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-1 text-left"
            style={day.status === "closed" ? { background: "var(--color-bg)" } : undefined}
          >
            <div className="text-[10px] text-[var(--color-ink-soft)]">
              {Number(day.date.slice(-2))}
              {day.status === "closed" && <span className="ml-1">休講</span>}
            </div>
            <div className="mt-0.5 space-y-0.5">
              {day.items.map((item, i) => (
                <div
                  key={i}
                  className="truncate rounded px-1 text-[10px]"
                  style={itemStyle(item)}
                  title={item.type === "lesson" ? lessonLabel(item) : item.title}
                >
                  {item.type === "lesson" ? lessonLabel(item) : item.title}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
