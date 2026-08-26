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
  if (item.type === "announcement") return { background: "#FFF3CD" };
  if (item.type === "school_event") return { background: "#E3EEFB" };
  switch (item.status) {
    case "absent":
    case "makeup": // 振替前(元)のコマも欠席と同様に赤
      return { background: "var(--color-absent)", color: "white" };
    case "makeup_added": // 振替先のコマ
      return { background: "var(--color-makeup)", color: "white" };
    case "late":
      return { background: "var(--color-late)", color: "white" };
    default: // scheduled / present: 通常授業は黒文字
      return { background: "transparent", color: "var(--color-ink)", border: "1px solid var(--color-border)" };
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

  const [days, { data: notices }] = await Promise.all([
    buildStudentCalendar({
      studentId: student.id,
      schoolId: student.school_id,
      year,
      month,
    }),
    supabase.from("notices").select("*").order("created_at", { ascending: false }).limit(5),
  ]);

  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const leadingBlanks = Array.from({ length: firstWeekday });

  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-lg font-bold">{student.name}さんのカレンダー</h1>

      {notices && notices.length > 0 && (
        <div className="space-y-2 rounded-lg border-2 border-[var(--color-accent)] bg-[var(--color-accent-soft)] p-4">
          <p className="font-display text-sm font-bold" style={{ color: "var(--color-accent-dark)" }}>
            📌 教室からのお知らせ
          </p>
          <ul className="space-y-1 text-sm">
            {notices.map((n) => (
              <li key={n.id}>
                <span className="font-medium">{n.title}</span>
                {n.body && <span className="text-[var(--color-ink-soft)]"> — {n.body}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

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
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--color-accent-soft)" }} />
            通常授業
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--color-absent)" }} />
            欠席
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--color-makeup)" }} />
            振替
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
    </div>
  );
}
