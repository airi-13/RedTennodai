// 欠席・振替登録に関する時間ルール。
// 授業の開始時刻などは日本時間として扱う(サーバーがUTCで動いていても正しく判定するため。詳細は ./jst.ts)。
import { jstInstant, addDaysIso } from "./jst";

const FIVE_MINUTES_MS = 5 * 60 * 1000;

// 授業開始の5分前まで登録できる。
export function isBeforeRegistrationDeadline(targetDate: string, periodStartTime: string | null, now: Date = new Date()): boolean {
  if (!periodStartTime) return true;
  return now.getTime() <= jstInstant(targetDate, periodStartTime) - FIVE_MINUTES_MS;
}

// 振替元にできるのは、開始まで5分以上ある授業だけ。
export function isValidMakeupSourceSlot(targetDate: string, periodStartTime: string | null, now: Date = new Date()): boolean {
  if (!periodStartTime) return false;
  return jstInstant(targetDate, periodStartTime) >= now.getTime() + FIVE_MINUTES_MS;
}

// 振替先は、現在以降で、元の授業日から28日後の終わり(23:59:59.999)までのコマ。
export function isValidMakeupDestinationSlot(targetDate: string, makeupDate: string, makeupPeriodStartTime: string | null, now: Date = new Date()): boolean {
  if (!makeupPeriodStartTime) return false;
  const makeup = jstInstant(makeupDate, makeupPeriodStartTime);
  const latest = jstInstant(addDaysIso(targetDate, 29)) - 1;
  return makeup >= now.getTime() && makeup <= latest;
}

// 振替日は、元の授業日より後で、28日以内。
export function isValidMakeupDateRange(targetDate: string, makeupDate: string): boolean {
  const [y1, m1, d1] = targetDate.split("-").map(Number);
  const [y2, m2, d2] = makeupDate.split("-").map(Number);
  const diffDays = (Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000;
  return diffDays > 0 && diffDays <= 28;
}

export const MAKEUP_LESSON_NOTICE = "※振替授業のため、このコマの振替はできません";
