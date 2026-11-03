import { describe, it, expect } from "vitest";
import { isBeforeRegistrationDeadline, isValidMakeupSourceSlot, isValidMakeupDestinationSlot, isValidMakeupDateRange } from "../src/lib/attendance-rules";
import { todayJst, currentYearMonthJst, addDaysIso, jstInstant } from "../src/lib/jst";

const Z = (s: string) => new Date(s);

describe(`締切判定 (TZ=${process.env.TZ})`, () => {
  // 授業: 2026-10-12 17:15 JST = 08:15Z。締切は17:10 JST = 08:10Z
  const L = "2026-10-12", S = "17:15:00";
  it("授業の7時間前はOK", () => expect(isBeforeRegistrationDeadline(L, S, Z("2026-10-12T01:15:00Z"))).toBe(true));
  it("ちょうど5分前(17:10:00)はOK", () => expect(isBeforeRegistrationDeadline(L, S, Z("2026-10-12T08:10:00Z"))).toBe(true));
  it("5分前を1秒過ぎる(17:10:01)とNG", () => expect(isBeforeRegistrationDeadline(L, S, Z("2026-10-12T08:10:01Z"))).toBe(false));
  it("授業の3分前はNG", () => expect(isBeforeRegistrationDeadline(L, S, Z("2026-10-12T08:12:00Z"))).toBe(false));
  it("授業開始5分後はNG", () => expect(isBeforeRegistrationDeadline(L, S, Z("2026-10-12T08:20:00Z"))).toBe(false));
  it("授業終了後(21:00)はNG", () => expect(isBeforeRegistrationDeadline(L, S, Z("2026-10-12T12:00:00Z"))).toBe(false));
  it("翌日以降の授業はOK", () => expect(isBeforeRegistrationDeadline("2026-10-13", S, Z("2026-10-12T12:00:00Z"))).toBe(true));
  it("開始時刻が不明なら制限しない", () => expect(isBeforeRegistrationDeadline(L, null, Z("2026-10-12T23:00:00Z"))).toBe(true));
});

describe(`振替元・振替先の判定 (TZ=${process.env.TZ})`, () => {
  it("振替元: 開始まで5分以上あればOK / 5分を切るとNG", () => {
    expect(isValidMakeupSourceSlot("2026-10-12", "17:15:00", Z("2026-10-12T08:10:00Z"))).toBe(true);
    expect(isValidMakeupSourceSlot("2026-10-12", "17:15:00", Z("2026-10-12T08:10:01Z"))).toBe(false);
  });
  it("振替先: 現在より前のコマはNG(同日の終わったコマを選べない)", () => {
    // 今=10/12 17:20 JST。同日17:15のコマは過去 → NG、18:00のコマはOK
    expect(isValidMakeupDestinationSlot("2026-10-12", "2026-10-12", "17:15:00", Z("2026-10-12T08:20:00Z"))).toBe(false);
    expect(isValidMakeupDestinationSlot("2026-10-12", "2026-10-12", "18:00:00", Z("2026-10-12T08:20:00Z"))).toBe(true);
  });
  it("振替先: 元の授業日の28日後までOK、29日後はNG", () => {
    const now = Z("2026-10-12T01:00:00Z");
    expect(isValidMakeupDestinationSlot("2026-10-12", "2026-11-09", "20:00:00", now)).toBe(true);
    expect(isValidMakeupDestinationSlot("2026-10-12", "2026-11-10", "09:00:00", now)).toBe(false);
  });
  it("振替日の範囲: 同日NG / +1日OK / +28日OK / +29日NG / 年またぎOK", () => {
    expect(isValidMakeupDateRange("2026-10-12", "2026-10-12")).toBe(false);
    expect(isValidMakeupDateRange("2026-10-12", "2026-10-13")).toBe(true);
    expect(isValidMakeupDateRange("2026-10-12", "2026-11-09")).toBe(true);
    expect(isValidMakeupDateRange("2026-10-12", "2026-11-10")).toBe(false);
    expect(isValidMakeupDateRange("2026-12-20", "2027-01-10")).toBe(true);
  });
});

describe(`日本時間の日付 (TZ=${process.env.TZ})`, () => {
  it("UTC 15:00 を過ぎると、日本ではもう翌日", () => {
    expect(todayJst(Z("2026-10-12T14:59:59Z"))).toBe("2026-10-12");
    expect(todayJst(Z("2026-10-12T15:00:00Z"))).toBe("2026-10-13");
  });
  it("月末のUTC夜は、日本では翌月(今月の既定表示が正しい)", () => {
    expect(currentYearMonthJst(Z("2026-09-30T15:00:00Z"))).toEqual({ year: 2026, month: 10 });
    expect(currentYearMonthJst(Z("2026-12-31T15:00:00Z"))).toEqual({ year: 2027, month: 1 });
  });
  it("日付の加減算(年またぎ・うるう年)", () => {
    expect(addDaysIso("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysIso("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDaysIso("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDaysIso("2026-10-12", -28)).toBe("2026-09-14");
  });
  it("jstInstant: 日本時間17:15は 08:15Z", () => {
    expect(new Date(jstInstant("2026-10-12", "17:15:00")).toISOString()).toBe("2026-10-12T08:15:00.000Z");
  });
});
