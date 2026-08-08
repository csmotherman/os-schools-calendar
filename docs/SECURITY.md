# Security Requirements

Security is a design constraint, not a later feature.

## Required controls

1. Email/password authentication through Supabase Auth.
2. Persistent secure sessions; users should not sign in every visit unnecessarily.
3. No unrestricted public account claiming of a program.
4. Row Level Security on every exposed application table.
5. Program users cannot read/write unrelated program/calendar data even through direct API requests.
6. Admin authorization must be checked server-side/database-side, not only through hidden navigation.
7. Privileged Supabase keys must remain server-only.
8. `.env.local` and deployment secrets must never be committed.
9. Important calendar/admin changes must be auditable.
10. Previously approved calendar submissions must remain recoverable after later edits.
11. Production hosting/domain/data use requires Oakland Schools IT/security approval.

## Data minimization

The application currently needs program/calendar operational data, not child/student records. Do not add student names, DOBs, UICs, addresses, medical/IEP information, or other child-level data without a separate security/privacy review.

## Defense in depth

The application UI should prevent invalid actions for usability, TypeScript/server logic should validate requests, and PostgreSQL constraints/RLS should provide the final data-access enforcement layer.
