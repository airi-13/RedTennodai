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
}export const MAKEUP_LESSON_NOTICE = "※振替授業のため、このコマの振替はできません";
