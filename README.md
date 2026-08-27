# RED教室 出欠管理システム (v1)

Next.js + Supabase製。DBスキーマの詳細は別リポジトリ/ファイルの `database-schema.md` / `schema.sql` を参照(このアプリのソースには含めていません)。
管理者PASS：S0x6BHP1oqmx9fA9

## 構成

```
src/
├── lib/
│   ├── supabase.ts       Supabaseクライアント(サーバー専用、service role key使用)
│   ├── types.ts          DBスキーマに対応する型定義
│   ├── schedule-rules.ts 80分授業の連続コマ判定(クライアントからも呼べる純粋関数)
│   └── data/              データ層(テーブルごとの読み書き関数)
│       ├── periods.ts / subjects.ts / students.ts / schedules.ts / attendance.ts
└── app/
    ├── attendance/         出欠入力画面(日付選択→コマ別に出欠を入力)
    └── students/           生徒管理画面(生徒の追加・定期スケジュール登録)
```

データ層(`lib/data/*`)と画面・Server Actions(`app/*`)を分離しているので、将来Supabase以外に切り替える場合は`lib/data/`の中身だけ差し替えればよい設計。

## ローカルで動かす

```bash
npm install
cp .env.local.example .env.local
# .env.local を編集し、SupabaseダッシュボードのSettings > APIから
# Project URL と service_role key をコピーする
npm run dev
```

`http://localhost:3000` にアクセスすると `/attendance` にリダイレクトされる。

## v1でできること / できないこと

**できること**
- 日付を選んで、その日の各コマの予定生徒を一覧表示
- 生徒をクリックして出席/欠席/遅刻/振替と科目をその場で変更
- 生徒の追加、定期スケジュール(曜日・コマ・科目)の追加/削除
- 80分授業(小5以上)で不正な単独コマ登録をした場合の警告表示(登録自体は可能)

**まだ未実装(次のステップ候補)**
- 欠席・振替の「申請」画面(`attendance_requests`テーブルは用意済みだが、申請フォーム・承認フローのUIは未実装)
- `period_availability`(曜日別のコマ受付可否)を管理画面から編集するUI(現状はSupabase側で直接更新する運用)
- ログイン/認証(現状は誰でもアクセスできる想定。社内ネットワーク限定運用や、簡易パスワード程度は検討の余地あり)
- 生徒情報の編集(現状は追加と休会/復会の切り替えのみ)

## Renderへのデプロイ

1. このプロジェクトをGitHubリポジトリにpush(kakomon-appとは別の新規リポジトリを推奨)
2. Renderで新規Web Serviceを作成し、そのリポジトリを接続
   - Build Command: `npm run build`
   - Start Command: `npm run start`
   - 環境変数: `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` をRenderのダッシュボードで設定(`.env.local`と同じ値)
3. push時に自動デプロイされる
