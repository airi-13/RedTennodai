// src/lib/data/announcements.ts
import { supabase } from '@/lib/supabase'

export type Announcement = {
  id: string
  event_date: string
  title: string
  time_range: string | null
  note: string | null
  created_at: string
}

export type ClosureStatus = 'closed' | 'open'

export type Closure = {
  closure_date: string
  status: ClosureStatus
  note: string | null
}

function monthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

export async function listAnnouncementsForMonth(
  year: number,
  month: number,
): Promise<Announcement[]> {
  const { start, end } = monthRange(year, month)
  const { data, error } = await supabase
    .from('schedule_announcements')
    .select('*')
    .gte('event_date', start)
    .lte('event_date', end)
    .order('event_date', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function createAnnouncement(input: {
  event_date: string
  title: string
  time_range?: string
  note?: string
}): Promise<Announcement> {
  const { data, error } = await supabase
    .from('schedule_announcements')
    .insert(input)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await supabase.from('schedule_announcements').delete().eq('id', id)
  if (error) throw error
}

export async function listClosuresForMonth(year: number, month: number): Promise<Closure[]> {
  const { start, end } = monthRange(year, month)
  const { data, error } = await supabase
    .from('calendar_closures')
    .select('*')
    .gte('closure_date', start)
    .lte('closure_date', end)

  if (error) throw error
  return data ?? []
}

// 休講/開講の例外を1日単位でトグル設定する(管理画面用)
export async function setClosure(
  date: string,
  status: ClosureStatus,
  note?: string,
): Promise<void> {
  const { error } = await supabase
    .from('calendar_closures')
    .upsert({ closure_date: date, status, note: note ?? null })
  if (error) throw error
}

export async function clearClosure(date: string): Promise<void> {
  const { error } = await supabase.from('calendar_closures').delete().eq('closure_date', date)
  if (error) throw error
}

// デフォルト休講日: 日曜・月曜。個別の休講(calendar_closures)で管理者が1日単位で例外設定できる。
const DEFAULT_CLOSED_WEEKDAYS = [0, 1]

export function isDefaultClosedWeekday(date: Date): boolean {
  return DEFAULT_CLOSED_WEEKDAYS.includes(date.getDay())
}

// その日が最終的に「休講」か「開講」かを、デフォルトルール + 例外設定から判定する
export function resolveDayStatus(
  date: Date,
  closures: Closure[],
): ClosureStatus {
  const iso = date.toISOString().slice(0, 10)
  const exception = closures.find((c) => c.closure_date === iso)
  if (exception) return exception.status
  return isDefaultClosedWeekday(date) ? 'closed' : 'open'
}
