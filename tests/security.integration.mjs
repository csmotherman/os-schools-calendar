import test, { before } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

function parseSupabaseEnv() {
  const output = execFileSync('supabase', ['status', '-o', 'env'], { encoding: 'utf8' })
  return Object.fromEntries(
    output
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=')
        const key = line.slice(0, index)
        let value = line.slice(index + 1).trim()
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
        return [key, value]
      }),
  )
}

const localEnv = parseSupabaseEnv()
const supabaseUrl = localEnv.API_URL ?? localEnv.SUPABASE_URL
const anonKey = localEnv.ANON_KEY
const serviceRoleKey = localEnv.SERVICE_ROLE_KEY

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error('Local Supabase status did not expose API_URL, ANON_KEY, and SERVICE_ROLE_KEY.')
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function userClient() {
  return createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function createAuthUser(email, firstName, lastName) {
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: 'Test-password-123!',
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  })
  assert.ifError(error)
  assert.ok(data.user?.id)
  return data.user.id
}

async function signIn(email) {
  const client = userClient()
  const { error } = await client.auth.signInWithPassword({
    email,
    password: 'Test-password-123!',
  })
  assert.ifError(error)
  return client
}

async function insertOne(table, row) {
  const { data, error } = await adminClient.from(table).insert(row).select().single()
  assert.ifError(error)
  return data
}

const fixture = {}

before(async () => {
  const suffix = Date.now().toString(36)
  const adminEmail = `admin-${suffix}@example.test`
  const userAEmail = `program-a-${suffix}@example.test`
  const userBEmail = `program-b-${suffix}@example.test`
  const pendingEmail = `pending-${suffix}@example.test`

  const adminId = await createAuthUser(adminEmail, 'Admin', 'Tester')
  const userAId = await createAuthUser(userAEmail, 'Program', 'Alpha')
  const userBId = await createAuthUser(userBEmail, 'Program', 'Beta')
  const pendingId = await createAuthUser(pendingEmail, 'Pending', 'Tester')

  let result = await adminClient
    .from('profiles')
    .update({ role: 'ADMIN', account_status: 'APPROVED' })
    .eq('id', adminId)
  assert.ifError(result.error)

  result = await adminClient
    .from('profiles')
    .update({ account_status: 'APPROVED' })
    .in('id', [userAId, userBId])
  assert.ifError(result.error)

  const programA = await insertOne('programs', { name: `Security Test Program A ${suffix}` })
  const programB = await insertOne('programs', { name: `Security Test Program B ${suffix}` })
  const schoolYear = await insertOne('school_years', {
    name: `Security Test ${suffix}`,
    start_date: '2026-09-01',
    end_date: '2027-06-30',
    active: true,
  })
  const calendarTypeA = await insertOne('calendar_types', {
    code: `SEC-A-${suffix}`,
    name: `Security Type A ${suffix}`,
    days_per_week: 5,
    day_length: 'FULL',
    active: true,
  })
  const calendarTypeB = await insertOne('calendar_types', {
    code: `SEC-B-${suffix}`,
    name: `Security Type B ${suffix}`,
    days_per_week: 4,
    day_length: 'FULL',
    active: true,
  })

  for (const [userId, programId] of [
    [userAId, programA.id],
    [userBId, programB.id],
  ]) {
    const { error } = await adminClient.from('program_memberships').insert({
      user_id: userId,
      program_id: programId,
      status: 'APPROVED',
      approved_by: adminId,
      approved_at: new Date().toISOString(),
    })
    assert.ifError(error)
  }

  const calendarA = await insertOne('calendars', {
    program_id: programA.id,
    school_year_id: schoolYear.id,
    calendar_type_id: calendarTypeA.id,
    start_date: '2026-09-01',
    end_date: '2026-09-03',
    created_by: userAId,
  })
  const calendarB = await insertOne('calendars', {
    program_id: programB.id,
    school_year_id: schoolYear.id,
    calendar_type_id: calendarTypeA.id,
    start_date: '2026-09-01',
    end_date: '2026-09-03',
    created_by: userBId,
  })

  const { error: dayError } = await adminClient.from('calendar_days').insert([
    { calendar_id: calendarA.id, date: '2026-09-01', in_session: true, notes: 'A-only day' },
    { calendar_id: calendarB.id, date: '2026-09-01', in_session: true, notes: 'B-only day' },
  ])
  assert.ifError(dayError)

  Object.assign(fixture, {
    adminEmail,
    userAEmail,
    userBEmail,
    pendingEmail,
    adminId,
    userAId,
    userBId,
    pendingId,
    programA,
    programB,
    schoolYear,
    calendarTypeA,
    calendarTypeB,
    calendarA,
    calendarB,
  })
})

