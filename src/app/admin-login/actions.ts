"use server";

import { redirect } from "next/navigation";
import { checkAdminPassword, setAdminSession, clearAdminSession } from "@/lib/admin-auth";

export async function adminLoginAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  if (!checkAdminPassword(password)) {
    return { error: "パスワードが違います" };
  }

  await setAdminSession();
  redirect(next || "/dashboard");
}

export async function adminLogoutAction() {
  await clearAdminSession();
  redirect("/");
}
