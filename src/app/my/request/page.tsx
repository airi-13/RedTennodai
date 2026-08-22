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

  return <RequestForm periods={periods ?? []} />;
}
