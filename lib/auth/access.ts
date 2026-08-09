import { createClient } from '@/lib/supabase/server'
import type { AccountStatus, MembershipStatus, UserRole } from '@/types/database'

type AccessProfile = {
  id: string
  first_name: string
  last_name: string
  role: UserRole
  account_status: AccountStatus
}

type AccessMembership = {
  id: string
  program_id: string
  status: MembershipStatus
  created_at: string
  programs: { id: string; name: string } | null
}

type AccessPayload = {
  profile: AccessProfile | null
  memberships: AccessMembership[]
}

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

  const { data, error } = await supabase.rpc('get_my_access_state')
  if (error) {
    console.error('Unable to load access state:', error)
    return {
      user,
      profile: null,
      memberships: [],
      approvedMembership: null,
    }
  }

  const payload = (data ?? { profile: null, memberships: [] }) as AccessPayload
  const memberships = payload.memberships ?? []
  const approvedMembership = memberships.find((membership) => membership.status === 'APPROVED') ?? null

  return {
    user,
    profile: payload.profile,
    memberships,
    approvedMembership,
  }
}
