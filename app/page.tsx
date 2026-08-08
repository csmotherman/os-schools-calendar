import { redirect } from 'next/navigation'
import { getAccessState } from '@/lib/auth/access'

export default async function HomePage() {
  const { user } = await getAccessState()

  redirect(user ? '/dashboard' : '/login')
}
