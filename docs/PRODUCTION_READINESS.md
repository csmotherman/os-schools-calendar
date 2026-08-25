# Production Readiness Runbook

This document is the release gate for the Oakland Schools GSRP Calendar application. A green application build alone is not sufficient for production.

## 1. Automated release gates

Every pull request and push to the protected release branch should pass both CI jobs:

### Application verification

```bash
npm ci
npm run check
```

`npm run check` verifies:

- numbered migration continuity;
- TypeScript type checking;
- ESLint;
- calendar-engine unit tests;
- production Next.js build.

### Database verification

Requires Docker and Supabase CLI 2.115.0 or the CI-pinned equivalent.

```bash
supabase start
supabase test db --local
supabase db lint --local --level error --fail-on error
supabase stop --no-backup
```

The pgTAP suite creates isolated test users/programs inside transactions and proves critical RLS/workflow behavior through direct database calls. Test data is rolled back.

## 2. What the database tests must prove

The automated database suite is expected to fail the build if any of these guarantees regress:

- all repository migrations apply to a fresh database through migration `022`;
- RLS remains enabled on program/calendar/audit tables;
- a program user cannot create raw calendar rows instead of the controlled RPC;
- a program user cannot directly delete calendar-day rows;
- Program A cannot read or mutate Program B calendar data;
- a pending account has no calendar access;
- blocked dates cannot be bypassed through direct RPC calls;
- blocking requirements prevent direct submission;
- pending calendars cannot be edited by program users;
- program users cannot approve calendars;
- admins can review across programs;
- admin disable/restore returns users to the correct typed account state;
- approved-calendar edits reopen review;
- calendar changes remain visible in the audit log;
- controlled admin calendar deletion works without breaking audit capture.

## 3. Reproduce the database from zero

Before every release candidate, verify that the repository can build a clean local database without dashboard-only SQL:

```bash
supabase start
supabase db reset
supabase test db --local
supabase db lint --local --level error --fail-on error
```

Do not accept a production release if a clean `db reset` fails. The repository migrations are the schema source of truth.

## 4. Staging / hosted Supabase migration gate

Never run `supabase db reset --linked` against staging or production.

For a staging project:

```bash
supabase login
supabase link --project-ref <STAGING_PROJECT_REF>
supabase migration list --linked
supabase db push --linked --dry-run
supabase db lint --linked --level error --fail-on error
```

Review the migration list. The hosted project must contain the same migration history as the repository through `022`, with no unexplained dashboard-only schema changes.

After review, apply pending migrations to staging:

```bash
supabase db push --linked
```

Then exercise the deployed application with controlled accounts before production promotion.

For production, repeat the migration-list and dry-run checks against the production project before applying any migration. Use Oakland Schools-approved credentials and change-management procedures.

## 5. Supabase Auth production configuration

Before onboarding real users:

- set the Supabase Site URL to the canonical production HTTPS origin;
- allow only required production auth callback/reset URLs plus explicitly approved development/staging origins;
- remove obsolete preview redirect origins;
- configure an approved custom SMTP provider for confirmation and password-reset mail;
- review Supabase Auth rate limits and password policy;
- confirm the first admin account was deliberately bootstrapped and that public registration cannot select the ADMIN role;
- test sign-up, confirmation, login, logout, password reset, session restoration, decline/resubmit, approval, disable, and restore behavior on staging.

## 6. Vercel / application environment

Production requires exactly these public application values:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL
```

`NEXT_PUBLIC_SITE_URL` must be the canonical HTTPS origin with no trailing slash.

Do not add a Supabase service-role key unless a future server-only use case is separately reviewed. Never expose database passwords, service-role keys, SMTP credentials, or other secrets through `NEXT_PUBLIC_*` variables.

## 7. HTTP security

The application config sets baseline headers:

- `X-Content-Type-Options: nosniff`;
- `X-Frame-Options: DENY`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- restrictive camera/microphone/geolocation `Permissions-Policy`;
- HSTS in production.

A Content Security Policy should be finalized with Oakland Schools IT/security after testing the production Next.js/Supabase auth flow. Do not deploy an untested CSP that breaks hydration, authentication, or password recovery.

## 8. Logging and privacy

Production logs must not intentionally record:

- passwords or reset tokens;
- session cookies/JWTs;
- Supabase secret keys;
- unnecessary email/user identity diagnostics;
- child/student records.

The application is intended for program/calendar operational data. Student names, DOBs, UICs, addresses, medical/IEP details, or other child-level information require a separate privacy/security review before being added.

## 9. Backup and recovery

Before launch, Oakland Schools must identify the operational owner and document:

- the enabled Supabase backup/PITR capability for the selected plan;
- retention expectations;
- who can restore data;
- how a restore is requested and approved;
- a tested restore/recovery exercise;
- recovery point and recovery time expectations.

A backup feature that has never been restored is not a validated recovery plan.

## 10. User acceptance and accessibility

Complete staging acceptance with representative program and admin users. At minimum test:

- desktop and common mobile widths;
- keyboard-only operation;
- visible focus states;
- form labels and validation messages;
- calendar/day-editor usability;
- color contrast and status communication that does not depend only on color;
- screen-reader navigation for major workflows;
- CSV export against known expected totals;
- multiple users assigned to the same program;
- concurrent edits and refresh behavior.

## 11. Operational ownership

Before production, name owners for:

- application support;
- Supabase/database administration;
- Vercel/domain administration;
- access approvals;
- configuration changes (school years, blocked dates, requirements);
- security incidents;
- production releases and rollbacks.

Document the support path users should follow when account approval, login, or calendar data is incorrect.

## 12. Production go/no-go checklist

Production is **NO-GO** unless all of the following are true:

- [ ] latest CI application job is green;
- [ ] latest CI database job is green;
- [ ] fresh local `supabase db reset` succeeds;
- [ ] pgTAP RLS/workflow suite passes;
- [ ] PostgreSQL lint has no errors;
- [ ] hosted staging migration history matches repository through `022`;
- [ ] staging auth workflows pass;
- [ ] staging cross-program isolation was manually spot-checked with controlled accounts;
- [ ] canonical production URL and auth redirects are configured;
- [ ] approved SMTP is configured;
- [ ] backup/recovery ownership is documented and tested;
- [ ] accessibility/user acceptance is complete;
- [ ] Oakland Schools IT/security approves hosting, domain, and data use;
- [ ] operational support/release owners are assigned.

If any security, migration, or recovery gate is unknown, treat it as failed until verified.
