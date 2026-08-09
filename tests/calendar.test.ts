import test from 'node:test'
import assert from 'node:assert/strict'
import { generateCalendarDays, normalizeWeekdays } from '../lib/calendar/generate'
import { evaluateRequirements, hasBlockingFailures, summarizeCalendarDays } from '../lib/calendar/summary'

test('normalizes weekdays and removes duplicates', () => {
  assert.deepEqual(normalizeWeekdays([5, 1, 1, 9, -1, 3]), [1, 3, 5])
})

test('generates every date and applies blocked session dates', () => {
  const days = generateCalendarDays({
    startDate: '2026-09-07',
    endDate: '2026-09-11',
    sessionWeekdays: [1, 2, 3, 4],
    blockedDates: [{ date: '2026-09-08', restriction_type: 'NO_SESSION' }],
  })

  assert.equal(days.length, 5)
  assert.deepEqual(days.map((day) => [day.date, day.in_session]), [
    ['2026-09-07', true],
    ['2026-09-08', false],
    ['2026-09-09', true],
    ['2026-09-10', true],
    ['2026-09-11', false],
  ])
})

test('preserves exact partial-month boundaries', () => {
  const days = generateCalendarDays({
    startDate: '2026-08-31',
    endDate: '2026-09-02',
    sessionWeekdays: [1, 2, 3, 4, 5],
    blockedDates: [],
  })

  assert.deepEqual(days.map((day) => day.date), ['2026-08-31', '2026-09-01', '2026-09-02'])
  assert.equal(new Date(`${days[0].date}T00:00:00.000Z`).getUTCDay(), 1)
})

test('generates leap day correctly', () => {
  const days = generateCalendarDays({
    startDate: '2028-02-27',
    endDate: '2028-03-01',
    sessionWeekdays: [1, 2, 3, 4, 5],
    blockedDates: [],
  })

  assert.deepEqual(days.map((day) => day.date), ['2028-02-27', '2028-02-28', '2028-02-29', '2028-03-01'])
})

test('rejects a reversed calendar range', () => {
  assert.throws(() => generateCalendarDays({
    startDate: '2026-09-10',
    endDate: '2026-09-01',
    sessionWeekdays: [1, 2, 3, 4, 5],
    blockedDates: [],
  }))
})

test('NO_ACTIVITY also forces generated session state off', () => {
  const [day] = generateCalendarDays({
    startDate: '2026-09-07',
    endDate: '2026-09-07',
    sessionWeekdays: [1],
    blockedDates: [{ date: '2026-09-07', restriction_type: 'NO_ACTIVITY' }],
  })
  assert.equal(day.in_session, false)
})

test('summarizes session and activity days without double-counting duplicate tags', () => {
  const summary = summarizeCalendarDays([
    { in_session: true, activity_type_ids: ['half', 'conference', 'conference'] },
    { in_session: false, activity_type_ids: ['conference'] },
  ])
  assert.equal(summary.sessionDays, 1)
  assert.equal(summary.activityCounts.half, 1)
  assert.equal(summary.activityCounts.conference, 2)
})

test('evaluates blocking and warning requirement ranges', () => {
  const results = evaluateRequirements(
    [
      { in_session: true, activity_type_ids: ['conference'] },
      { in_session: true, activity_type_ids: [] },
    ],
    [
      { id: 'session', metric_type: 'SESSION_DAYS', activity_type_id: null, minimum_count: 3, maximum_count: null, severity: 'BLOCK' },
      { id: 'conference', metric_type: 'ACTIVITY_DAYS', activity_type_id: 'conference', minimum_count: 1, maximum_count: 2, severity: 'WARNING' },
    ],
  )

  assert.equal(results[0].actual_count, 2)
  assert.equal(results[0].passes, false)
  assert.equal(results[1].actual_count, 1)
  assert.equal(results[1].passes, true)
  assert.equal(hasBlockingFailures(results), true)
})

test('warning failures do not block submission eligibility', () => {
  const results = evaluateRequirements(
    [{ in_session: true, activity_type_ids: [] }],
    [{ id: 'warning', metric_type: 'SESSION_DAYS', activity_type_id: null, minimum_count: 2, maximum_count: null, severity: 'WARNING' }],
  )

  assert.equal(results[0].passes, false)
  assert.equal(hasBlockingFailures(results), false)
})
