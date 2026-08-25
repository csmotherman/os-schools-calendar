# Remaining Production Decisions

Core schema and workflow design decisions are implemented. The remaining open items are deployment/operational decisions that require Oakland Schools input rather than additional speculative application architecture.

## 1. Live school-year configuration

Confirm the production values for each live school year and calendar type:

- school-year start/end dates;
- minimum/maximum Session Days;
- Half Day thresholds, if applicable;
- Conference Day thresholds;
- Professional Learning Day thresholds;
- Home Visit Day thresholds;
- Break thresholds, if Oakland Schools chooses to validate them;
- which requirements are blocking versus warning-only.

## 2. Live blocked dates

Confirm the district-wide fixed dates for the first live year and whether each is `NO_SESSION` or `NO_ACTIVITY`.

## 3. Production administrator bootstrap

Name the initial production administrator and complete the deliberate bootstrap procedure. Public registration must remain unable to create an administrator account.

## 4. Production hosting and identity configuration

Decide/approve:

- canonical production domain;
- Vercel/hosting ownership;
- Supabase production project ownership;
- production Site URL and allowed auth redirect URLs;
- approved SMTP provider;
- access to deployment/database credentials.

## 5. Backup and recovery ownership

Document:

- enabled backup/PITR capability;
- retention expectations;
- restore authority;
- restore procedure;
- RPO/RTO expectations;
- test restore date and result.

## 6. Content Security Policy

Baseline security headers are configured. Finalize and test a CSP with Oakland Schools IT/security against the deployed Next.js/Supabase authentication flow before enforcing it in production.

## 7. Accessibility and user acceptance

Identify representative admin/program users and complete the staging acceptance checklist in `TEST_PLAN.md`, including keyboard, screen-reader, mobile, and reporting validation.

## 8. Operational support

Assign owners for production support, access approvals, configuration changes, releases/rollbacks, database administration, and security incidents.

See `PRODUCTION_READINESS.md` for the release checklist.
