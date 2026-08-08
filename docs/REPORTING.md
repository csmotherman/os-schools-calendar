# Admin Reporting

Reporting should be derived from normalized calendar data rather than manually stored totals.

## Core filters

- School year
- Calendar type
- Program
- Calendar status
- Compliance/validation status

Program classification filters such as LEA/PSA/CBO or GSRP/Blend are intentionally out of scope until those attributes are actually needed and added to the data model.

## Core columns/measures

- Program
- Calendar type
- Session Days
- Half Days
- Conference Days
- Professional Learning Days
- Home Visit Days
- Break Days
- Requirement status
- Submission/approval status
- Last updated/submitted/approved timestamps where useful

## Admin dashboard

The dashboard should prioritize workflow information:

- total calendars;
- draft/not started;
- pending review;
- approved;
- changes requested;
- calendars failing blocking requirements;
- pending user/program access requests.

## Exports

Plan for CSV and Excel-friendly exports from filtered report results. PDF output can be considered later but should not drive the database design.

## Architecture rule

Do not create separate tables containing duplicated report totals unless a proven performance need appears. PostgreSQL views/queries should calculate values from `calendar_days` and `calendar_day_activities` so reports cannot drift from the actual calendar.
