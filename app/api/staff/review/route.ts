import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, isBootstrapAdminEmail } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
  if (!user.email_confirmed_at) return NextResponse.json({ error: 'Confirm your email before reviewing applications.' }, { status: 403 })

  let body: { applicationId?: unknown; decision?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }) }
  if (typeof body.applicationId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.applicationId) || !['approved', 'rejected'].includes(String(body.decision))) {
    return NextResponse.json({ error: 'Check the review decision.' }, { status: 400 })
  }

  try {
    const admin = createAdminClient()
    const { data: application } = await admin.from('healthconnect_staff_applications').select('id, organization_id').eq('id', body.applicationId).eq('status', 'pending').maybeSingle()
    if (!application) return NextResponse.json({ error: 'That pending application was not found.' }, { status: 404 })
    if (!application.organization_id && !isBootstrapAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Only the approved bootstrap administrator can review a new-facility application.' }, { status: 403 })
    }
    const { data, error } = await admin.rpc('healthconnect_review_staff_application', {
      p_actor_id: user.id,
      p_application_id: body.applicationId,
      p_decision: body.decision,
    })
    if (error) return NextResponse.json({ error: 'You cannot review this application, or it is no longer pending.' }, { status: 403 })
    return NextResponse.json({ organizationId: data }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'Review is temporarily unavailable.' }, { status: 503 })
  }
}
