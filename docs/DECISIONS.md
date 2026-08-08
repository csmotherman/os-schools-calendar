# Architectural Decision Record

## ADR-001 — Days, not instructional hours
The application tracks total Session Days and activity-day counts. Instructional minutes/hours are out of scope.

## ADR-002 — Activity types are reference data
Half Day, Conference, Professional Learning, Home Visit, and Break are rows/reference values rather than permanent boolean columns on the calendar-day table. Future activities can be added without a schema migration.

## ADR-003 — Day editing uses a side panel
Clicking a calendar date opens a right-side editor containing In Session Yes/No, activity checkboxes, and notes.

## ADR-004 — Rules are configurable
Min/max thresholds live in database configuration by school year and calendar type instead of being hard-coded in TypeScript.

## ADR-005 — Blocked dates are admin-controlled
Admins define district-wide dates that prohibit session or all tracked activity.

## ADR-006 — Approved edits require re-review
Editing calendar data while a calendar is `APPROVED` changes the current calendar back to `PENDING`. The application does not keep separate calendar snapshot/version rows in v1; historical change information is retained through the audit log.

## ADR-007 — Authentication is email/password only
No Google, Microsoft, or other social login is planned.

## ADR-008 — Sessions persist
Users remain signed in across normal repeat visits while the Supabase session remains valid. Next.js/Supabase SSR cookie handling refreshes sessions when required.

## ADR-009 — Controlled reference data over free text
Official program names, calendar types, activity types, school years, and similar selectable values come from controlled database data wherever practical.

## ADR-010 — Database security is authoritative
RLS, constraints, and database functions enforce access/integrity. Hiding controls or redirecting pages in the UI is not considered sufficient security.

## ADR-011 — Users self-register but do not self-authorize
Users may create their own email/password account, but the new profile is `PENDING`. After authentication they select an official program and create a `PENDING` membership request. Admin approval is required before calendar access.

## ADR-012 — Program affiliation is program-level
Multiple employees may be approved for one program. An approved program user receives access to every calendar belonging to that program. Admins have system-wide access.

## ADR-013 — One calendar per calendar type per program/year
A program may have multiple annual calendars when it operates different calendar types, but may not create duplicate calendars of the same calendar type for the same school year.

## ADR-014 — Program classifications are deferred
LEA/PSA/CBO and GSRP/Blend classifications are not required for the current calendar workflow and are intentionally omitted from schema v1. They may be added later if they become necessary for reporting or permissions.

## ADR-015 — Registration program selection occurs after authentication
The program dropdown is shown only after the user has an authenticated session. This avoids making the official program table anonymously readable solely to populate a public registration form.
