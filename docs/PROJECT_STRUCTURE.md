# Project Structure

The repository uses root-level Next.js App Router folders rather than a `src/` wrapper.

## Top level

- `app/` — Next.js App Router routes and server actions
- `components/` — reusable UI components as calendar/admin UI is implemented
- `lib/` — application services and business logic
- `types/` — shared TypeScript types/generated database types when added
- `supabase/` — database migrations, seed data, tests, and policy documentation
- `docs/` — architecture and operating documentation
- `public/` — static public assets
- `proxy.ts` — Next.js 16 request boundary used to refresh Supabase auth cookies
- `.env.example` — safe environment-variable template

## Application route groups

`app/(auth)` contains email/password account pages and auth-related server actions.

`app/(program)` contains the normal program-user experience.

`app/admin` contains Oakland Schools administrative pages.

`app/auth` contains auth callback route handlers that must have stable public URLs and therefore are not hidden inside a route group.

`app/api` remains reserved for server-side route handlers when a controlled server endpoint is actually needed. Normal database reads/writes should not automatically become custom APIs when Supabase + RLS can safely handle them.

## Libraries

`lib/supabase/client.ts` creates the browser client.

`lib/supabase/server.ts` creates cookie-aware server clients.

`lib/supabase/proxy.ts` refreshes/propagates Supabase session cookies through the root Next.js `proxy.ts`.

`lib/auth/` owns reusable application access-state helpers. These helpers improve routing/UX; database RLS remains the final authorization boundary.

`lib/calendar/` is reserved for calendar generation, validation, counts, and rule evaluation. Calendar UI components should not own business rules.

`lib/reporting/` is reserved for reporting queries and export preparation.

## Current implementation principle

Prefer server components/server actions for authenticated application flows where practical. Introduce client components only when browser interactivity is required, such as the calendar date side panel.
