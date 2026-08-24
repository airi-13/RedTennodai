// src/lib/data/schools.ts
// 既存の src/lib/supabase.ts のクライアント取得関数に合わせて import 部分を調整してください。
// (例: import { getSupabaseAdmin } from '@/lib/supabase' など、実際の関数名に置き換える)
import { supabase } from '@/lib/supabase'

export type School = {
  id: string
  name: string
  created_at: string
}

export async function listSchools(): Promise<School[]> {
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function findOrCreateSchoolByName(name: string): Promise<School> {
  const trimmed = name.trim()

  const { data: existing, error: findError } = await supabase
    .from('schools')
    .select('*')
    .eq('name', trimmed)
    .maybeSingle()

  if (findError) throw findError
  if (existing) return existing

  const { data: created, error: createError } = await supabase
    .from('schools')
    .insert({ name: trimmed })
    .select('*')
    .single()

  if (createError) throw createError
  return created
}

export async function createSchool(name: string): Promise<School> {
  const { data, error } = await supabase
    .from('schools')
    .insert({ name: name.trim() })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function deleteSchool(id: string): Promise<void> {
  const { error } = await supabase.from('schools').delete().eq('id', id)
  if (error) throw error
}
