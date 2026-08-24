// src/app/my/textbooks/page.tsx
import Link from 'next/link'
import { listTextbooks, groupBySubject } from '@/lib/data/textbooks'

export const dynamic = 'force-dynamic'

const BRAND = '#D13C18'

export default async function TextbooksPage() {
  const textbooks = await listTextbooks()
  const grouped = groupBySubject(textbooks)

  return (
    <div className="mx-auto max-w-2xl p-4">
      <Link href="/my" className="text-sm text-neutral-500">
        ← カレンダーに戻る
      </Link>
      <h1 className="mt-2 mb-4 text-lg font-semibold" style={{ color: BRAND }}>
        📘 使用テキスト一覧
      </h1>

      {Object.keys(grouped).length === 0 && (
        <p className="text-sm text-neutral-500">現在登録されているテキストはありません。</p>
      )}

      {Object.entries(grouped).map(([subject, books]) => (
        <div key={subject} className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-neutral-700">{subject}</h2>
          <ul className="space-y-2">
            {books.map((b) => (
              <li key={b.id} className="rounded-lg border p-3">
                <div className="flex items-baseline justify-between">
                  <span className="font-medium">{b.title}</span>
                  {b.grade_label && (
                    <span className="text-xs text-neutral-400">{b.grade_label}</span>
                  )}
                </div>
                {b.publisher && (
                  <div className="text-xs text-neutral-500">{b.publisher}</div>
                )}
                {b.description && (
                  <p className="mt-1 text-sm text-neutral-600">{b.description}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
