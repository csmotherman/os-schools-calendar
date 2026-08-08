# Calendar Logic

## User-facing day model

Every calendar date has:

1. `In Session`: Yes / No
2. Zero or more activity checkboxes
3. Optional notes

Initial activities:

- Half Day
- Conference
- Professional Learning
- Home Visit
- Break

The intended editing interaction is a calendar grid. Clicking a date opens a right-side drawer/modal containing the session control, activity checkboxes, and notes.

## Activity compatibility

Half Day is valid only when `In Session = Yes`.

If a user attempts `In Session = No` while Half Day is selected, the UI should explain the conflict and prevent/remove Half Day. Database triggers also enforce configured activity/session compatibility so a crafted request cannot bypass the rule.

Break is intended for non-session dates. Conference, Professional Learning, and Home Visit may coexist with the configured session state where allowed by `activity_types`.

## Calendar generation

When a calendar is created, the user selects:

- School year
- Calendar type
- First session date
- Last session date
- Normal weekdays in session

The TypeScript calendar engine will:

1. generate dates in the selected range;
2. mark normal weekdays as `in_session`;
3. apply district blocked dates;
4. create the current calendar-day rows;
5. calculate Session Day/activity-day counts;
6. evaluate configured requirements.

Generation settings are inputs to create the calendar. The generated calendar dates become the source of truth afterward.

No instructional minutes/hours are part of the current scope.

## Counts

Counts are derived live from source rows:

- Session Days = calendar days where `in_session = true`
- Half Days = dates tagged Half Day
- Conference Days = dates tagged Conference
- Professional Learning Days = dates tagged Professional Learning
- Home Visit Days = dates tagged Home Visit
- Break Days = dates tagged Break

A Half Day contributes one Session Day and one Half Day.

An activity checkbox is a **day-level marker**, not an occurrence counter. Three individual conferences held on one checked date still equal one Conference Day.

## Calendar uniqueness

A program may create multiple calendars for one school year only when the calendar type differs. The database prevents two calendars with the same program + school year + calendar type.

## Status workflow

Statuses:

- `DRAFT`
- `PENDING`
- `APPROVED`
- `CHANGES_REQUESTED`

Typical workflow: `DRAFT → PENDING → APPROVED`.

An admin may return a pending calendar as `CHANGES_REQUESTED`, after which the program edits and resubmits it.

If any calendar-day/activity data is changed while the calendar is `APPROVED`, database logic automatically returns the **current calendar** to `PENDING` and clears current approval metadata. The audit log retains before/after change history; schema v1 does not store separate calendar snapshot/version records.
