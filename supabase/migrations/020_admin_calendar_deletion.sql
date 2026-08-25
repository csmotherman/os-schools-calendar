-- Oakland Schools GSRP Calendar
-- Migration 020: controlled administrator deletion of calendars.

create or replace function public.delete_calendar(target_calendar_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  calendar_exists boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  select exists (
    select 1 from public.calendars c where c.id = target_calendar_id
  ) into calendar_exists;

  if not calendar_exists then
    raise exception 'Calendar not found';
  end if;

  delete from public.calendars
  where id = target_calendar_id;
end;
$$;

revoke all on function public.delete_calendar(uuid) from public;
grant execute on function public.delete_calendar(uuid) to authenticated;
