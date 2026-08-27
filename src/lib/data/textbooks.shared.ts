// src/lib/data/textbooks.shared.ts
// Client / Server 共通で利用する教材の型・定数・表示ロジック。

export const TEXTBOOK_LEVELS = ['小学生', '中学生', '高校生'] as const
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

export function getTextbookSubjectLabel(level: TextbookLevel, subject: TextbookSubject): string {
  if (subject === '数学' && level === '小学生') return '算数'
  return subject
}

export function getTextbookGradeLabel(level: TextbookLevel, grade: string): string {
  if (grade === TEXTBOOK_ALL_GRADES || grade === '新中1' || grade === '新高1') return grade
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

export function normalizeTextbookSubject(subject: string): TextbookSubject {
  return subject === '算数' ? '数学' : subject as TextbookSubject
}
