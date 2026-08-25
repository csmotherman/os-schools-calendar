-- Oakland Schools GSRP Calendar
-- Migration 022: fix admin_restore_user() enum assignment detected by
-- `supabase db lint`.

create or replace function public.admin_restore_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  has_approved_membership boolean;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.profiles p
    where p.id = target_user_id
      and p.role = 'ADMIN'
  ) then
    raise exception 'Use controlled administrator provisioning for administrator accounts';
  end if;

  select exists (
    select 1
    from public.program_memberships pm
    where pm.user_id = target_user_id
      and pm.status = 'APPROVED'
  ) into has_approved_membership;

  update public.profiles
  set account_status = case
    when has_approved_membership then 'APPROVED'::public.account_status
    else 'PENDING'::public.account_status
  end
  where id = target_user_id
    and role = 'PROGRAM_USER';

  if not found then
    raise exception 'Program user profile not found';
  end if;
end;
$$;

revoke all on function public.admin_restore_user(uuid) from public;
grant execute on function public.admin_restore_user(uuid) to authenticated;
