# Database Schema v1

**Status: implemented in Supabase.**

The live schema intentionally stays focused on calendar functionality. LEA/PSA/CBO classifications, GSRP/Blend classifications, instructional hours, and calendar version snapshots are not part of v1.

## Core tables

### `programs`
Official program/site names.

Fields: `id`, `name`, `active`, timestamps.

Program names are controlled reference data and are not typed manually during normal account setup.

### `profiles`
One-to-one application profile for `auth.users`.

Fields: auth user `id`, `first_name`, `last_name`, `role`, `account_status`, timestamps.

Roles: `PROGRAM_USER`, `ADMIN`.

Account statuses: `PENDING`, `APPROVED`, `DECLINED`, `DISABLED`.

### `program_memberships`
Connects users to programs.

Multiple employees may belong to one program. A program user receives access to all calendars belonging to the approved program. Admins receive system-wide access through their role.

Membership statuses: `PENDING`, `APPROVED`, `DECLINED`.

### `school_years`
Admin-managed school years such as `2026-27`, with overall system start/end boundaries.

### `calendar_types`
Reference data for schedule/calendar type.

Initial values:

- 4-Day Part Day
- 4-Day Full Day
- 5-Day Part Day
- 5-Day Full Day

Fields include `days_per_week` and `day_length` for reporting/validation without parsing display labels.

### `activity_types`
Reference data for date-level activity checkboxes.

Initial values:

- Half Day
- Conference
- Professional Learning
- Home Visit
- Break

Activity types store whether they are allowed when children are in session and/or not in session.

### `calendars`
One annual calendar for a program + school year + calendar type.

A database uniqueness constraint prevents duplicate calendar types for the same program/year.

Fields include program, school year, calendar type, start/end dates, workflow status, creator/submission/approval metadata, review notes, and timestamps.

Calendar statuses: `DRAFT`, `PENDING`, `APPROVED`, `CHANGES_REQUESTED`.

### `calendar_days`
One row per date in a calendar.

Fields: calendar, date, `in_session`, notes, timestamps.

`(calendar_id, date)` is unique.

### `calendar_day_activities`
Associates zero or more configured activities with a calendar day.

`(calendar_day_id, activity_type_id)` is unique, so checking Conference on one date always counts as one Conference Day rather than multiple conference occurrences.

### `requirements`
Admin-configurable thresholds by school year + calendar type.

Supported metric types:

- `SESSION_DAYS`
- `ACTIVITY_DAYS`

Rules may contain a minimum, maximum, or both and may be `BLOCK` or `WARNING` severity.

Only one active rule of a given kind may exist for a school year/calendar type; inactive historical rules do not prevent creating a replacement.

### `blocked_dates`
Admin-managed district-wide fixed dates.

Restriction types:

- `NO_SESSION`
- `NO_ACTIVITY`

Blocked dates belong to one school year and may be deactivated rather than deleted.

### `audit_log`
Append-oriented change history for important calendar/configuration operations. It stores actor, entity, optional program/calendar context, before/after JSON, and timestamp.

The application maintains only the **current calendar state**. Separate calendar-version snapshot tables are intentionally not used in v1; historical change information is retained through the audit log.

## Calendar counting model

The application tracks **days**, not hours/minutes.

- Session Days = count of `calendar_days` where `in_session = true`
- Half Days = count of dates tagged Half Day
- Conference Days = count of dates tagged Conference
- Professional Learning Days = count of dates tagged Professional Learning
- Home Visit Days = count of dates tagged Home Visit
- Break Days = count of dates tagged Break

A Half Day requires `in_session = true` and counts as both one Session Day and one Half Day.

## Integrity rules

The database/functions enforce important structural rules including:

- one calendar per program + school year + calendar type;
- one row per date per calendar;
- one instance of each activity type per date;
- calendar dates inside the selected school year;
- calendar-day dates inside the calendar range;
- activity/session compatibility;
- blocked-date restrictions;
- editing an approved calendar returns it to `PENDING`;
- program users require an approved account and approved program membership for calendar access.

## Reporting

Do not store duplicate totals such as `total_session_days`. Reporting and dashboard totals should be derived from the source calendar rows so totals cannot drift from the calendar itself.
