// 欠席・振替登録に関する時間ルール。

// 欠席は対象授業の開始5分前まで登録可能。
export function isBeforeRegistrationDeadline(
  targetDate: string,
  periodStartTime: string | null,
  now: Date = new Date()
): boolean {
  if (!periodStartTime) return true;
  const [h, m] = periodStartTime.split(":").map(Number);
  const [y, mo, d] = targetDate.split("-").map(Number);
  const lessonStart = new Date(y, mo - 1, d, h, m);
  const deadline = new Date(lessonStart.getTime() - 5 * 60 * 1000);
  return now.getTime() <= deadline.getTime();
}

// 振替の元授業は「現在時刻+5分」以降の授業のみ対象にする。
export function isValidMakeupSourceSlot(
  targetDate: string,
  periodStartTime: string | null,
  now: Date = new Date()
): boolean {
  if (!periodStartTime) return false;
  const [h, m] = periodStartTime.split(":").map(Number);
  const [y, mo, d] = targetDate.split("-").map(Number);
  const lessonStart = new Date(y, mo - 1, d, h, m);
  const minimum = new Date(now.getTime() + 5 * 60 * 1000);
  return lessonStart.getTime() >= minimum.getTime();
}

// 振替先は現在時刻以降、元授業日の4週間後23:59まで。
export function isValidMakeupDestinationSlot(
  targetDate: string,
  makeupDate: string,
  makeupPeriodStartTime: string | null,
  now: Date = new Date()
): boolean {
  if (!makeupPeriodStartTime) return false;
  const [y1, m1, d1] = targetDate.split("-").map(Number);
  const [y2, m2, d2] = makeupDate.split("-").map(Number);
  const [h, m] = makeupPeriodStartTime.split(":").map(Number);
  const makeup = new Date(y2, m2 - 1, d2, h, m).getTime();
  const maxDate = new Date(y1, m1 - 1, d1 + 28, 23, 59, 59, 999).getTime();
  return makeup >= now.getTime() && makeup <= maxDate;
}

export function isValidMakeupDateRange(targetDate: string, makeupDate: string): boolean {
  const [y1, m1, d1] = targetDate.split("-").map(Number);
  const [y2, m2, d2] = makeupDate.split("-").map(Number);
  const target = new Date(y1, m1 - 1, d1);
  const makeup = new Date(y2, m2 - 1, d2);
  const diffDays = (makeup.getTime() - target.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > 0 && diffDays <= 28;
}

// 振替授業は再振替不可。欠席申請のUIではこの注意文を表示する。
export const MAKEUP_LESSON_NOTICE = "※振替授業のため、このコマの振替はできません";
