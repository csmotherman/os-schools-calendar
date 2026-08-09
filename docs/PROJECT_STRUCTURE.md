# Project Structure

The repository uses root-level Next.js App Router folders rather than a `src/` wrapper.

## Top level

- `app/` — Next.js App Router routes and server actions
- `components/` — reusable interactive UI such as the calendar day grid/drawer
- `lib/` — authentication, Supabase, calendar generation, and validation logic
- `types/` — shared TypeScript/Supabase database types
- `supabase/` — versioned database migrations, seed data, and policy documentation
- `tests/` — calendar-engine unit tests
- `docs/` — architecture and operating documentation
- `public/` — static public assets
- `proxy.ts` — Next.js 16 request boundary used to refresh Supabase auth cookies
- `.env.example` — safe environment-variable template
- `.github/workflows/ci.yml` — typecheck/lint/test/build workflow

## Application route groups

`app/(auth)` contains email/password account pages and auth-related server actions.

`app/(program)` contains the normal program-user dashboard, profile, summary, calendar generation, and calendar editing experience.

`app/admin` contains Oakland Schools administration, approvals, reporting/export, settings, programs, users, calendars, and audit history.

`app/auth` contains the auth callback route handler that needs a stable public URL and therefore is not hidden inside an App Router route group.

## Libraries

`lib/supabase/client.ts` creates the typed browser client.

`lib/supabase/server.ts` creates typed cookie-aware server clients.

`lib/supabase/proxy.ts` refreshes/propagates Supabase session cookies through the root Next.js `proxy.ts`.

`lib/auth/` owns reusable access-state helpers. These improve routing/UX; database RLS remains the final authorization boundary.

`lib/calendar/generate.ts` owns deterministic initial calendar-day generation.

`lib/calendar/summary.ts` owns derived counts and requirement evaluation used by program/admin views.

## Implementation principle

Prefer server components/server actions for authenticated workflows. Use client components only where browser state materially improves the interaction, such as the calendar date side drawer. Business/security rules are repeated at the database layer so UI behavior is never the only enforcement mechanism.
