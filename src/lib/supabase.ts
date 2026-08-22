import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// 実際に使われる瞬間まで初期化を遅延させる。
// Next.jsはビルド時の「ページデータ収集」フェーズでこのファイルをimportするだけで
// 実行するため、モジュール評価時に即throwすると環境変数未設定時にビルド自体が失敗する。
// Proxyにすることでdata/*.tsの既存コード(supabase.from(...)など)は変更不要。
let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (client) return client;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が設定されていません。環境変数を確認してください。"
    );
  }

  client = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
  return client;
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
});
