import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
export { loginIdToDummyEmail } from "@/lib/student-login";

// 生徒本人ログイン用。RLSが効くanon/publishable keyを使い、
// Supabase Authのセッションをcookie経由で保持する(@supabase/ssrの標準パターン)。
// 管理画面側(lib/supabase.ts, service role key)とは別クライアント。
export async function createAnonClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY が設定されていません。"
    );
  }

  return createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Componentから呼ばれた場合、cookie書き込みができないことがあるが
          // middleware側でセッションのrefreshを行っていれば問題ない
        }
      },
    },
  });
}
