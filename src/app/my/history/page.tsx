import { redirect } from "next/navigation";
import Link from "next/link";
import { createAnonClient } from "@/lib/supabase-anon";
import { studentLogoutAction } from "@/app/login/actions";

export const dynamic = "force-dynamic";

const DOW_LABEL = ["日", "月", "火", "水", "木", "金", "土"];
const STATUS_LABEL: Record<string, string> = {
  present: "出席",
  absent: "欠席",
  late: "遅刻",
  makeup: "振替",
  no_show: "無断欠席",
};

function shortDate(date: string) {
  const [, m, d] = date.split("-").map(Number);
  return `${m}/${d}`;
}

export default async function MyPage() {
  const supabase = await createAnonClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: student } = await supabase.from("students").select("id, name").eq("auth_user_id", user.id).maybeSingle();
  if (!student) return <div className="space-y-3"><p>生徒情報が見つかりませんでした。教室までお問い合わせください。</p><form action={studentLogoutAction}><button className="text-sm underline">ログアウト</button></form></div>;

  const [{ data: schedules }, { data: records }] = await Promise.all([
    supabase.from("student_schedules").select("day_of_week, periods(name, sort_order), subjects(name)").eq("student_id", student.id).order("day_of_week"),
    supabase.from("attendance_records").select("date, period_id, status, makeup_date, makeup_period_id, makeup_attendance_status, periods(name), subjects(name)").eq("student_id", student.id).order("date", { ascending: false }).limit(50),
  ]);

  const scheduleByDay = new Map<number, any[]>();
  for (const s of schedules ?? []) {
    const list = scheduleByDay.get(s.day_of_week) ?? [];
    list.push(s);
    scheduleByDay.set(s.day_of_week, list);
  }
  for (const list of scheduleByDay.values()) list.sort((a, b) => (a.periods?.sort_order ?? 0) - (b.periods?.sort_order ?? 0));

  return <div className="space-y-8">
    <h1 className="text-lg font-semibold">{student.name}さんの授業履歴</h1>
    <Link href="/my/request" className="inline-block rounded-md px-4 py-2 text-sm font-medium text-white" style={{ background: "var(--color-accent)" }}>欠席・振替を申請する</Link>

    <section className="space-y-2">
      <h2 className="text-sm font-medium text-[var(--color-ink-soft)]">毎週のスケジュール</h2>
      <div className="divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
        {[1, 2, 3, 4, 5, 6, 0].map((dow) => {
          const rows = scheduleByDay.get(dow) ?? [];
          if (rows.length === 0) return null;
          return <div key={dow} className="flex gap-3 px-4 py-2 text-sm"><span className="w-6 font-medium">{DOW_LABEL[dow]}</span><span className="text-[var(--color-ink-soft)]">{rows.map((r) => `${r.periods?.name ?? ""} ${r.subjects?.name ?? ""}`).join(" / ")}</span></div>;
        })}
        {(schedules ?? []).length === 0 && <p className="px-4 py-3 text-sm text-[var(--color-ink-soft)]">まだ登録されていません</p>}
      </div>
    </section>

    <section className="space-y-2">
      <h2 className="text-sm font-medium text-[var(--color-ink-soft)]">授業履歴</h2>
      <div className="divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
        {(records ?? []).map((r: any, i: number) => {
          const isMakeup = r.status === "makeup" && r.makeup_date && r.makeup_period_id;
          const destinationLabel = isMakeup
            ? `${shortDate(r.makeup_date)}${r.makeup_period_id === null ? "" : ` ${r.makeup_period_id}`}`
            : null;
          const resultStatus = isMakeup
            ? (r.makeup_attendance_status ? STATUS_LABEL[r.makeup_attendance_status] : "未登録")
            : (STATUS_LABEL[r.status] ?? r.status);
          return <div key={i} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
            <span>{shortDate(r.date)} {r.periods?.name} {isMakeup ? `→${destinationLabel}` : r.subjects?.name}</span>
            <span className="shrink-0 text-[var(--color-ink-soft)]">{resultStatus}</span>
          </div>;
        })}
        {(records ?? []).length === 0 && <p className="px-4 py-3 text-sm text-[var(--color-ink-soft)]">まだ記録がありません</p>}
      </div>
      <p className="text-[10px] text-[var(--color-ink-soft)]">振替した授業は、元のコマから振替授業への移動として表示します。</p>
    </section>
  </div>;
}
