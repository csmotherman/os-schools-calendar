'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

type ReportRow = {
  id: string
  program: string
  year: string
  type: string
  status: string
  sessionDays: number
  activities: Record<string, number>
}

type Activity = { id: string; name: string }
type SortKey = 'program' | 'year' | 'type' | 'status' | 'sessionDays'

export function AdminReportTable({ rows, activities }: { rows: ReportRow[]; activities: Activity[] }) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('program')
  const [ascending, setAscending] = useState(true)

  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    const filtered = term ? rows.filter((row) => row.program.toLowerCase().includes(term)) : rows
    return [...filtered].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      const result = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return ascending ? result : -result
    })
  }, [rows, search, sortKey, ascending])

  function sort(key: SortKey) {
    if (sortKey === key) setAscending((value) => !value)
    else { setSortKey(key); setAscending(true) }
  }

  function SortButton({ column, label }: { column: SortKey; label: string }) {
    const active = sortKey === column
    return <button type="button" className={`table-sort ${active ? 'table-sort-active' : ''}`} onClick={() => sort(column)}>{label}<span aria-hidden="true">{active ? (ascending ? ' ↑' : ' ↓') : ' ↕'}</span></button>
  }

  return <div className="report-table-section">
    <div className="report-search-row">
      <label className="report-search"><span aria-hidden="true">⌕</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search program name…" aria-label="Search program name" /></label>
      <span className="muted small-text">Showing {visibleRows.length} of {rows.length} calendars</span>
    </div>
    <div className="table-wrap"><table><thead><tr><th><SortButton column="program" label="Program" /></th><th><SortButton column="year" label="Year" /></th><th><SortButton column="type" label="Type" /></th><th><SortButton column="status" label="Status" /></th><th><SortButton column="sessionDays" label="Session" /></th>{activities.map((activity) => <th key={activity.id}>{activity.name}</th>)}</tr></thead><tbody>
      {visibleRows.map((row) => <tr key={row.id}><td><Link href={`/admin/calendars/${row.id}`}>{row.program}</Link></td><td>{row.year}</td><td>{row.type}</td><td><span className={`status-pill status-${row.status.toLowerCase()}`}>{row.status.replaceAll('_', ' ')}</span></td><td>{row.sessionDays}</td>{activities.map((activity) => <td key={activity.id}>{row.activities[activity.id] ?? 0}</td>)}</tr>)}
      {visibleRows.length === 0 ? <tr><td colSpan={5 + activities.length}><div className="empty-table-state"><strong>No matching programs</strong><span>Try a different program name or clear the search.</span></div></td></tr> : null}
    </tbody></table></div>
  </div>
}
