# Draft Database Schema

**Status: design draft — do not create production migrations until open questions are closed.**

The goal is a stable relational schema with configurable reference data instead of hard-coded columns for every future program/activity type.

## Planned reference/configuration tables

### `program_categories`
Examples: LEA, PSA, CBO, NP CBO.

Planned fields: `id`, `name`, `active`, `display_order`, timestamps.

### `programs`
Official GSRP program/site list supplied by Oakland Schools.

Planned fields: `id`, `name`, `program_category_id`, optional external/code fields, `active`, timestamps.

### `school_years`
Examples: 2026-27, 2027-28.

Planned fields: `id`, `name`, `start_date`, `end_date`, `active`, timestamps.

### `program_types`
Initial types: 4-Day Part Day, 4-Day Full Day, 5-Day Part Day, 5-Day Full Day.

Planned fields: `id`, `name`, `days_per_week`, `active`, `display_order`, timestamps.

### `activity_types`
Initial activities: Half Day, Conference, Professional Learning, Home Visit, Break.

Planned fields: `id`, `name`, `code`, `allowed_when_in_session`, `allowed_when_not_in_session`, `active`, `display_order`, timestamps.

## User/access tables

### `profiles`
Application profile linked one-to-one to Supabase `auth.users`.

Planned fields: auth user `id`, `first_name`, `last_name`, `role`, `active`, timestamps.

### Program/calendar affiliation
The final table design is intentionally not frozen yet. The application must support multiple employees having access to the same program while admins have system-wide access. See `OPEN_QUESTIONS.md` for whether regular users are affiliated at program level or calendar level.

## Calendar tables

### `calendars`
One program may have multiple calendars when it operates different program types.

Planned fields: `id`, `program_id`, `program_type_id`, `school_year_id`, `status`, first/last session dates, normal session weekday configuration, creator/update metadata.

### `calendar_days`
One row per date per calendar.

Planned fields: `id`, `calendar_id`, `date`, `in_session`, optional `notes`, timestamps.

The combination `(calendar_id, date)` must be unique.

### `calendar_day_activities`
Associates zero or more activity types with a calendar day.

Planned fields: `id`, `calendar_day_id`, `activity_type_id`, timestamps.

The combination `(calendar_day_id, activity_type_id)` must be unique. This allows future activity types without adding database columns.

## Rule tables

### `requirements`
Admin-configurable minimum/maximum counts by school year and program type.

Planned concepts: session-day requirements and activity-day requirements, nullable min/max values, severity (`BLOCK` or `WARNING`), active flag.

### `blocked_dates`
District-wide dates such as Thanksgiving or Christmas.

Planned fields: `id`, `school_year_id`, `date`, `name`, restriction type (`NO_SESSION` or `NO_ACTIVITY`), active flag.

## Workflow/history tables

### `calendar_versions`
Immutable submission snapshots for approval/re-approval history.

Planned fields: calendar, version number, submitter/timestamp, review status, reviewer/timestamp, review notes, snapshot.

### `audit_log`
Records important administrative and calendar changes.

Planned fields: actor, action, entity type/id, before/after payload, timestamp.

## Reporting

Do not store duplicate totals such as `total_session_days`. Counts should be derived from `calendar_days` and `calendar_day_activities`, then exposed through queries/views. This prevents totals from becoming inconsistent with the actual calendar.
