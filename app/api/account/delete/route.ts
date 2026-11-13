import { del, list } from '@vercel/blob'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })

  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) return NextResponse.json({ error: 'Account deletion is temporarily unavailable.' }, { status: 503 })

  try {
    let cursor: string | undefined
    do {
      const page = await list({ prefix: `users/${user.id}/`, limit: 1000, cursor })
      if (page.blobs.length) await del(page.blobs.map(blob => blob.url))
      cursor = page.hasMore ? page.cursor : undefined
    } while (cursor)

    const admin = createAdminClient(process.env.SUPABASE_URL!, secret, { auth: { autoRefreshToken: false, persistSession: false } })
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) return NextResponse.json({ error: 'Account deletion is temporarily unavailable.' }, { status: 503 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Account deletion is temporarily unavailable. Your account is unchanged.' }, { status: 503 })
  }
}
