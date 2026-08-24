// src/lib/data/school-events.ts
import { supabase } from '@/lib/supabase'

export type SchoolEvent = {
  id: string
  school_id: string
  event_date: string // YYYY-MM-DD
  title: string
  note: string | null
  created_at: string
}

export async function listSchoolEventsForMonth(
  schoolId: string,
  year: number,
  month: number, // 1-12
): Promise<SchoolEvent[]> {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).getDate() // その月の末日
  const end = `${year}-${String(month).padStart(2, '0')}-${String(endDate).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('school_events')
    .select('*')
    .eq('school_id', schoolId)
    .gte('event_date', start)
    .lte('event_date', end)
    .order('event_date', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function createSchoolEvent(input: {
  school_id: string
  event_date: string
  title: string
  note?: string
}): Promise<SchoolEvent> {
  const { data, error } = await supabase
    .from('school_events')
    .insert(input)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function deleteSchoolEvent(id: string): Promise<void> {
  const { error } = await supabase.from('school_events').delete().eq('id', id)
  if (error) throw error
}

// 管理画面用: 学校を問わず、その月の全行事を一覧する(学校名も一緒に取得)
export async function listAllSchoolEventsForMonth(
  year: number,
  month: number
): Promise<(SchoolEvent & { schoolName: string })[]> {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(endDate).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('school_events')
    .select('*, schools(name)')
    .gte('event_date', start)
    .lte('event_date', end)
    .order('event_date', { ascending: true })

  if (error) throw error
  return (data ?? []).map((e: any) => ({ ...e, schoolName: e.schools?.name ?? '' }))
}
