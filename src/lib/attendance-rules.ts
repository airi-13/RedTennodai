// 欠席・振替登録に関する時間ルール(DBに依存しない純粋関数)。

// 対象授業の開始時刻(date + start_time)の5分前を過ぎていたら登録不可。
export function isBeforeRegistrationDeadline(
  targetDate: string, // 'YYYY-MM-DD'
  periodStartTime: string | null, // 'HH:MM:SS' | null
  now: Date = new Date()
): boolean {
  if (!periodStartTime) return true; // 時刻不明なら制限しない
  const [h, m] = periodStartTime.split(":").map(Number);
  const [y, mo, d] = targetDate.split("-").map(Number);
  const lessonStart = new Date(y, mo - 1, d, h, m);
  const deadline = new Date(lessonStart.getTime() - 5 * 60 * 1000);
  return now.getTime() <= deadline.getTime();
}

// 振替日は元の授業日より後、かつ4週間(28日)以内のみ有効。
export function isValidMakeupDateRange(targetDate: string, makeupDate: string): boolean {
  const [y1, m1, d1] = targetDate.split("-").map(Number);
  const [y2, m2, d2] = makeupDate.split("-").map(Number);
  const target = new Date(y1, m1 - 1, d1);
  const makeup = new Date(y2, m2 - 1, d2);
  const diffDays = (makeup.getTime() - target.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > 0 && diffDays <= 28;
}
