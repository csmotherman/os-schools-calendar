# Project Structure

The repository uses a planned `src/` structure so application code remains separate from Supabase infrastructure and project documentation.

## Top level

- `src/app/` — Next.js App Router routes
- `src/components/` — reusable UI components
- `src/lib/` — application services and business logic
- `src/types/` — shared TypeScript types
- `supabase/` — database migrations, seed data, and RLS policy organization
- `docs/` — architecture and operating documentation
- `public/` — static public assets

## Application route groups

`src/app/(auth)` contains authentication pages.

`src/app/(program)` contains the normal program-user experience.

`src/app/admin` contains Oakland Schools administrative pages.

`src/app/api` is reserved for server-side route handlers when privileged operations or controlled exports require them. Normal database reads/writes should not automatically become custom APIs if Supabase + RLS can safely handle them.

## Libraries

`src/lib/supabase` will hold browser/server Supabase client setup and auth/session helpers.

`src/lib/calendar` will own calendar generation, validation, counts, and rule evaluation. UI components should not contain business rules.

`src/lib/permissions` will contain application-level authorization helpers. Database RLS remains the final enforcement layer.

`src/lib/reporting` will contain reporting queries/export preparation.
