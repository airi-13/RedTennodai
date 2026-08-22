"use server";

import { redirect } from "next/navigation";
import { createAnonClient, loginIdToDummyEmail } from "@/lib/supabase-anon";

export async function studentLoginAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const loginId = String(formData.get("loginId") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/my");

  if (!loginId || !password) {
    return { error: "IDとパスワードを入力してください" };
  }

  const supabase = await createAnonClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: loginIdToDummyEmail(loginId),
    password,
  });

  if (error) {
    return { error: "IDまたはパスワードが違います" };
  }

  redirect(next || "/my");
}

export async function studentLogoutAction() {
  const supabase = await createAnonClient();
  await supabase.auth.signOut();
  redirect("/login");
}
