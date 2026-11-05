import "server-only";
import { cookies } from "next/headers";
import { sha256Hex } from "@/lib/hash";

// 管理者は一人(Aiさん)しか使わない前提のシンプルな共有パスワード方式。
// 本格的な複数管理者アカウントが必要になったらSupabase Authベースに置き換える。
export const ADMIN_COOKIE_NAME = "red_admin_session";

export async function isAdminAuthed(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE_NAME)?.value;
  if (!token || !process.env.ADMIN_PASSWORD) return false;
  return token === (await sha256Hex(process.env.ADMIN_PASSWORD));
}

// 管理者の操作(Server Action)の先頭で呼ぶ。画面の入口(middleware)での認証に加えて、
// サーバー側でも管理者本人かを確認する(Server Actionは画面を経由せず直接呼ばれる可能性があるため)。
export async function requireAdmin(): Promise<void> {
  if (!(await isAdminAuthed())) {
    throw new Error("管理者としてログインし直してください。");
  }
}

export async function setAdminSession() {
  const store = await cookies();
  store.set(ADMIN_COOKIE_NAME, await sha256Hex(process.env.ADMIN_PASSWORD ?? ""), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30日
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE_NAME);
}

export function checkAdminPassword(input: string): boolean {
  return input.length > 0 && input === process.env.ADMIN_PASSWORD;
}
