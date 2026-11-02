// 日本時間(JST = UTC+9、夏時間なし)での日付・時刻の扱いをまとめたもの。
//
// サーバー(Render / Cloudflare Workers)はUTCで動く。そのため「17:15」のような教室の時刻を
// `new Date(y, m, d, 17, 15)` のようにサーバーの現地時刻として組み立てると、実際より9時間ずれる。
// 教室の日付・時刻はすべてJSTとして扱い、ここの関数を通して瞬間(UTCミリ秒)に変換する。
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

// 日本時間の "YYYY-MM-DD" と "HH:MM"(または "HH:MM:SS")から、その瞬間(UTCミリ秒)を返す。
export function jstInstant(date: string, time = "00:00"): number {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return Date.UTC(y, mo - 1, d, h, mi) - JST_OFFSET_MS;
}

// 日本時間での「今日」(YYYY-MM-DD)。
export function todayJst(now: Date = new Date()): string {
  return new Date(now.getTime() + JST_OFFSET_MS).toISOString().slice(0, 10);
}

// 日本時間での「今の年・月」。
export function currentYearMonthJst(now: Date = new Date()): { year: number; month: number } {
  const [year, month] = todayJst(now).split("-").map(Number);
  return { year, month };
}

// "YYYY-MM-DD" に日数を足し引きした "YYYY-MM-DD" を返す(日付だけの計算なのでタイムゾーンに依存しない)。
export function addDaysIso(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
