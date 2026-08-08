# Authentication

## Identity model

Initial authentication uses **email + password only** through Supabase Auth.

No Google, Microsoft, or other social identity provider is planned.

Application profile information includes:

- First name
- Last name
- Email (identity managed by Supabase Auth)
- Role
- Program/calendar affiliation as finalized in schema v1.0

## Persistent sessions

Users should not be forced to sign in on every visit. The Next.js/Supabase implementation will use cookie-based server-side authentication so an existing valid session can be restored automatically.

A user should normally encounter the login page only when there is no valid session, they explicitly sign out, credentials/session security invalidates the session, they clear site data, or they use a new browser/device.

Supabase's current Next.js guidance uses cookie-based authentication with browser/server clients and public project URL/publishable-key environment variables.

## Account creation

Security default: there should be no unrestricted public registration that lets an arbitrary person claim an Oakland Schools program. Initial production design should use admin-created/invited accounts or another controlled approval process.

The official program association must come from stored program reference data rather than free-text user input.
