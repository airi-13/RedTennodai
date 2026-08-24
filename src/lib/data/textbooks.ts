// src/lib/data/textbooks.ts
import { supabase } from '@/lib/supabase'

export type Textbook = {
  id: string
  subject: string
  title: string
  publisher: string | null
  description: string | null
  grade_label: string | null
  created_at: string
}

export async function listTextbooks(): Promise<Textbook[]> {
  const { data, error } = await supabase
    .from('textbooks')
    .select('*')
    .order('subject', { ascending: true })
    .order('title', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function createTextbook(input: {
  subject: string
  title: string
  publisher?: string
  description?: string
  grade_label?: string
}): Promise<Textbook> {
  const { data, error } = await supabase.from('textbooks').insert(input).select('*').single()
  if (error) throw error
  return data
}

export async function deleteTextbook(id: string): Promise<void> {
  const { error } = await supabase.from('textbooks').delete().eq('id', id)
  if (error) throw error
}

// 科目ごとにグルーピングして返すヘルパー(/my/textbooks 表示用)
export function groupBySubject(textbooks: Textbook[]): Record<string, Textbook[]> {
  return textbooks.reduce<Record<string, Textbook[]>>((acc, tb) => {
    const key = tb.subject || 'その他'
    acc[key] = acc[key] ?? []
    acc[key].push(tb)
    return acc
  }, {})
}
