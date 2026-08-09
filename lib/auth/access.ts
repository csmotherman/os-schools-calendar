import { createClient } from '@/lib/supabase/server'

export async function getAccessState() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      user: null,
      profile: null,
      memberships: [],
      approvedMembership: null,
    }
  }

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, first_name, last_name, role, account_status')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('program_memberships')
      .select('id, program_id, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const membershipList = memberships ?? []
  const programIds = [...new Set(membershipList.map((membership) => membership.program_id))]
  const { data: programs } = programIds.length
    ? await supabase.from('programs').select('id, name').in('id', programIds)
    : { data: [] as { id: string; name: string }[] }

  const programMap = new Map((programs ?? []).map((program) => [program.id, program]))
  const enrichedMemberships = membershipList.map((membership) => ({
    ...membership,
    programs: programMap.get(membership.program_id) ?? null,
  }))
  const approvedMembership =
    enrichedMemberships.find((membership) => membership.status === 'APPROVED') ?? null

  return {
    user,
    profile,
    memberships: enrichedMemberships,
    approvedMembership,
  }
}
