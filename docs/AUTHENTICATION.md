# Authentication

## Identity model

Authentication uses **email + password only** through Supabase Auth.

No Google, Microsoft, or other social identity provider is planned.

Supabase Auth owns:

- Email
- Password credentials
- Auth user ID
- Session/refresh tokens
- Email confirmation/recovery state

The application `profiles` table owns:

- First name
- Last name
- Role (`PROGRAM_USER` or `ADMIN`)
- Account status (`PENDING`, `APPROVED`, `DECLINED`, `DISABLED`)

## Registration flow

Registration is intentionally two-step.

1. User enters first name, last name, email, and password.
2. `supabase.auth.signUp` sends first/last name as user metadata.
3. The database Auth trigger creates a `profiles` row with `PROGRAM_USER` + `PENDING`.
4. If email confirmation is enabled, the user confirms their email and returns through `/auth/callback`.
5. Once authenticated, the user visits `/select-program`.
6. The program dropdown reads active programs through the authenticated RLS policy.
7. Selecting a program inserts a `PENDING` `program_memberships` row.
8. The user remains on `/pending` until an admin approves both the account and program affiliation.

The program is not collected before authentication. This avoids granting anonymous Data API access to the official program table simply to populate the registration dropdown.

## Persistent sessions

The application uses `@supabase/ssr` browser/server clients and a Next.js 16 `proxy.ts` session-refresh layer.

Users should not be forced to sign in on every visit. A valid Supabase session is restored from cookies and refreshed when required.

A user normally sees the login page only when no valid session exists, they explicitly sign out, their session is invalidated, they clear site data, or they use another browser/device.

## Authorization after login

Successful authentication does not automatically grant calendar access.

Calendar access requires:

- `profiles.account_status = APPROVED`
- an approved `program_memberships` row for the requested program
- the database RLS policy to allow the requested row

Pending, declined, or disabled accounts do not gain calendar access.

## Password recovery

The application contains a password-reset request page and a reset-password page. Supabase manages the recovery email/session and the application updates the password through the authenticated recovery session.
