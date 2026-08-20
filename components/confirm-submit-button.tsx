'use client'

import type { MouseEvent } from 'react'

type ConfirmSubmitButtonProps = {
  children: React.ReactNode
  message: string
  className?: string
  disabled?: boolean
}

export function ConfirmSubmitButton({ children, message, className, disabled }: ConfirmSubmitButtonProps) {
  function confirmAction(event: MouseEvent<HTMLButtonElement>) {
    if (!window.confirm(message)) event.preventDefault()
  }

  return <button className={className} type="submit" disabled={disabled} onClick={confirmAction}>{children}</button>
}
