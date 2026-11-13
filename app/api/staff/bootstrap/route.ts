import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, isBootstrapAdminEmail } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

function text(value: unknown, max: number, required = false) {
  if (typeof value !== 'string') return required ? null : ''
  const clean = value.trim()
  return clean.length <= max && (!required || clean.length > 0) ? clean : null
}

function coordinate(value: unknown, min: number, max: number) {
  if (value === '' || value === null || value === undefined) return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : Number.NaN
}

function website(value: string | null) {
  if (value === null || !value) return value
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
  if (!user.email_confirmed_at || !isBootstrapAdminEmail(user.email)) {
    return NextResponse.json({ error: 'This account is not authorized to register a facility.' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }) }
  const name = text(body.name, 160, true)
  const address = text(body.address, 300)
  const phone = text(body.phone, 40)
  const websiteUrl = website(text(body.website, 500))
  const latitude = coordinate(body.latitude, -90, 90)
  const longitude = coordinate(body.longitude, -180, 180)
  if (!name || address === null || phone === null || websiteUrl === null || Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return NextResponse.json({ error: 'Check the facility details and coordinates.' }, { status: 400 })
  }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin.rpc('healthconnect_bootstrap_organization', {
      p_actor_id: user.id,
      p_name: name,
      p_address: address,
      p_phone: phone,
      p_website: websiteUrl,
      p_latitude: latitude,
      p_longitude: longitude,
    })
    if (error || !data) return NextResponse.json({ error: 'The facility could not be registered.' }, { status: 409 })
    return NextResponse.json({ organizationId: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Facility registration is temporarily unavailable.' }, { status: 503 })
  }
}
