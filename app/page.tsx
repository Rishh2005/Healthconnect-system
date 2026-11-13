import HealthConnectPortal from '@/app/components/healthconnect-portal'
import HealthConnectAuth from '@/app/components/healthconnect-auth'
import { createAdminClient, isBootstrapAdminEmail } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const sections = ['overview', 'appointments', 'records', 'symptoms', 'guide', 'emergency', 'profile', 'hospitals', 'messages', 'staff'] as const
const appointmentColumns = 'id, user_id, healthconnect_organization_id, patient_name, patient_phone, department, requested_at, notes, status, created_at'
type StaffApplication = { id: string; user_id: string; applicant_name: string; applicant_email: string; organization_id: string | null; organization_name: string; requested_role: string; credential_reference: string; applicant_message: string; status: string; created_at: string }

export default async function HomePage({ searchParams }: { searchParams: Promise<{ panel?: string }> }) {
  const { panel } = await searchParams
  const initialSection = sections.includes(panel as (typeof sections)[number]) ? panel as (typeof sections)[number] : 'overview'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <HealthConnectAuth />

  const [membershipResult, profileResult, organizationsResult, ownAppointmentsResult, recordsResult, symptomsResult, emergencyResult, grantsResult, conversationsResult, messagesResult] = await Promise.all([
    supabase.from('healthconnect_memberships').select('organization_id, role, status').eq('user_id', user.id).eq('status', 'approved'),
    supabase.from('profiles').select('id, full_name, phone, birth_date, blood_type, emergency_contact_name, emergency_contact_phone, role').eq('id', user.id).maybeSingle(),
    supabase.from('healthconnect_organizations').select('id, name, address, phone, website_url, latitude, longitude').eq('is_active', true).order('name'),
    supabase.from('appointments').select(appointmentColumns).eq('user_id', user.id).order('requested_at', { ascending: true }),
    supabase.from('health_records').select('id, user_id, title, category, notes, storage_path, mime_type, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('symptom_entries').select('id, symptoms, severity, ai_summary, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('emergency_requests').select('id, callback_phone, location_text, details, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
    supabase.from('healthconnect_record_grants').select('id, record_id, patient_id, organization_id, created_at').order('created_at', { ascending: false }),
    supabase.from('healthconnect_conversations').select('id, organization_id, patient_id, subject, created_at, closed_at').order('created_at', { ascending: false }).limit(100),
    supabase.from('healthconnect_messages').select('id, conversation_id, sender_id, body, created_at').order('created_at', { ascending: true }).limit(500),
  ])

  const memberships = membershipResult.data ?? []
  const organizationIds = memberships.map(item => item.organization_id)
  const organizationMap = new Map((organizationsResult.data ?? []).map(organization => [organization.id, organization]))
  const mappedMemberships = memberships.map(membership => ({
    ...membership,
    organization: organizationMap.get(membership.organization_id) ?? { id: membership.organization_id, name: 'HealthConnect facility', address: '', phone: '', website_url: '', latitude: null, longitude: null },
  }))
  const staffAppointmentsResult = organizationIds.length
    ? await supabase.from('appointments').select(appointmentColumns).in('healthconnect_organization_id', organizationIds).order('requested_at', { ascending: true })
    : { data: [] }
  const appointments = Array.from(new Map([...(ownAppointmentsResult.data ?? []), ...(staffAppointmentsResult.data ?? [])].map(item => [item.id, item])).values())
    .sort((a, b) => a.requested_at.localeCompare(b.requested_at))
  const sharedRecordsResult = organizationIds.length
    ? await supabase.from('health_records').select('id, user_id, title, category, notes, created_at').neq('user_id', user.id).order('created_at', { ascending: false })
    : { data: [] }

  let staffApplicationsResult: { data: unknown[] | null } = { data: [] }
  if (isBootstrapAdminEmail(user.email)) {
    const admin = createAdminClient()
    staffApplicationsResult = await admin.from('healthconnect_staff_applications').select('id, user_id, applicant_name, applicant_email, organization_id, organization_name, requested_role, credential_reference, applicant_message, status, created_at').eq('status', 'pending').order('created_at', { ascending: true })
  } else {
    staffApplicationsResult = await supabase.from('healthconnect_staff_applications').select('id, user_id, applicant_name, applicant_email, organization_id, organization_name, requested_role, credential_reference, applicant_message, status, created_at').order('created_at', { ascending: false })
  }

  return <HealthConnectPortal
    key={user.id}
    initialSection={initialSection}
    user={{ id: user.id, email: user.email ?? '' }}
    initialProfile={profileResult.data}
    initialAppointments={appointments}
    initialRecords={recordsResult.data ?? []}
    initialSharedRecords={sharedRecordsResult.data ?? []}
    initialSymptoms={symptomsResult.data ?? []}
    initialEmergencyRequests={emergencyResult.data ?? []}
    organizations={organizationsResult.data ?? []}
    memberships={mappedMemberships}
    applications={(staffApplicationsResult.data ?? []) as StaffApplication[]}
    recordGrants={grantsResult.data ?? []}
    conversations={conversationsResult.data ?? []}
    messages={messagesResult.data ?? []}
    bootstrapAdmin={isBootstrapAdminEmail(user.email)}
  />
}
