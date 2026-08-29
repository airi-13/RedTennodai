# RED教室 出欠管理システム

Next.js + Supabase製。現在の機能一覧・DB設計・運用上の注意は `HANDOFF.md` / `docs/database-schema.md` / `docs/schema.sql` を参照(このREADMEはセットアップ手順のみ)。

## 構成

```
src/
├── lib/
│   ├── supabase.ts        管理画面用クライアント(サーバー専用、service role key)
│   ├── supabase-anon.ts   生徒ログイン用クライアント(publishable key、RLS経由)
│   ├── admin-auth.ts      管理画面の簡易パスワード認証
│   ├── types.ts           DBスキーマに対応する型定義
│   └── data/               データ層(テーブルごとの読み書き関数)
├── app/
│   ├── dashboard/          管理者トップページ(カレンダー)
│   ├── attendance/         出欠入力
│   ├── students/           生徒管理
│   ├── admin-calendar/     休講・お知らせ・学校行事・TODO管理
│   ├── materials/          教材・料金設定
│   ├── requests/           生徒の欠席・振替 履歴
│   ├── login/ my/          生徒ログイン後の画面一式
│   └── admin-login/        管理画面ログイン
└── middleware.ts           管理者・生徒それぞれの認証ガード
```

データ層(`lib/data/*`)と画面・Server Actions(`app/*`)を分離しているので、将来Supabase以外に切り替える場合は`lib/data/`の中身だけ差し替えればよい設計。

## ローカルで動かす

```bash
npm install
cp .dev.vars.example .dev.vars
# .dev.vars を編集し、SupabaseダッシュボードのSettings > API Keysから
# Project URL / service_role key(またはsecret key) / publishable key をコピーする
npm run dev
```

`http://localhost:3000` を開くとログイン選択画面が表示される。

## Cloudflare Workersへのデプロイ(推奨)

このプロジェクトは[OpenNext](https://opennext.js.org/cloudflare)経由でCloudflare Workers上で動作する(`wrangler.jsonc` / `open-next.config.ts`で設定済み)。ローカルでのビルド確認は以下で可能:

```bash
npm run preview   # ビルドしてローカルでCloudflare環境をエミュレート起動
```

実際のデプロイ(GitHub連携・自動デプロイ、ブラウザのみで完結):

1. [Cloudflareダッシュボード](https://dash.cloudflare.com/) → 「Workers & Pages」→「Create application」→「Import a repository」
2. GitHubアカウントを連携し、対象リポジトリ(RedTennodai)を選択
3. ビルド設定:
   - Build command: `npx opennextjs-cloudflare build`
   - Deploy command: `npx wrangler deploy`
4. 環境変数(Settings → Variables and Secrets)に `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_PUBLISHABLE_KEY` / `ADMIN_PASSWORD` をSecretとして登録
5. Save and Deploy。以降はpushのたびに自動ビルド・デプロイされる

## Renderへのデプロイ(従来の構成、参考)

`npm run build` / `npm run start` はRenderでも引き続き動作する。Build Command / Start Commandをそのまま指定し、同じ環境変数を設定すればデプロイできる。
