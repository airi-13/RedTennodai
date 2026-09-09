import { redirect } from "next/navigation";
import { createAnonClient } from "@/lib/supabase-anon";
import { buildStudentCalendar } from "@/lib/data/calendar";
import { CalendarGrid } from "./CalendarGrid";

export const dynamic = "force-dynamic";

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

  let days, notices, periods;
  try {
    const results = await Promise.all([
      buildStudentCalendar({
        studentId: student.id,
        schoolId: student.school_id,
        year,
        month,
      }),
      supabase.from("notices").select("*").order("created_at", { ascending: false }).limit(5),
      supabase.from("periods").select("id, name, start_time").order("sort_order"),
    ]);
    days = results[0];
    notices = results[1].data;
    periods = results[2].data;
  } catch (e) {
    console.error("MyCalendarPage failed to load data:", e);
    return (
      <div className="space-y-3">
        <h1 className="font-display text-lg font-bold">{student.name}さんのカレンダー</h1>
        <p className="text-sm" style={{ color: "var(--color-absent)" }}>
          カレンダーの読み込み中にエラーが発生しました。時間をおいて再度お試しください。改善しない場合は教室までご連絡ください。
        </p>
      </div>
    );
  }

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

      <CalendarGrid year={year} month={month} days={days} periods={periods ?? []} />
    </div>
  );
}
