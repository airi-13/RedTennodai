// login_id(生徒が入力する短いID)からSupabase Auth用のダミーメールを組み立てる。
// 生徒は基本的にメールを持たない前提のため、実在しないダミードメインを使う。
// 管理者側(service role)・生徒ログイン側(anon)の両方から参照する共通ロジック。
export function loginIdToDummyEmail(loginId: string): string {
  return `${loginId}@students.red-tennodai.internal`;
}
