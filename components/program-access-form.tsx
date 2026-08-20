'use client'

import { useMemo, useState } from 'react'
import { requestProgram } from '@/app/(auth)/actions'

type ProgramOption = { id: string; name: string }

export function ProgramAccessForm({ programs }: { programs: ProgramOption[] }) {
  const [query, setQuery] = useState('')
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return term ? programs.filter((program) => program.name.toLowerCase().includes(term)) : programs
  }, [programs, query])

  return (
    <form action={requestProgram} className="stack">
      <div className="field">
        <label htmlFor="program-search">Find your program</label>
        <input id="program-search" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setSelectedProgramId('') }} placeholder="Start typing a program or district name" autoComplete="off" />
        <span className="muted small-text" aria-live="polite">{filtered.length} of {programs.length} programs shown</span>
      </div>

      <div className="field">
        <label htmlFor="program_id">Program</label>
        <select id="program_id" name="program_id" value={selectedProgramId} onChange={(event) => setSelectedProgramId(event.target.value)} required size={Math.min(Math.max(filtered.length, 2), 8)}>
          <option value="" disabled>Select your program</option>
          {filtered.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
        </select>
        {filtered.length === 0 ? <span className="error small-text">No programs match that search.</span> : null}
      </div>

      <button className="button" type="submit" disabled={!selectedProgramId}>Request access</button>
    </form>
  )
}
