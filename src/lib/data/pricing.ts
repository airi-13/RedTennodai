// src/lib/data/pricing.ts
import { supabase } from '@/lib/supabase'

export type PricingRule = {
  grade_label: string
  price_per_slot: number
}

export { calculateMonthlyFee } from '@/lib/pricing-rules'

export async function listPricingRules(): Promise<PricingRule[]> {
  const { data, error } = await supabase.from('pricing_rules').select('*')
  if (error) throw error
  return data ?? []
}

export async function upsertPricingRule(rule: PricingRule): Promise<void> {
  const { error } = await supabase.from('pricing_rules').upsert(rule)
  if (error) throw error
}
