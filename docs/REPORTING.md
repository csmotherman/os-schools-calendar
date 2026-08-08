# Admin Reporting

Reporting should be derived from the normalized calendar data rather than manually stored totals.

## Core filters

- School year
- Program type
- Program category (LEA/PSA/CBO/etc.)
- Program
- Calendar status
- Compliance/validation status

## Core columns/measures

- Program
- Program category
- Program type
- Days in session
- Half days
- Conference days
- Professional Learning days
- Home Visit days
- Break days
- Requirement status
- Submission/approval status

## Admin dashboard

The dashboard should surface high-value workflow information first: total calendars, draft/not started, pending review, approved, changes requested, and calendars failing blocking requirements.

## Exports

Plan for CSV and Excel-friendly exports from filtered report results. PDF output can be considered later but should not drive the database design.

## Architecture rule

Do not create separate tables containing duplicated report totals unless a proven performance need appears. PostgreSQL views/queries should calculate these values from the source calendar records.
