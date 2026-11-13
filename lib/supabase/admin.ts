import 'server-only'
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase server credentials are unavailable')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export function isBootstrapAdminEmail(email: string | undefined) {
  if (!email) return false
  const configured = (process.env.HEALTHCONNECT_BOOTSTRAP_ADMIN_EMAILS ?? '')
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean)
  return configured.includes(email.trim().toLowerCase())
}
