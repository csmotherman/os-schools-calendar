import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const migrationsDir = resolve(process.cwd(), 'supabase/migrations')
const entries = (await readdir(migrationsDir))
  .filter((name) => /^\d{3}_.+\.sql$/.test(name))
  .sort()

if (entries.length === 0) {
  throw new Error('No numbered Supabase migrations were found.')
}

const numbers = entries.map((name) => Number(name.slice(0, 3)))
const duplicates = numbers.filter((number, index) => numbers.indexOf(number) !== index)
if (duplicates.length > 0) {
  throw new Error(`Duplicate migration numbers found: ${[...new Set(duplicates)].join(', ')}`)
}

const expected = Array.from({ length: Math.max(...numbers) }, (_, index) => index + 1)
const missing = expected.filter((number) => !numbers.includes(number))
if (missing.length > 0) {
  throw new Error(`Migration sequence has gaps: ${missing.map((number) => String(number).padStart(3, '0')).join(', ')}`)
}

const latest = String(Math.max(...numbers)).padStart(3, '0')
console.log(`Migration sequence verified: 001-${latest} (${entries.length} files).`)
