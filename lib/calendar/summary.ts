import type { RequirementMetric, RequirementSeverity } from '@/types/database'

export type CalendarDaySummaryInput = {
  in_session: boolean
  activity_type_ids: string[]
}

export type RequirementInput = {
  id: string
  metric_type: RequirementMetric
  activity_type_id: string | null
  minimum_count: number | null
  maximum_count: number | null
  severity: RequirementSeverity
}

export type RequirementResult = RequirementInput & {
  actual_count: number
  passes: boolean
}

export function summarizeCalendarDays(days: CalendarDaySummaryInput[]) {
  const activityCounts: Record<string, number> = {}
  let sessionDays = 0

  for (const day of days) {
    if (day.in_session) sessionDays += 1
    for (const activityId of new Set(day.activity_type_ids)) {
      activityCounts[activityId] = (activityCounts[activityId] ?? 0) + 1
    }
  }

  return { sessionDays, activityCounts }
}

export function evaluateRequirements(
  days: CalendarDaySummaryInput[],
  requirements: RequirementInput[],
): RequirementResult[] {
  const summary = summarizeCalendarDays(days)

  return requirements.map((requirement) => {
    const actualCount =
      requirement.metric_type === 'SESSION_DAYS'
        ? summary.sessionDays
        : requirement.activity_type_id
          ? summary.activityCounts[requirement.activity_type_id] ?? 0
          : 0

    const meetsMinimum = requirement.minimum_count === null || actualCount >= requirement.minimum_count
    const meetsMaximum = requirement.maximum_count === null || actualCount <= requirement.maximum_count

    return {
      ...requirement,
      actual_count: actualCount,
      passes: meetsMinimum && meetsMaximum,
    }
  })
}

export function hasBlockingFailures(results: RequirementResult[]) {
  return results.some((result) => !result.passes && result.severity === 'BLOCK')
}
