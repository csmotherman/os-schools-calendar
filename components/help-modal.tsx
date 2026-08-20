'use client'

import { useEffect, useRef, useState } from 'react'

export function HelpModal({ title, intro, steps = [] }: { title: string; intro: string; steps?: string[] }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? []).filter((element) => !element.hasAttribute('disabled'))
    focusable()[0]?.focus()

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        return
      }
      if (event.key !== 'Tab') return
      const items = focusable()
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      triggerRef.current?.focus()
    }
  }, [open])

  return <>
    <button ref={triggerRef} type="button" className="help-button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
      <span className="help-icon" aria-hidden="true">?</span><span>Help</span>
    </button>
    {open ? <div className="help-backdrop" onMouseDown={() => setOpen(false)}>
      <section ref={dialogRef} className="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="help-modal-header"><div><p className="side-eyebrow">How this works</p><h2 id="help-title">{title}</h2></div><button type="button" className="icon-button" aria-label="Close help" onClick={() => setOpen(false)}>×</button></div>
        <p className="help-intro">{intro}</p>
        {steps.length ? <ol className="help-steps">{steps.map((step, index) => <li key={index}>{step}</li>)}</ol> : null}
        <button type="button" className="button fit-button" onClick={() => setOpen(false)}>Got it</button>
      </section>
    </div> : null}
  </>
}
