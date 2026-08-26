// src/lib/data/textbooks.ts
import { supabase } from '@/lib/supabase'

export const TEXTBOOK_LEVELS = ['小学生', '中学生', '高校生'] as const
export const TEXTBOOK_SUBJECTS = ['英語', '国語', '数学', '理科', '社会'] as const

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
  subject: TextbookSubject
  title: string
  publisher: string | null
  description: string | null
  grade_label: string
  created_at: string
}

export function isValidTextbookGrade(level: TextbookLevel, grade: string): boolean {
  return TEXTBOOK_GRADES[level].includes(grade)
}

export async function listTextbooks(): Promise<Textbook[]> {
  const { data, error } = await supabase
    .from('textbooks')
    .select('*')
    .order('level', { ascending: true })
    .order('grade_label', { ascending: true })
    .order('subject', { ascending: true })
    .order('title', { ascending: true })

  if (error) throw error
  return (data ?? []) as Textbook[]
}

export async function createTextbook(input: {
  level: TextbookLevel
  subject: TextbookSubject
  title: string
  publisher?: string
  description?: string
  grade_label: string
}): Promise<Textbook> {
  if (!TEXTBOOK_LEVELS.includes(input.level)) throw new Error('区分が不正です')
  if (!TEXTBOOK_SUBJECTS.includes(input.subject)) throw new Error('科目が不正です')
  if (!isValidTextbookGrade(input.level, input.grade_label)) {
    throw new Error('区分と学年の組み合わせが不正です')
  }

  const { data, error } = await supabase.from('textbooks').insert(input).select('*').single()
  if (error) throw error
  return data as Textbook
}

export async function deleteTextbook(id: string): Promise<void> {
  const { error } = await supabase.from('textbooks').delete().eq('id', id)
  if (error) throw error
}

export function groupBySubject(textbooks: Textbook[]): Record<string, Textbook[]> {
  return textbooks.reduce<Record<string, Textbook[]>>((acc, tb) => {
    const key = tb.subject
    acc[key] = acc[key] ?? []
    acc[key].push(tb)
    return acc
  }, {})
}
