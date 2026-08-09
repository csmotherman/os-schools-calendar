'use client'

import { useEffect, useState } from 'react'

export function HelpModal({ title, intro, steps = [] }: { title: string; intro: string; steps?: string[] }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return <>
    <button type="button" className="help-button" onClick={() => setOpen(true)} aria-haspopup="dialog">
      <span className="help-icon" aria-hidden="true">?</span><span>Help</span>
    </button>
    {open ? <div className="help-backdrop" onMouseDown={() => setOpen(false)}>
      <section className="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="help-modal-header"><div><p className="side-eyebrow">How this works</p><h2 id="help-title">{title}</h2></div><button type="button" className="icon-button" aria-label="Close help" onClick={() => setOpen(false)}>×</button></div>
        <p className="help-intro">{intro}</p>
        {steps.length ? <ol className="help-steps">{steps.map((step, index) => <li key={index}>{step}</li>)}</ol> : null}
        <button type="button" className="button fit-button" onClick={() => setOpen(false)}>Got it</button>
      </section>
    </div> : null}
  </>
}
