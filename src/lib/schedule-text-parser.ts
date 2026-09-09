// 表形式の生徒登録・編集で使う「授業科目」「授業コマ」テキストの解析ロジック。
// 新規一括登録(bulkCreateStudentsAction)と既存生徒の一括編集(bulkUpdateStudentsAction)の
// 両方から使うため、ここに切り出している。

export const SUBJECT_ALIASES: Record<string, string[]> = {
  英: ["英", "英語"],
  数: ["数", "数学"],
  数Ⅰ: ["数Ⅰ", "数学Ⅰ", "数1"],
  数Ⅱ: ["数Ⅱ", "数学Ⅱ", "数2"],
  算: ["算", "算数"],
  国: ["国", "国語"],
  理: ["理", "理科"],
  社: ["社", "社会"],
  QUREO: ["QUREO"],
};

export function subjectCandidates(text: string) {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .flatMap((token) => {
      const aliases = SUBJECT_ALIASES[token] ?? [token];
      return aliases.map((name) => name.toLowerCase());
    });
}

export function parseSchedule(text: string | null): { dayOfWeek: number; periods: string[] }[] {
  if (!text?.trim()) return [];
  const dayMap: Record<string, number> = { 日: 0, 月: 1, 火: 2, 水: 3, 木: 4, 金: 5, 土: 6 };
  const matches = [...text.matchAll(/([日月火水木金土]+)([①②③④⑤⑥⑦⑧]+)/g)];
  return matches.flatMap((m) => {
    const days = [...m[1]].map((d) => dayMap[d]).filter((d) => d !== undefined);
    const periods = [...m[2]];
    return days.map((dayOfWeek) => ({ dayOfWeek, periods }));
  });
}

export function periodNameVariants(name: string) {
  const n = name.trim();
  const arabic = { "①": "1", "②": "2", "③": "3", "④": "4", "⑤": "5", "⑥": "6", "⑦": "7", "⑧": "8" }[n];
  return [n, arabic].filter(Boolean) as string[];
}

// 小5以上(小学5・6年、中学、高校の全学年)は80分授業(2コマ1組)、それ以外は40分授業(1コマ単独)。
export function needsEightyMinutes(schoolLevel: string | null, grade: number | null): boolean {
  if (schoolLevel === "小学生") return (grade ?? 0) >= 5;
  return schoolLevel === "中学生" || schoolLevel === "高校生";
}

// 「日③④,水①②」のように科目とコマをまとめて元のテキスト形式へ戻す(表の初期表示用)。
export function scheduleToText(
  schedules: { day_of_week: number; period_id: number }[],
  periodNameById: Map<number, string>
): string {
  const dayLabel = ["日", "月", "火", "水", "木", "金", "土"];
  const byDay = new Map<number, string[]>();
  for (const s of schedules) {
    const name = periodNameById.get(s.period_id);
    if (!name) continue;
    const list = byDay.get(s.day_of_week) ?? [];
    list.push(name);
    byDay.set(s.day_of_week, list);
  }
  const parts: string[] = [];
  for (const [day, names] of byDay.entries()) {
    parts.push(`${dayLabel[day]}${names.join("")}`);
  }
  return parts.join(",");
}
