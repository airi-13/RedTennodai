'use client'

// src/app/my/pricing/pricing-simulator.tsx
import { useMemo, useState } from 'react'
import { calculateMonthlyFee, type PricingRule } from '@/lib/pricing-rules'

export default function PricingSimulator({
  rules,
  subjects,
  brand,
}: {
  rules: PricingRule[]
  subjects: string[]
  brand: string
}) {
  const gradeOptions = rules.map((r) => r.grade_label)
  const [grade, setGrade] = useState(gradeOptions[0] ?? '')
  const [slots, setSlots] = useState(1)
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])

  const result = useMemo(
    () => calculateMonthlyFee(rules, grade, slots),
    [rules, grade, slots],
  )

  function toggleSubject(subject: string) {
    setSelectedSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject],
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">学年</label>
        <select
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          className="w-full rounded-md border p-2 text-sm"
        >
          {gradeOptions.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">週のコマ数</label>
        <input
          type="number"
          min={1}
          max={8}
          value={slots}
          onChange={(e) => setSlots(Number(e.target.value))}
          className="w-full rounded-md border p-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">教科(表示用・料金には影響しません)</label>
        <div className="flex flex-wrap gap-2">
          {subjects.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSubject(s)}
              className="rounded-full border px-3 py-1 text-xs"
              style={{
                borderColor: brand,
                backgroundColor: selectedSubjects.includes(s) ? brand : 'transparent',
                color: selectedSubjects.includes(s) ? '#fff' : brand,
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border p-4" style={{ borderColor: brand }}>
        {result ? (
          <>
            <div className="flex justify-between text-sm">
              <span>月額</span>
              <span className="font-semibold">{result.monthly.toLocaleString()}円</span>
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span>年額(月額×12)</span>
              <span className="font-semibold">{result.yearly.toLocaleString()}円</span>
            </div>
          </>
        ) : (
          <p className="text-sm text-neutral-500">この学年の単価設定がまだ登録されていません。</p>
        )}
      </div>
    </div>
  )
}
