# Oakland Schools GSRP Calendar

Secure web application for creating, reviewing, approving, and reporting Oakland Schools program calendars.

## Current phase

The database foundation is live in Supabase and the repository now contains the first working Next.js application foundation.

Implemented foundation:

- Next.js 16 App Router + TypeScript
- Supabase browser/server clients using `@supabase/ssr`
- Cookie-based persistent authentication sessions
- Email/password registration and login
- Email confirmation callback
- Two-step account setup: identity first, program selection after authentication
- Pending account/program approval state
- Program-level access helper
- Protected program dashboard foundation
- Protected admin dashboard foundation
- Supabase schema, database functions, RLS, auth trigger, and reference seed data

Calendar creation/editing, admin approval controls, reporting, and final production styling are intentionally not implemented yet.

## Local setup

1. Install Node.js 20.9 or newer.
2. Clone the repository.
3. Run `npm install`.
4. Copy `.env.example` to `.env.local`.
5. Add the Supabase Project URL and publishable key from the Supabase **Connect** dialog.
6. Keep `NEXT_PUBLIC_SITE_URL=http://localhost:3000` for local development.
7. Run `npm run dev`.
8. Open `http://localhost:3000`.

Useful checks:

```bash
npm run typecheck
npm run lint
npm run build
```

## Authentication model

Authentication uses email + password only. No Google, Microsoft, or other social login is planned.

A new user:

1. enters first name, last name, email, and password;
2. confirms their email when email confirmation is enabled;
3. selects their official program from the database;
4. creates a **pending** program-membership request;
5. receives no calendar access until an Oakland Schools admin approves the account and affiliation.

Program selection is intentionally performed only after authentication so the public registration page does not need anonymous access to the program table.

## Security

Supabase RLS is the authoritative data-access layer. UI redirects and hidden controls are convenience features, not security boundaries.

Never commit real credentials. `.env.local` is ignored by Git. The current application foundation does **not** require a Supabase service-role key.

## Documentation

See [`docs/`](docs/) for architecture, database, authentication, authorization, calendar rules, security, reporting, and deployment notes.
