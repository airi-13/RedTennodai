import { redirect } from "next/navigation";
import Link from "next/link";
import { createAnonClient } from "@/lib/supabase-anon";
import { MakeupRegisterForm } from "./MakeupRegisterForm";

export const dynamic = "force-dynamic";

function formatDate(date: string) {
  const [, month, day] = date.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

export default async function MakeupRegisterPage() {
  const supabase = await createAnonClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!student) return <p>生徒情報が見つかりませんでした。</p>;

  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 28);
  const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const startDate = toIso(start);
  const todayIso = toIso(today);

  const [{ data: records }, { data: periods }, { data: subjects }] = await Promise.all([
    supabase
      .from("attendance_records")
      .select("id, date, period_id, subject_id, status, makeup_date, makeup_period_id")
      .eq("student_id", student.id)
      .in("status", ["absent", "makeup"])
      .gte("date", startDate)
      .lt("date", todayIso)
      .order("date", { ascending: false }),
    supabase.from("periods").select("id, name").order("sort_order"),
    supabase.from("subjects").select("id, name").order("sort_order"),
  ]);

  const periodById = new Map((periods ?? []).map((p) => [p.id, p.name]));
  const subjectById = new Map((subjects ?? []).map((s) => [s.id, s.name]));
  const candidates = (records ?? []).filter((r) => !r.makeup_date || !r.makeup_period_id);

  return (
    <div className="mx-auto w-full max-w-2xl pb-10">
      <Link href="/my" className="inline-flex items-center gap-1 py-2 text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">← マイページに戻る</Link>
      <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_12px_30px_rgba(27,42,74,0.06)]">
        <header className="border-b border-[var(--color-border)] px-5 py-6 sm:px-8">
          <p className="text-xs font-bold tracking-[0.16em] text-[var(--color-accent)]">MAKEUP REGISTRATION</p>
          <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">振替を登録する</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--color-ink-soft)]">過去4週間以内に欠席・振替として登録された授業から、振替日とコマを登録できます。</p>
        </header>

        <div className="px-5 py-6 sm:px-8 sm:py-8">
          {candidates.length === 0 ? (
            <div className="rounded-xl border border-[var(--color-border)] bg-white/50 px-4 py-8 text-center text-sm text-[var(--color-ink-soft)]">
              振替登録できる授業はありません。
            </div>
          ) : (
            <div className="space-y-3">
              {candidates.map((record) => (
                <div key={record.id} className="rounded-xl border border-[var(--color-border)] bg-white/50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold">{formatDate(record.date)}　{subjectById.get(record.subject_id) ?? "授業"}</p>
                      <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{periodById.get(record.period_id) ?? "コマ未定"} ・ {record.status === "makeup" ? "振替" : "欠席"}</p>
                    </div>
                  </div>
                  <MakeupRegisterForm
                    recordId={record.id}
                    minDate={record.date}
                    maxDate={toIso(new Date(new Date(record.date).getTime() + 28 * 24 * 60 * 60 * 1000)) < todayIso ? toIso(new Date(new Date(record.date).getTime() + 28 * 24 * 60 * 60 * 1000)) : todayIso}
                    periods={periods ?? []}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
