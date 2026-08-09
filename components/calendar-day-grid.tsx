'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { saveCalendarDayBackground } from '@/app/(program)/calendars/actions'

type Day = { id: string; date: string; in_session: boolean; notes: string | null; activity_type_ids: string[] }
type Activity = { id: string; code: string; name: string; allowed_when_in_session: boolean; allowed_when_not_in_session: boolean }
type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function dateFromIso(value: string) { return new Date(`${value}T00:00:00.000Z`) }
function monthLabel(value: string) { return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(dateFromIso(value)) }
function monthShort(value: string) { return new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(dateFromIso(value)) }
function shortDate(value: string) { return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(dateFromIso(value)) }

export function CalendarDayGrid({ calendarId, days, activities, editable = true }: { calendarId: string; days: Day[]; activities: Activity[]; editable?: boolean }) {
  const [localDays, setLocalDays] = useState(days)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeMonthIndex, setActiveMonthIndex] = useState(0)
  const selectedDay = localDays.find((day) => day.id === selectedId) ?? null
  const [inSession, setInSession] = useState(false)
  const [selectedActivities, setSelectedActivities] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState('')
  const [, startTransition] = useTransition()
  const saveVersion = useRef(0)

  useEffect(() => setLocalDays(days), [days])

  const months = useMemo(() => {
    const grouped = new Map<string, Day[]>()
    for (const day of localDays) {
      const key = day.date.slice(0, 7)
      grouped.set(key, [...(grouped.get(key) ?? []), day])
    }
    return [...grouped.entries()]
  }, [localDays])

  useEffect(() => {
    if (activeMonthIndex > months.length - 1) setActiveMonthIndex(Math.max(0, months.length - 1))
  }, [activeMonthIndex, months.length])

  const activeMonth = months[activeMonthIndex]
  const activeMonthDays = activeMonth?.[1] ?? []
  const activeMonthKey = activeMonth?.[0] ?? ''
  const activeSessionDays = activeMonthDays.filter((day) => day.in_session).length
  const activeActivityDays = activeMonthDays.filter((day) => day.activity_type_ids.length > 0).length

  function selectDay(day: Day) {
    setSelectedId(day.id)
    setInSession(day.in_session)
    setSelectedActivities(day.activity_type_ids)
    setNotes(day.notes ?? '')
    setSaveState('idle')
    setSaveError('')
  }

  function persist(nextInSession: boolean, nextActivities: string[], nextNotes: string, delay = 0) {
    if (!selectedDay || !editable) return
    const dayId = selectedDay.id
    const version = ++saveVersion.current
    setLocalDays((current) => current.map((day) => day.id === dayId ? { ...day, in_session: nextInSession, activity_type_ids: nextActivities, notes: nextNotes } : day))
    setSaveState('saving')
    setSaveError('')
    window.setTimeout(() => {
      if (version !== saveVersion.current) return
      startTransition(async () => {
        const result = await saveCalendarDayBackground({ dayId, calendarId, inSession: nextInSession, activityIds: nextActivities, notes: nextNotes })
        if (version !== saveVersion.current) return
        if (!result.ok) { setSaveState('error'); setSaveError(result.error); return }
        setSaveState('saved')
        window.setTimeout(() => setSaveState((current) => current === 'saved' ? 'idle' : current), 1800)
      })
    }, delay)
  }

  function changeSession(next: boolean) {
    const nextActivities = selectedActivities.filter((id) => {
      const activity = activities.find((item) => item.id === id)
      return activity ? (next ? activity.allowed_when_in_session : activity.allowed_when_not_in_session) : false
    })
    setInSession(next); setSelectedActivities(nextActivities); persist(next, nextActivities, notes)
  }

  function toggleActivity(id: string, checked: boolean) {
    const next = checked ? [...new Set([...selectedActivities, id])] : selectedActivities.filter((item) => item !== id)
    setSelectedActivities(next); persist(inSession, next, notes)
  }

  function changeNotes(value: string) { setNotes(value); persist(inSession, selectedActivities, value, 650) }

  if (!activeMonth) return <div className="empty-state">No calendar dates are available.</div>

  const firstWeekday = dateFromIso(`${activeMonthKey}-01`).getUTCDay()

  return (
    <>
      <section className="calendar-browser">
        <div className="calendar-month-nav">
          <button className="month-arrow" type="button" aria-label="Previous month" disabled={activeMonthIndex === 0} onClick={() => setActiveMonthIndex((index) => Math.max(0, index - 1))}>‹</button>
          <div className="month-tabs" role="tablist" aria-label="Calendar months">
            {months.map(([month, monthDays], index) => (
              <button key={month} type="button" role="tab" aria-selected={index === activeMonthIndex} className={`month-tab ${index === activeMonthIndex ? 'month-tab-active' : ''}`} onClick={() => setActiveMonthIndex(index)}>
                <span>{monthShort(monthDays[0].date)}</span><small>{month.slice(0, 4)}</small>
              </button>
            ))}
          </div>
          <button className="month-arrow" type="button" aria-label="Next month" disabled={activeMonthIndex === months.length - 1} onClick={() => setActiveMonthIndex((index) => Math.min(months.length - 1, index + 1))}>›</button>
        </div>

        <div className="calendar-current-header">
          <div><p className="calendar-current-eyebrow">Viewing month</p><h2>{monthLabel(activeMonthDays[0].date)}</h2></div>
          <div className="month-summary-inline"><span><strong>{activeSessionDays}</strong> session days</span><span><strong>{activeActivityDays}</strong> activity days</span></div>
        </div>

        <div className="calendar-legend" aria-label="Calendar legend"><span><i className="legend-swatch legend-session" /> In session</span><span><i className="legend-swatch legend-activity" /> Activity</span><span className="muted">Select a date for details</span></div>

        <div className="professional-calendar">
          <div className="weekday-header" aria-hidden="true">{['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((label) => <span key={label}>{label}</span>)}</div>
          <div className="month-grid">
            {Array.from({ length: firstWeekday }).map((_, index) => <span className="calendar-blank" key={`blank-${index}`} />)}
            {activeMonthDays.map((day) => {
              const dayActivities = activities.filter((activity) => day.activity_type_ids.includes(activity.id))
              return (
                <button type="button" key={day.id} className={`calendar-day ${day.in_session ? 'calendar-day-session' : ''} ${selectedId === day.id ? 'calendar-day-selected' : ''}`} onClick={() => selectDay(day)}>
                  <div className="calendar-day-top"><span className="calendar-day-number">{Number(day.date.slice(8, 10))}</span>{day.in_session ? <span className="session-dot" title="In session" /> : null}</div>
                  <div className="calendar-day-content">
                    {day.in_session ? <span className="day-marker">In session</span> : <span className="day-marker day-marker-off">No session</span>}
                    {dayActivities.slice(0, 2).map((activity) => <span className="activity-chip" key={activity.id}>{activity.name}</span>)}
                    {dayActivities.length > 2 ? <span className="day-more">+{dayActivities.length - 2} more</span> : null}
                    {day.notes ? <span className="notes-indicator">Note added</span> : null}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="calendar-footer-nav">
          <button className="calendar-text-nav" type="button" disabled={activeMonthIndex === 0} onClick={() => setActiveMonthIndex((index) => Math.max(0, index - 1))}>← {activeMonthIndex > 0 ? monthLabel(months[activeMonthIndex - 1][1][0].date) : 'Previous'}</button>
          <span>{activeMonthIndex + 1} of {months.length}</span>
          <button className="calendar-text-nav" type="button" disabled={activeMonthIndex === months.length - 1} onClick={() => setActiveMonthIndex((index) => Math.min(months.length - 1, index + 1))}>{activeMonthIndex < months.length - 1 ? monthLabel(months[activeMonthIndex + 1][1][0].date) : 'Next'} →</button>
        </div>
      </section>

      {selectedDay ? <div className="drawer-backdrop" role="presentation" onMouseDown={() => setSelectedId(null)}><aside className="day-drawer" role="dialog" aria-modal="true" aria-label={`Edit ${shortDate(selectedDay.date)}`} onMouseDown={(event) => event.stopPropagation()}>
        <div className="drawer-header"><div><p className="drawer-eyebrow">Calendar day</p><h2>{shortDate(selectedDay.date)}</h2></div><button className="icon-button" type="button" onClick={() => setSelectedId(null)} aria-label="Close editor">×</button></div>
        {editable ? <div className="stack day-editor">
          <div className={`autosave-status autosave-${saveState}`} aria-live="polite">{saveState === 'saving' ? 'Saving changes…' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? `Not saved: ${saveError}` : 'Changes save automatically'}</div>
          <fieldset className="fieldset editor-section"><legend>Children in session?</legend><div className="segmented"><label className={inSession ? 'segment-active' : ''}><input type="radio" checked={inSession} onChange={() => changeSession(true)} />Yes</label><label className={!inSession ? 'segment-active' : ''}><input type="radio" checked={!inSession} onChange={() => changeSession(false)} />No</label></div></fieldset>
          <fieldset className="fieldset editor-section"><legend>Activities</legend><p className="muted small-text">Select everything that applies to this date.</p><div className="activity-options">{activities.map((activity) => { const allowed = inSession ? activity.allowed_when_in_session : activity.allowed_when_not_in_session; return <label className={`checkbox-card ${selectedActivities.includes(activity.id) ? 'checkbox-selected' : ''} ${!allowed ? 'checkbox-disabled' : ''}`} key={activity.id}><input type="checkbox" checked={selectedActivities.includes(activity.id)} disabled={!allowed} onChange={(event) => toggleActivity(activity.id, event.target.checked)} /><span>{activity.name}</span></label> })}</div></fieldset>
          <div className="field editor-section"><label htmlFor={`notes-${selectedDay.id}`}>Notes <span className="optional-label">Optional</span></label><textarea id={`notes-${selectedDay.id}`} rows={5} value={notes} onChange={(event) => changeNotes(event.target.value)} placeholder="Add anything administrators should know about this date…" /></div>
        </div> : <div className="stack day-readonly"><div className="stat"><strong>In Session</strong><p>{selectedDay.in_session ? 'Yes' : 'No'}</p></div><div className="stat"><strong>Activities</strong><p>{activities.filter((activity) => selectedDay.activity_type_ids.includes(activity.id)).map((activity) => activity.name).join(', ') || 'None'}</p></div><div className="stat"><strong>Notes</strong><p>{selectedDay.notes || 'None'}</p></div></div>}
      </aside></div> : null}
    </>
  )
}
