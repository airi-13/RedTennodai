// DBクライアントに依存しない純粋なロジック。クライアントコンポーネント(料金シミュレーター)から
// 安全にimportできるよう、DB接続を持つ lib/data/pricing.ts とは分離している。
export type PricingRule = {
  grade_label: string;
  price_per_slot: number;
};

export function calculateMonthlyFee(
  rules: PricingRule[],
  gradeLabel: string,
  slotsPerWeek: number
): { monthly: number; yearly: number } | null {
  const rule = rules.find((r) => r.grade_label === gradeLabel);
  if (!rule) return null;
  const monthly = rule.price_per_slot * slotsPerWeek;
  return { monthly, yearly: monthly * 12 };
}
