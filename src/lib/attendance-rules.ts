// 欠席・振替登録に関する時間ルール。

export function isBeforeRegistrationDeadline(targetDate: string, periodStartTime: string | null, now: Date = new Date()): boolean {
  if (!periodStartTime) return true;
  const [h, m] = periodStartTime.split(":").map(Number);
  const [y, mo, d] = targetDate.split("-").map(Number);
  const lessonStart = new Date(y, mo - 1, d, h, m);
  return now.getTime() <= lessonStart.getTime() - 5 * 60 * 1000;
}

export function isValidMakeupSourceSlot(targetDate: string, periodStartTime: string | null, now: Date = new Date()): boolean {
  if (!periodStartTime) return false;
  const [h, m] = periodStartTime.split(":").map(Number);
  const [y, mo, d] = targetDate.split("-").map(Number);
  const lessonStart = new Date(y, mo - 1, d, h, m);
  return lessonStart.getTime() >= now.getTime() + 5 * 60 * 1000;
}

export function isValidMakeupDestinationSlot(targetDate: string, makeupDate: string, makeupPeriodStartTime: string | null, now: Date = new Date()): boolean {
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
  const diffDays = (new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()) / 86400000;
  return diffDays > 0 && diffDays <= 28;
}

export const MAKEUP_LESSON_NOTICE = "※振替授業のため、このコマの振替はできません";
