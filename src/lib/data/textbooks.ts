// src/lib/data/textbooks.ts
import { supabase } from '@/lib/supabase'

export const TEXTBOOK_LEVELS = ['小学生', '中学生', '高校生'] as const

// 数学は内部カテゴリを共通化する。小学生では画面上「算数」と表示する。
export const TEXTBOOK_SUBJECTS = ['英語', '国語', '数学', '理科', '社会'] as const
export const TEXTBOOK_ALL_GRADES = '全学年' as const

export const TEXTBOOK_GRADES: Record<(typeof TEXTBOOK_LEVELS)[number], readonly string[]> = {
  小学生: ['1年', '2年', '3年', '4年', '5年', '6年', '新中1'],
  中学生: ['1年', '2年', '3年', '新高1'],
  高校生: ['1年', '2年', '3年'],
}

export type TextbookLevel = (typeof TEXTBOOK_LEVELS)[number]
export type TextbookSubject = (typeof TEXTBOOK_SUBJECTS)[number]

export type Textbook = {
  id: string
  level: TextbookLevel
  subjects: TextbookSubject[]
  title: string
  publisher: string | null
  description: string | null
  grade_label: string
  created_at: string
}

/** 内部カテゴリ「数学」の画面表示名。小学生だけ「算数」にする。 */
export function getTextbookSubjectLabel(level: TextbookLevel, subject: TextbookSubject): string {
  if (subject === '数学' && level === '小学生') return '算数'
  return subject
}

/** DB上の学年値は既存仕様を維持し、画面では区分に応じて「小3」「中1」等に表示する。 */
export function getTextbookGradeLabel(level: TextbookLevel, grade: string): string {
  if (grade === TEXTBOOK_ALL_GRADES) return grade
  if (grade === '新中1') return grade
  if (grade === '新高1') return grade
  if (/^[1-6]年$/.test(grade) && level === '小学生') return `小${grade.replace('年', '')}`
  if (/^[1-3]年$/.test(grade) && level === '中学生') return `中${grade.replace('年', '')}`
  if (/^[1-3]年$/.test(grade) && level === '高校生') return `高${grade.replace('年', '')}`
  return grade
}

export function isValidTextbookGrade(level: TextbookLevel, grade: string): boolean {
  return grade === TEXTBOOK_ALL_GRADES || TEXTBOOK_GRADES[level].includes(grade)
}

export function isTextbookForGrade(textbook: Textbook, grade: string): boolean {
  return textbook.grade_label === TEXTBOOK_ALL_GRADES || textbook.grade_label === grade
}

export function hasTextbookSubject(textbook: Textbook, subject: TextbookSubject): boolean {
  return textbook.subjects.includes(subject)
}

export async function listTextbooks(): Promise<Textbook[]> {
  const { data, error } = await supabase
    .from('textbooks')
    .select('*')
    .order('level', { ascending: true })
    .order('grade_label', { ascending: true })
    .order('title', { ascending: true })

  if (error) throw error
  return (data ?? []).map((row) => ({
    ...row,
    subjects: Array.isArray(row.subjects) ? row.subjects : [row.subject],
  })) as Textbook[]
}

export async function createTextbook(input: {
  level: TextbookLevel
  subjects: TextbookSubject[]
  title: string
  publisher?: string
  description?: string
  grade_label: string
}): Promise<Textbook> {
  if (!TEXTBOOK_LEVELS.includes(input.level)) throw new Error('区分が不正です')
  if (!input.subjects.length || input.subjects.some((s) => !TEXTBOOK_SUBJECTS.includes(s))) {
    throw new Error('科目が不正です')
  }
  if (!isValidTextbookGrade(input.level, input.grade_label)) {
    throw new Error('区分と学年の組み合わせが不正です')
  }

  const { data, error } = await supabase
    .from('textbooks')
    .insert({
      level: input.level,
      subjects: input.subjects,
      subject: input.subjects[0],
      title: input.title,
      publisher: input.publisher,
      description: input.description,
      grade_label: input.grade_label,
    })
    .select('*')
    .single()

  if (error) throw error
  return { ...data, subjects: data.subjects ?? [data.subject] } as Textbook
}

export async function deleteTextbook(id: string): Promise<void> {
  const { error } = await supabase.from('textbooks').delete().eq('id', id)
  if (error) throw error
}

export function groupBySubject(textbooks: Textbook[]): Record<string, Textbook[]> {
  return textbooks.reduce<Record<string, Textbook[]>>((acc, tb) => {
    for (const subject of tb.subjects) {
      acc[subject] = acc[subject] ?? []
      acc[subject].push(tb)
    }
    return acc
  }, {})
}
