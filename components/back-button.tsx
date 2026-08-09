'use client'

import { useRouter } from 'next/navigation'

export function BackButton({ fallback = '/dashboard', label = 'Back' }: { fallback?: string; label?: string }) {
  const router = useRouter()
  return (
    <button
      type="button"
      className="back-button"
      onClick={() => {
        if (window.history.length > 1) router.back()
        else router.push(fallback)
      }}
    >
      <span aria-hidden="true">←</span>
      <span>{label}</span>
    </button>
  )
}
