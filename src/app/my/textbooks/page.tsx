// src/app/my/textbooks/page.tsx
import Link from 'next/link'
import { listTextbooks } from '@/lib/data/textbooks'

export const dynamic = 'force-dynamic'

const BRAND = '#D13C18'
const LEVELS = ['小学生', '中学生', '高校生'] as const
const SUBJECTS = ['英語', '国語', '数学', '理科', '社会'] as const

export default async function TextbooksPage() {
  const textbooks = await listTextbooks()
  const grouped = LEVELS.map((level) => ({
    level,
    books: textbooks.filter((b) => b.level === level),
  })).filter((group) => group.books.length > 0)

  return (
    <div className="mx-auto max-w-2xl p-4">
      <Link href="/my" className="text-sm text-neutral-500">← カレンダーに戻る</Link>
      <h1 className="mt-2 mb-4 text-lg font-semibold" style={{ color: BRAND }}>📘 使用テキスト一覧</h1>

      {textbooks.length === 0 && <p className="text-sm text-neutral-500">現在登録されているテキストはありません。</p>}

      {grouped.map(({ level, books }) => (
        <section key={level} className="mb-6">
          <h2 className="mb-3 text-base font-semibold text-neutral-700">{level}</h2>
          {SUBJECTS.map((subject) => {
            const subjectBooks = books.filter((b) => b.subject === subject)
            if (subjectBooks.length === 0) return null
            return (
              <div key={subject} className="mb-4">
                <h3 className="mb-2 text-sm font-semibold text-neutral-600">{subject}</h3>
                <ul className="space-y-2">
                  {subjectBooks.map((b) => (
                    <li key={b.id} className="rounded-lg border p-3">
                      <div className="flex items-baseline justify-between">
                        <span className="font-medium">{b.title}</span>
                        <span className="text-xs text-neutral-400">{b.grade_label}</span>
                      </div>
                      {b.publisher && <div className="text-xs text-neutral-500">{b.publisher}</div>}
                      {b.description && <p className="mt-1 text-sm text-neutral-600">{b.description}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </section>
      ))}
    </div>
  )
}
