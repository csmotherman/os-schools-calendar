import type { BlockedDateRestriction } from '@/types/database'

export type GeneratedCalendarDay = {
  date: string
  in_session: boolean
}

export type BlockedDateInput = {
  date: string
  restriction_type: BlockedDateRestriction
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function parseDate(value: string) {
  if (!ISO_DATE.test(value)) throw new Error(`Invalid ISO date: ${value}`)
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${value}`)
  return date
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function normalizeWeekdays(values: number[]) {
  return [...new Set(values.filter((value) => Number.isInteger(value) && value >= 0 && value <= 6))].sort()
}

export function generateCalendarDays({
  startDate,
  endDate,
  sessionWeekdays,
  blockedDates = [],
}: {
  startDate: string
  endDate: string
  sessionWeekdays: number[]
  blockedDates?: BlockedDateInput[]
}): GeneratedCalendarDay[] {
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  if (start > end) throw new Error('Start date must be on or before end date.')

  const weekdays = new Set(normalizeWeekdays(sessionWeekdays))
  if (weekdays.size === 0) throw new Error('Select at least one session weekday.')

  const blockedMap = new Map(blockedDates.map((item) => [item.date, item.restriction_type]))
  const result: GeneratedCalendarDay[] = []

  for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const date = toIsoDate(cursor)
    const restriction = blockedMap.get(date)
    const blockedFromSession = restriction === 'NO_SESSION' || restriction === 'NO_ACTIVITY'

    result.push({
      date,
      in_session: weekdays.has(cursor.getUTCDay()) && !blockedFromSession,
    })
  }

  return result
}

export function countSessionDays(days: GeneratedCalendarDay[]) {
  return days.reduce((total, day) => total + (day.in_session ? 1 : 0), 0)
}
