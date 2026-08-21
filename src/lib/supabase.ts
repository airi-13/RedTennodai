import "server-only";
import { createClient } from "@supabase/supabase-js";

// サーバー側専用クライアント。service role keyを使うためRLSは考慮せず全テーブルにアクセスできる。
// クライアントコンポーネントからは絶対にimportしないこと(service-onlyパッケージがビルド時に守る)。
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が設定されていません。.env.local を確認してください。"
  );
}

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});
