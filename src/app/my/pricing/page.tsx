// src/app/my/pricing/page.tsx
import Link from 'next/link'
import { listPricingRules } from '@/lib/data/pricing'
import { listTextbooks } from '@/lib/data/textbooks'
import PricingSimulator from './pricing-simulator'

export const dynamic = 'force-dynamic'

const BRAND = '#D13C18'

export default async function PricingPage() {
  const [rules, textbooks] = await Promise.all([listPricingRules(), listTextbooks()])
  const subjects = Array.from(new Set(textbooks.map((t) => t.subject)))

  return (
    <div className="mx-auto max-w-lg p-4">
      <Link href="/my" className="text-sm text-neutral-500">
        ← カレンダーに戻る
      </Link>
      <h1 className="mt-2 mb-4 text-lg font-semibold" style={{ color: BRAND }}>
        💴 費用シミュレーション
      </h1>
      <PricingSimulator rules={rules} subjects={subjects} brand={BRAND} />
      <p className="mt-4 text-xs text-neutral-400">
        ※ 入塾金・教材費は含みません。表示は概算です。
      </p>
    </div>
  )
}
