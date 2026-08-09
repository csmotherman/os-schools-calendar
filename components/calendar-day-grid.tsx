'use client'

import { useMemo, useState } from 'react'
import { saveCalendarDay } from '@/app/(program)/calendars/actions'

type Day = {
  id: string
  date: string
  in_session: boolean
  notes: string | null
  activity_type_ids: string[]
}

type Activity = {
  id: string
  code: string
  name: string
  allowed_when_in_session: boolean
  allowed_when_not_in_session: boolean
}

function dateFromIso(value: string) {
  return new Date(`${value}T00:00:00.000Z`)
}

function monthLabel(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(dateFromIso(value))
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(dateFromIso(value))
}

export function CalendarDayGrid({
  calendarId,
  days,
  activities,
  editable = true,
}: {
  calendarId: string
  days: Day[]
  activities: Activity[]
  editable?: boolean
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedDay = days.find((day) => day.id === selectedId) ?? null
  const [inSession, setInSession] = useState(false)
  const [selectedActivities, setSelectedActivities] = useState<string[]>([])

  const months = useMemo(() => {
    const grouped = new Map<string, Day[]>()
    for (const day of days) {
      const key = day.date.slice(0, 7)
      grouped.set(key, [...(grouped.get(key) ?? []), day])
    }
    return [...grouped.entries()]
  }, [days])

  function selectDay(day: Day) {
    setSelectedId(day.id)
    setInSession(day.in_session)
    setSelectedActivities(day.activity_type_ids)
  }

  function changeSession(next: boolean) {
    setInSession(next)
    setSelectedActivities((current) =>
      current.filter((id) => {
        const activity = activities.find((item) => item.id === id)
        if (!activity) return false
        return next ? activity.allowed_when_in_session : activity.allowed_when_not_in_session
      }),
    )
  }

  function toggleActivity(id: string, checked: boolean) {
    setSelectedActivities((current) =>
      checked ? [...new Set([...current, id])] : current.filter((item) => item !== id),
    )
  }

  return (
    <>
      <div className="months-stack">
        {months.map(([month, monthDays]) => {
          const firstWeekday = dateFromIso(`${month}-01`).getUTCDay()
          return (
            <section className="month-card" key={month}>
              <h2>{monthLabel(monthDays[0].date)}</h2>
              <div className="weekday-header" aria-hidden="true">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => <span key={label}>{label}</span>)}
              </div>
              <div className="month-grid">
                {Array.from({ length: firstWeekday }).map((_, index) => <span className="calendar-blank" key={`blank-${index}`} />)}
                {monthDays.map((day) => {
                  const activityCount = day.activity_type_ids.length
                  return (
                    <button
                      type="button"
                      key={day.id}
                      className={`calendar-day ${day.in_session ? 'calendar-day-session' : ''}`}
                      onClick={() => selectDay(day)}
                    >
                      <span className="calendar-day-number">{Number(day.date.slice(8, 10))}</span>
                      {day.in_session ? <span className="day-marker">Session</span> : null}
                      {activityCount ? <span className="day-activity-count">{activityCount} activit{activityCount === 1 ? 'y' : 'ies'}</span> : null}
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      {selectedDay ? (
        <div className="drawer-backdrop" role="presentation" onMouseDown={() => setSelectedId(null)}>
          <aside className="day-drawer" role="dialog" aria-modal="true" aria-label={`Edit ${shortDate(selectedDay.date)}`} onMouseDown={(event) => event.stopPropagation()}>
            <div className="header-row">
              <div>
                <p className="muted">Calendar day</p>
                <h2>{shortDate(selectedDay.date)}</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setSelectedId(null)} aria-label="Close editor">×</button>
            </div>

            {editable ? (
              <form action={saveCalendarDay} className="stack" key={selectedDay.id}>
                <input type="hidden" name="day_id" value={selectedDay.id} />
                <input type="hidden" name="calendar_id" value={calendarId} />

                <fieldset className="fieldset">
                  <legend>In Session</legend>
                  <div className="segmented">
                    <label className={inSession ? 'segment-active' : ''}>
                      <input type="radio" name="in_session" value="true" checked={inSession} onChange={() => changeSession(true)} />
                      Yes
                    </label>
                    <label className={!inSession ? 'segment-active' : ''}>
                      <input type="radio" name="in_session" value="false" checked={!inSession} onChange={() => changeSession(false)} />
                      No
                    </label>
                  </div>
                </fieldset>

                <fieldset className="fieldset">
                  <legend>Activities</legend>
                  <div className="stack compact-stack">
                    {activities.map((activity) => {
                      const allowed = inSession ? activity.allowed_when_in_session : activity.allowed_when_not_in_session
                      return (
                        <label className={`checkbox-card ${!allowed ? 'checkbox-disabled' : ''}`} key={activity.id}>
                          <input
                            type="checkbox"
                            name="activity_type_ids"
                            value={activity.id}
                            checked={selectedActivities.includes(activity.id)}
                            disabled={!allowed}
                            onChange={(event) => toggleActivity(activity.id, event.target.checked)}
                          />
                          <span>{activity.name}</span>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>

                <div className="field">
                  <label htmlFor={`notes-${selectedDay.id}`}>Notes</label>
                  <textarea id={`notes-${selectedDay.id}`} name="notes" rows={5} defaultValue={selectedDay.notes ?? ''} />
                </div>

                <div className="actions-row drawer-actions">
                  <button className="button button-secondary" type="button" onClick={() => setSelectedId(null)}>Cancel</button>
                  <button className="button" type="submit">Save day</button>
                </div>
              </form>
            ) : (
              <div className="stack">
                <div className="stat"><strong>In Session</strong><p>{selectedDay.in_session ? 'Yes' : 'No'}</p></div>
                <div className="stat"><strong>Activities</strong><p>{activities.filter((activity) => selectedDay.activity_type_ids.includes(activity.id)).map((activity) => activity.name).join(', ') || 'None'}</p></div>
                <div className="stat"><strong>Notes</strong><p>{selectedDay.notes || 'None'}</p></div>
              </div>
            )}
          </aside>
        </div>
      ) : null}
    </>
  )
}
