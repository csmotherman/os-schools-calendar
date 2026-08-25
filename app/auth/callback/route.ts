import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const { searchParams } = requestUrl
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  const origin = configuredOrigin ?? (process.env.NODE_ENV === 'production' ? null : requestUrl.origin)

  if (!origin) {
    return new Response('Application URL is not configured.', { status: 500 })
  }

  const code = searchParams.get('code')
  let next = searchParams.get('next') ?? '/dashboard'

  if (!next.startsWith('/') || next.startsWith('//')) {
    next = '/dashboard'
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Unable to confirm your account.')}`)
}
