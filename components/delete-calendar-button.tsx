'use client'

import { useState } from 'react'

export function DeleteCalendarButton({ calendarName }: { calendarName: string }) {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <button className="button button-danger button-small" type="button" onClick={() => setConfirming(true)}>
        Delete
      </button>
    )
  }

  return (
    <span className="delete-confirmation">
      <span className="delete-confirmation-text">Delete {calendarName}?</span>
      <button className="button button-danger button-small" type="submit">Confirm delete</button>
      <button className="button button-secondary button-small" type="button" onClick={() => setConfirming(false)}>Cancel</button>
    </span>
  )
}
