"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import type { Textbook, TextbookLevel, TextbookSubject } from "@/lib/data/textbooks.shared"
import { getTextbookGradeLabel, getTextbookSubjectLabel, TEXTBOOK_ALL_GRADES, TEXTBOOK_LEVELS, TEXTBOOK_SUBJECTS } from "@/lib/data/textbooks.shared"

export function TextbooksView({ textbooks }: { textbooks: Textbook[] }) {
  const [filterLevel, setFilterLevel] = useState("")
  const [filterSubject, setFilterSubject] = useState("")
  const [filterGrade, setFilterGrade] = useState("")

  const levelOptions = useMemo(() =>
    TEXTBOOK_LEVELS.filter((level) => textbooks.some((t) => t.level === level)),
    [textbooks]
  )

  const subjectOptions = useMemo(() => {
    const candidates = textbooks.filter((t) => !filterLevel || t.level === filterLevel)
    return TEXTBOOK_SUBJECTS.filter((subject) => candidates.some((t) => t.subjects.includes(subject)))
  }, [textbooks, filterLevel])

  const gradeOptions = useMemo(() => {
    const candidates = textbooks.filter((t) =>
      (!filterLevel || t.level === filterLevel) &&
      (!filterSubject || t.subjects.includes(filterSubject as TextbookSubject))
    )
    const grades = Array.from(new Set(candidates.map((t) => t.grade_label)))
    return [TEXTBOOK_ALL_GRADES, ...grades.filter((g) => g !== TEXTBOOK_ALL_GRADES)]
  }, [textbooks, filterLevel, filterSubject])

  const filtered = useMemo(() => textbooks.filter((t) =>
    (!filterLevel || t.level === filterLevel) &&
    (!filterSubject || t.subjects.includes(filterSubject as TextbookSubject)) &&
    (!filterGrade || t.grade_label === TEXTBOOK_ALL_GRADES || t.grade_label === filterGrade)
  ), [textbooks, filterLevel, filterSubject, filterGrade])

  const clearFilters = () => {
    setFilterLevel("")
    setFilterSubject("")
    setFilterGrade("")
  }

  const getLabelLevel = (): TextbookLevel => (filterLevel || "中学生") as TextbookLevel

  return (
    <div className="mx-auto max-w-2xl p-4">
      <Link href="/my" className="text-sm text-neutral-500">← カレンダーに戻る</Link>
      <h1 className="mt-2 mb-4 text-lg font-semibold" style={{ color: "#D13C18" }}>📘 使用テキスト一覧</h1>

      {textbooks.length === 0 ? (
        <p className="text-sm text-neutral-500">現在登録されているテキストはありません。</p>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-end gap-2 rounded-lg border p-3">
            <label className="flex flex-col gap-1 text-xs text-neutral-500">
              区分
              <select value={filterLevel} onChange={(e) => { setFilterLevel(e.target.value); setFilterSubject(""); setFilterGrade("") }} className="rounded-md border px-2 py-1.5 text-sm text-neutral-800">
                <option value="">すべて</option>
                {levelOptions.map((level) => <option key={level} value={level}>{level}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-500">
              教科
              <select value={filterSubject} onChange={(e) => { setFilterSubject(e.target.value); setFilterGrade("") }} className="rounded-md border px-2 py-1.5 text-sm text-neutral-800">
                <option value="">すべて</option>
                {subjectOptions.map((subject) => <option key={subject} value={subject}>{getTextbookSubjectLabel(getLabelLevel(), subject)}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-500">
              学年
              <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)} className="rounded-md border px-2 py-1.5 text-sm text-neutral-800">
                <option value="">すべて</option>
                {gradeOptions.map((grade) => <option key={grade} value={grade}>{filterLevel ? getTextbookGradeLabel(filterLevel as TextbookLevel, grade) : grade}</option>)}
              </select>
            </label>
            {(filterLevel || filterSubject || filterGrade) && (
              <button type="button" onClick={clearFilters} className="text-xs text-neutral-500 underline">絞り込みを解除</button>
            )}
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-neutral-500">該当するテキストがありません。</p>
          ) : (
            <div className="space-y-6">
              {TEXTBOOK_LEVELS.map((level) => {
                const books = filtered.filter((b) => b.level === level)
                if (books.length === 0) return null
                return (
                  <section key={level}>
                    <h2 className="mb-3 text-base font-semibold text-neutral-700">{level}</h2>
                    {TEXTBOOK_SUBJECTS.map((subject) => {
                      const subjectBooks = books.filter((b) => b.subjects.includes(subject))
                      if (subjectBooks.length === 0) return null
                      return (
                        <div key={subject} className="mb-4">
                          <h3 className="mb-2 text-sm font-semibold text-neutral-600">{getTextbookSubjectLabel(level, subject)}</h3>
                          <ul className="space-y-2">
                            {subjectBooks.map((b) => (
                              <li key={`${subject}-${b.id}`} className="rounded-lg border p-3">
                                <div className="flex items-baseline justify-between gap-3">
                                  <span className="font-medium">{b.title}</span>
                                  <span className="shrink-0 text-xs text-neutral-400">{getTextbookGradeLabel(level, b.grade_label)}</span>
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
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
