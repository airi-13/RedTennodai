// src/lib/data/textbooks.ts
import "server-only";
import { supabase } from '@/lib/supabase'
import {
  TEXTBOOK_LEVELS,
  TEXTBOOK_SUBJECTS,
  TEXTBOOK_ALL_GRADES,
  TEXTBOOK_GRADES,
  getTextbookSubjectLabel,
  getTextbookGradeLabel,
  isValidTextbookGrade,
  isTextbookForGrade,
  hasTextbookSubject,
  normalizeTextbookSubject,
} from './textbooks.shared'
import type { Textbook, TextbookLevel, TextbookSubject } from './textbooks.shared'

export {
  TEXTBOOK_LEVELS,
  TEXTBOOK_SUBJECTS,
  TEXTBOOK_ALL_GRADES,
  TEXTBOOK_GRADES,
  getTextbookSubjectLabel,
  getTextbookGradeLabel,
  isValidTextbookGrade,
  isTextbookForGrade,
  hasTextbookSubject,
  normalizeTextbookSubject,
}
export type { Textbook, TextbookLevel, TextbookSubject }

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
