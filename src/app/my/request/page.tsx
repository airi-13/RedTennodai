import Link from "next/link";
import { redirect } from "next/navigation";
import { createAnonClient } from "@/lib/supabase-anon";
import { RequestForm } from "./RequestForm";

export const dynamic = "force-dynamic";

export default async function MyRequestPage() {
  const supabase = await createAnonClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: periods } = await supabase
    .from("periods")
    .select("id, name, sort_order")
    .order("sort_order");

  return (
    <div>
      <RequestForm periods={periods ?? []} />
      <div className="mx-auto w-full max-w-2xl pb-10">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_12px_30px_rgba(27,42,74,0.04)] sm:p-6">
          <p className="text-sm font-bold">欠席した授業の振替を後から登録する</p>
          <p className="mt-1 text-xs leading-5 text-[var(--color-ink-soft)]">過去4週間以内に欠席・振替として登録された授業から、振替日とコマを選べます。</p>
          <Link href="/my/request/makeup" className="mt-4 inline-flex rounded-xl px-4 py-3 text-sm font-bold text-white transition hover:opacity-95" style={{ background: "var(--color-accent)" }}>
            振替を登録する
          </Link>
        </div>
      </div>
    </div>
  );
}