test('Program A can only see Program A calendars', async () => {
  const client = await signIn(fixture.userAEmail)
  const { data, error } = await client.from('calendars').select('id, program_id').order('id')
  assert.ifError(error)
  assert.deepEqual(data.map((row) => row.id), [fixture.calendarA.id])
  assert.equal(data[0].program_id, fixture.programA.id)
})

test('Program B can only see Program B calendars', async () => {
  const client = await signIn(fixture.userBEmail)
  const { data, error } = await client.from('calendars').select('id, program_id').order('id')
  assert.ifError(error)
  assert.deepEqual(data.map((row) => row.id), [fixture.calendarB.id])
  assert.equal(data[0].program_id, fixture.programB.id)
})

test('Program A cannot fetch Program B calendar by id', async () => {
  const client = await signIn(fixture.userAEmail)
  const { data, error } = await client
    .from('calendars')
    .select('id')
    .eq('id', fixture.calendarB.id)
    .maybeSingle()
  assert.ifError(error)
  assert.equal(data, null)
})

test('calendar day rows are scoped to the approved program', async () => {
  const client = await signIn(fixture.userAEmail)
  const { data, error } = await client.from('calendar_days').select('calendar_id, notes')
  assert.ifError(error)
  assert.deepEqual(data, [{ calendar_id: fixture.calendarA.id, notes: 'A-only day' }])
})

test('pending users cannot see program calendar data', async () => {
  const client = await signIn(fixture.pendingEmail)
  const { data, error } = await client.from('calendars').select('id')
  assert.ifError(error)
  assert.deepEqual(data, [])
})

test('program users cannot read the audit log', async () => {
  const client = await signIn(fixture.userAEmail)
  const { data, error } = await client.from('audit_log').select('id')
  assert.ok(error, 'Expected audit_log read to be denied for a program user')
  assert.equal(data, null)
})

test('admins can see calendars across programs', async () => {
  const client = await signIn(fixture.adminEmail)
  const { data, error } = await client.from('calendars').select('id, program_id')
  assert.ifError(error)
  const ids = new Set(data.map((row) => row.id))
  assert.ok(ids.has(fixture.calendarA.id))
  assert.ok(ids.has(fixture.calendarB.id))
})

test('program users cannot directly insert raw calendar rows', async () => {
  const client = await signIn(fixture.userAEmail)
  const { data, error } = await client
    .from('calendars')
    .insert({
      program_id: fixture.programA.id,
      school_year_id: fixture.schoolYear.id,
      calendar_type_id: fixture.calendarTypeB.id,
      start_date: '2026-09-07',
      end_date: '2026-09-11',
      created_by: fixture.userAId,
    })
    .select('id')
  assert.ok(error, 'Expected raw calendar insert to be denied')
  assert.equal(data, null)
})

test('Program A cannot mutate Program B calendar', async () => {
  const client = await signIn(fixture.userAEmail)
  await client
    .from('calendars')
    .update({ review_notes: 'unauthorized mutation' })
    .eq('id', fixture.calendarB.id)

  const { data, error } = await adminClient
    .from('calendars')
    .select('review_notes')
    .eq('id', fixture.calendarB.id)
    .single()
  assert.ifError(error)
  assert.notEqual(data.review_notes, 'unauthorized mutation')
})
