-- Oakland Schools Calendar
-- Migration 013: expose the active program directory through a narrow authenticated RPC.
--
-- Pending users need to select a program before they have an approved membership.
-- This function intentionally exposes only active program IDs and names, and only
-- to an authenticated Supabase user. It does not weaken RLS on public.programs.

create or replace function public.list_active_programs()
returns table (id uuid, name text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  return query
  select p.id, p.name
  from public.programs p
  where p.active = true
  order by p.name;
end;
$$;

revoke all on function public.list_active_programs() from public;
grant execute on function public.list_active_programs() to authenticated;
