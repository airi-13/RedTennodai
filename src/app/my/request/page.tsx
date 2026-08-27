import Link from "next/link";
import { redirect } from "next/navigation";
import { createAnonClient } from "@/lib/supabase-anon";
import { listTextbooks } from "@/lib/data/textbooks";
import { getPeriods } from "@/lib/data/periods";
import { AdditionalRequestForm } from "./AdditionalRequestForm";

export const dynamic = "force-dynamic";

export default async function MyRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createAnonClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!student) return <p>生徒情報が見つかりませんでした。教室までお問い合わせください。</p>;

  const [textbooks, periodsResult, schedulesResult] = await Promise.all([
    listTextbooks(),
    getPeriods(),
    supabase.from("student_schedules").select("id, day_of_week, period_id, subject_id").eq("student_id", student.id).order("day_of_week").order("period_id"),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <Link href="/my" className="text-sm text-[var(--color-ink-soft)]">← カレンダーに戻る</Link>
        <h1 className="mt-3 text-lg font-semibold">申請</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">希望する内容を選んで申請してください。</p>
      </div>

      {params.submitted === "1" && (
        <div className="rounded-lg border border-[var(--color-present)] bg-[var(--color-present-soft)] p-3 text-sm">
          申請を受け付けました。教室で確認後、対応します。
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-[var(--color-ink-soft)]">各種申請</h2>
        <AdditionalRequestForm
          textbooks={textbooks.map((t) => ({ id: t.id, title: t.title }))}
          schedules={schedulesResult.data ?? []}
          periods={periodsResult}
        />
      </section>

      <section className="rounded-xl border p-5">
        <h2 className="font-medium">欠席・振替</h2>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">カレンダーから対象の授業を選んで申請してください。</p>
        <Link href="/my" className="mt-3 inline-block rounded-md px-4 py-2 text-sm font-medium text-white" style={{ background: "var(--color-accent)" }}>
          カレンダーを開く
        </Link>
      </section>
    </div>
  );
}
