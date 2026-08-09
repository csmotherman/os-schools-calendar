-- Oakland Schools Calendar
-- Migration 015: provide one authoritative, authenticated access-state API.
-- Routing must not depend on reading profiles through policies whose decisions
-- themselves depend on profile data.

create or replace function public.get_my_access_state()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  current_user_id uuid := auth.uid();
  result jsonb;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'profile', case
      when p.id is null then null
      else jsonb_build_object(
        'id', p.id,
        'first_name', p.first_name,
        'last_name', p.last_name,
        'role', p.role,
        'account_status', p.account_status
      )
    end,
    'memberships', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', pm.id,
          'program_id', pm.program_id,
          'status', pm.status,
          'created_at', pm.created_at,
          'programs', jsonb_build_object(
            'id', pr.id,
            'name', pr.name
          )
        )
        order by pm.created_at desc
      )
      from public.program_memberships pm
      join public.programs pr on pr.id = pm.program_id
      where pm.user_id = current_user_id
    ), '[]'::jsonb)
  )
  into result
  from (select 1) seed
  left join public.profiles p on p.id = current_user_id;

  return result;
end;
$$;

revoke all on function public.get_my_access_state() from public;
grant execute on function public.get_my_access_state() to authenticated;
