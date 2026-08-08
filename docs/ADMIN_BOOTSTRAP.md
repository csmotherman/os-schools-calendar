# First Admin Bootstrap

The first administrator cannot be approved through the application because no approved admin exists yet. Bootstrap exactly one initial admin manually in Supabase, then use the application for later administration.

## Procedure

1. Create the intended admin account through the application's `/register` flow so the normal Auth trigger creates its profile.
2. Confirm the email if email confirmation is enabled.
3. In Supabase SQL Editor, verify the exact email before changing anything:

```sql
select u.id, u.email, p.role, p.account_status
from auth.users u
join public.profiles p on p.id = u.id
where lower(u.email) = lower('ADMIN_EMAIL_HERE');
```

4. If the returned row is the intended administrator, promote that exact Auth user:

```sql
update public.profiles p
set
  role = 'ADMIN',
  account_status = 'APPROVED',
  updated_at = now()
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('ADMIN_EMAIL_HERE');
```

5. Run the verification query again and confirm `ADMIN` + `APPROVED`.
6. Sign in through the application and visit `/dashboard`; the application should redirect the administrator to `/admin/dashboard`.

## Security notes

- Do not create a shared admin account.
- Do not distribute the database password or service-role key to administrators.
- Do not add additional admins through manual SQL once the admin user-management workflow exists unless recovery requires it.
- Admin authorization is ultimately enforced by the database `is_admin()` function/RLS, not by the dashboard URL.
