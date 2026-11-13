import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, isBootstrapAdminEmail } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const maxLength = { name: 160, address: 300, phone: 40, website: 500, credential: 100, message: 1200 }
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
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch { return null }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
  try {
    const query = isBootstrapAdminEmail(user.email)
      ? createAdminClient().from('healthconnect_staff_applications').select('id, user_id, applicant_name, applicant_email, organization_id, organization_name, requested_role, credential_reference, applicant_message, status, created_at').eq('status', 'pending').order('created_at', { ascending: true })
      : supabase.from('healthconnect_staff_applications').select('id, user_id, applicant_name, applicant_email, organization_id, organization_name, requested_role, credential_reference, applicant_message, status, created_at').order('created_at', { ascending: false })
    const { data, error } = await query
    if (error) return NextResponse.json({ error: 'Applications are temporarily unavailable.' }, { status: 503 })
    return NextResponse.json({ applications: data ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'Applications are temporarily unavailable.' }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
  if (!user.email_confirmed_at || !user.email) return NextResponse.json({ error: 'Confirm your email before applying.' }, { status: 403 })

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }) }
  const requestedRole = body.requestedRole === 'doctor' || body.requestedRole === 'hospital_admin' ? body.requestedRole : null
  const organizationId = text(body.organizationId, 64)
  const credential = text(body.credentialReference, maxLength.credential)
  const applicantMessage = text(body.applicantMessage, maxLength.message)
  if (!requestedRole || organizationId === null || credential === null || applicantMessage === null) {
    return NextResponse.json({ error: 'Check the application details.' }, { status: 400 })
  }

  let organization: { id: string; name: string; address: string; phone: string; website_url: string; latitude: number | null; longitude: number | null } | null = null
  if (organizationId) {
    const { data } = await supabase.from('healthconnect_organizations').select('id, name, address, phone, website_url, latitude, longitude').eq('id', organizationId).eq('is_active', true).maybeSingle()
    organization = data
    if (!organization) return NextResponse.json({ error: 'Choose an active facility.' }, { status: 400 })
  } else if (requestedRole !== 'hospital_admin') {
    return NextResponse.json({ error: 'Doctors need to select an existing facility.' }, { status: 400 })
  }

  const organizationName = organization?.name ?? text(body.organizationName, maxLength.name, true)
  const organizationAddress = organization?.address ?? text(body.organizationAddress, maxLength.address)
  const organizationPhone = organization?.phone ?? text(body.organizationPhone, maxLength.phone)
  const organizationWebsite = organization?.website_url ?? website(text(body.organizationWebsite, maxLength.website))
  const latitude = organization?.latitude ?? coordinate(body.latitude, -90, 90)
  const longitude = organization?.longitude ?? coordinate(body.longitude, -180, 180)
  if (!organizationName || organizationAddress === null || organizationPhone === null || organizationWebsite === null || Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return NextResponse.json({ error: 'Check the facility details and coordinates.' }, { status: 400 })
  }

  try {
    const admin = createAdminClient()
    const { data: pending, error: pendingError } = await admin.from('healthconnect_staff_applications').select('id').eq('user_id', user.id).eq('status', 'pending').limit(1).maybeSingle()
    if (pendingError) return NextResponse.json({ error: 'Applications are temporarily unavailable.' }, { status: 503 })
    if (pending) return NextResponse.json({ error: 'You already have an application awaiting review.' }, { status: 409 })

    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
    const applicantName = (profile?.full_name || String(user.user_metadata?.full_name ?? '')).trim().slice(0, 160)
    const { data, error } = await admin.from('healthconnect_staff_applications').insert({
      user_id: user.id,
      applicant_name: applicantName,
      applicant_email: user.email,
      organization_id: organization?.id ?? null,
      organization_name: organizationName,
      organization_address: organizationAddress,
      organization_phone: organizationPhone,
      organization_website: organizationWebsite,
      organization_latitude: latitude,
      organization_longitude: longitude,
      requested_role: requestedRole,
      credential_reference: credential,
      applicant_message: applicantMessage,
    }).select('id, status, created_at').single()
    if (error || !data) return NextResponse.json({ error: 'The application could not be submitted.' }, { status: 409 })
    return NextResponse.json({ application: data }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'Application submission is temporarily unavailable.' }, { status: 503 })
  }
}
