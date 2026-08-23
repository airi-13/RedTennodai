# RED教室 生徒管理・出欠管理システム - 引き継ぎプロンプト

最終更新日: 2026-08-23

このファイルをそのままClaudeに貼り付ければ、この開発を引き継いで進められます。DBスキーマの詳細は `docs/database-schema.md` と `docs/schema.sql` を参照してください(この引き継ぎファイル自体には重複記載しません)。

## プロジェクト概要

RED教室(個人経営の学習塾、生徒数は小学生〜高校生で最大50名程度)の生徒管理・出欠管理システム。旧Google Apps Script + スプレッドシート運用から、Next.js + Supabase構成への作り直しプロジェクト。

設計方針: データを読み書きする「データ層」(`src/lib/data/`)と、画面・業務ロジック(`src/app/`)を分離する。将来Supabase以外に切り替える可能性を考慮した設計。

## 現在の構成・アクセス情報

| 項目 | 値 |
|---|---|
| GitHubリポジトリ | https://github.com/airi-13/RedTennodai |
| 本番URL | https://red-attendance.onrender.com |
| Renderサービス | `red-attendance` (service ID: `srv-da44itk9v7es7396sks0`, workspace: `tea-d9k1vl942hec739tnh10`) |
| Supabaseプロジェクト | ID: `abxmytcbbmylvwxrwsqg` |

**注意**: 同じRenderワークスペースに`kakomon-app`という別プロジェクトのサービスが存在するが、本プロジェクトとは無関係。統合・流用しないこと。

管理画面パスワード等の環境変数は`.env.local.example`(必要なキーの一覧)を参照し、実際の値はRenderのEnvironmentタブ、またはSupabaseダッシュボード(Settings > API Keys)で確認する。このファイルには機密情報を書かない方針。

## アクセス権限の引き継ぎ方

トークンやAPIキーを直接受け渡すのではなく、各サービスで新しい担当者を共同編集者として招待すること。

- **GitHub**: リポジトリのSettings > Collaborators and teams から招待
- **Render**: ワークスペースのSettings(People)から招待。`kakomon-app`も見える点に注意
- **Supabase**: 組織のTeam設定から招待(Developer権限などを付与すれば、本人のダッシュボードからservice role keyを含む必要な鍵を取得できる)

アプリ自体の管理画面パスワード(`ADMIN_PASSWORD`)は上記と別で、引き継ぎ時にRenderのEnvironmentタブから新しい値に変更し、チャットやドキュメントに残さず直接口頭・別経路で伝えること。

## 技術スタック・設計上の主な決定事項

- Next.js(App Router, TypeScript, Tailwind v4) / Supabase(Postgres, Auth) / Render(ホスティング) / GitHub
- **管理画面**(`/attendance` `/students` `/requests`): Supabaseのservice role keyでフルアクセス。認証は簡易的な共有パスワード1つ(middleware.tsでCookieを検証)。管理者は実質Aiさん1人の想定
- **生徒本人ログイン**(`/login` `/my` `/my/request`): Supabase Authを使用。生徒はメールを持たない前提のため、生徒ID(`login_id`)を`<login_id>@students.red-tennodai.internal`というダミーメールに変換してサインイン。RLSにより自分の行しか読めない(`auth_user_id`カラムで紐付け)
- **RLS**: 全テーブルで有効化。管理画面はservice role keyなので影響を受けない。生徒(authenticatedロール)は自分の`students`/`student_schedules`/`attendance_records`/`attendance_requests`のみSELECT可、`attendance_requests`は自分の分のみINSERT可
- **コマ(period)**: ①〜⑧の8枠、40分刻み。`period_availability`テーブルで曜日ごとの受付可否を管理者が設定可能(初期値: 平日④〜⑧、土曜①〜⑥、日曜終日クローズ)
- **80分授業(小5以上)**: 同じ曜日・科目で連続する2コマ(①②/③④/⑤⑥/⑦⑧)を`student_schedules`に2行登録することで表現。正しい組み合わせかの検証はDB制約ではなくアプリ層で行い、管理者操作時は警告のみで登録自体は許可する

## 実装済み機能

- `/attendance`: 日付を選ぶとその日の各コマの予定生徒が一覧表示され、クリックで出席/欠席/遅刻/振替と科目をその場で変更できる
- `/students`: 生徒登録(氏名・学校・学年・性別等 + ログインID/パスワードの発行)、定期スケジュール(曜日・コマ・科目)の追加/削除
- `/requests`: 生徒からの欠席・振替申請を確認し、承認/却下する(承認してもattendance_recordsは自動更新されない。手動で`/attendance`から反映する運用)
- `/login` `/my` `/my/request`: 生徒本人が自分の週間スケジュール・直近の出欠履歴を見て、欠席/振替を申請できる

## 未完了・次のステップ

優先度の高い順:

1. **生徒の一括登録(コピペ入力)**: 既存スプレッドシート(生徒ID・性別・姓名・セイメイ・学校・学年・Passなどの列)からタブ区切りでペーストして一括登録する機能。実装着手直後の状態。`gender`カラムはDBに追加済み。既存シートの生徒IDをそのまま`login_id`として使う方針。
2. **振替先日時の入力・表示**: `attendance_records`に`makeup_date`/`makeup_period_id`カラムは追加済みだが、(a)`/attendance`で「振替」を選んだ時にこれらを入力するUI、(b)振替先の日付を表示した際に元の予定にない「追加されたコマ」として見分けられるようにする表示ロジック、の両方が未実装。
3. **ログイン後のトップページ(カレンダー)**: 月次カレンダーを表示し、管理者は生徒の学校行事+その日のTODO、生徒は自分の学校の行事予定+塾の予定を見られるようにしたい。要件が固まっていない箇所:
   - 学校行事は誰が入力するのか(管理者が学校ごとに手入力する想定か)
   - 学校ごとの行事を管理するなら「学校マスタ」テーブルが別途必要(現状`students.school_name`は自由入力)
   - 管理者向け「TODO」は生徒に紐付かない一般的な備忘録的なものでよいか
   - 生徒側の「塾の予定」とは、生徒自身の授業スケジュールのことか、教室全体の休講日等のお知らせのことか

その他、`docs/database-schema.md`の「確認・検討事項」に残っている細かい論点(申請承認時の自動反映など)も未解決。

## 開発の進め方(このプロジェクトでの慣習)

- ドキュメントはMarkdownで作成し、説明はチャット側に書いてドキューメント本体は簡潔に保つ
- ファイルは役割ごとに分割し、1ファイルを長くしすぎない
- DBスキーマを変更したら`docs/schema.sql`と`docs/database-schema.md`も必ず同期させる(Supabaseへ`apply_migration`で反映 → 両ファイルを更新、の順)
- コード変更後は`npm run build`でローカルビルドを確認してからpush(Renderは`npm install`を自動実行しないため、`package.json`の`prebuild`スクリプトで明示的に`npm install`している)
- 「まず動く形を作ってから細かい調整改善をしていく」という進め方を好む
