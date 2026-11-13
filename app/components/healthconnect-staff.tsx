"use client"

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Building2, CalendarDays, Check, ClipboardCheck, MapPin, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Organization = { id: string; name: string; address: string; phone: string; website_url: string; latitude: number | null; longitude: number | null }
type Membership = { organization_id: string; role: 'doctor' | 'hospital_admin'; organization: Organization }
type Application = { id: string; user_id: string; applicant_name: string; applicant_email: string; organization_id: string | null; organization_name: string; requested_role: string; credential_reference: string; applicant_message: string; status: string; created_at: string }
type Appointment = { id: string; user_id: string; healthconnect_organization_id: string | null; patient_name: string; patient_phone: string; department: string; requested_at: string; notes: string; status: string }
type SharedRecord = { id: string; user_id: string; title: string; category: string; notes: string; created_at: string }
type Props = { userId: string; email: string; organizations: Organization[]; memberships: Membership[]; applications: Application[]; appointments: Appointment[]; sharedRecords: SharedRecord[]; bootstrapAdmin: boolean }

export default function HealthConnectStaff({ userId, email, organizations, memberships, applications: initialApplications, appointments: initialAppointments, sharedRecords, bootstrapAdmin }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [applications, setApplications] = useState(initialApplications)
  const [organizationId, setOrganizationId] = useState('')
  const [role, setRole] = useState<'doctor' | 'hospital_admin'>('doctor')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [credential, setCredential] = useState('')
  const [message, setMessage] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [decisionBusy, setDecisionBusy] = useState('')
  const [appointmentRows, setAppointmentRows] = useState(initialAppointments)

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setNotice('')
    const response = await fetch('/api/staff/applications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestedRole: role, organizationId: organizationId || null, organizationName: name, organizationAddress: address, organizationPhone: phone, organizationWebsite: website, latitude, longitude, credentialReference: credential, applicantMessage: message }),
    })
    const result = await response.json().catch(() => ({}))
    setBusy(false)
    if (!response.ok) { setNotice(result.error || 'Application could not be submitted.'); return }
    setNotice('Application submitted for review. You will see an update here after approval.')
    router.refresh()
  }

  async function bootstrapOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setNotice('')
    const response = await fetch('/api/staff/bootstrap', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, address, phone, website, latitude, longitude }),
    })
    const result = await response.json().catch(() => ({}))
    setBusy(false)
    if (!response.ok) { setNotice(result.error || 'Facility could not be registered.'); return }
    setNotice('Facility registered and administrator access enabled.')
    router.refresh()
  }

  async function review(application: Application, decision: 'approved' | 'rejected') {
    setDecisionBusy(application.id)
    const response = await fetch('/api/staff/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ applicationId: application.id, decision }) })
    const result = await response.json().catch(() => ({}))
    setDecisionBusy('')
    if (!response.ok) { setNotice(result.error || 'Application could not be reviewed.'); return }
    setApplications(current => current.filter(item => item.id !== application.id))
    setNotice(decision === 'approved' ? 'Staff access approved.' : 'Application declined.')
    router.refresh()
  }

  async function updateStatus(appointment: Appointment, status: string) {
    const previous = appointmentRows
    setAppointmentRows(current => current.map(item => item.id === appointment.id ? { ...item, status } : item))
    const { error } = await supabase.from('appointments').update({ status }).eq('id', appointment.id).eq('healthconnect_organization_id', appointment.healthconnect_organization_id)
    if (error) { setAppointmentRows(previous); setNotice('Appointment status could not be updated.') }
  }

  if (!memberships.length) {
    const ownApplications = applications.filter(item => item.user_id === userId)
    return <>
      <div className="hcv-page-header"><div><div className="hcv-eyebrow">HEALTHCARE PROFESSIONALS</div><h1>Join a care team</h1><p>Staff access is approved by a hospital administrator. Patients remain in control of any record sharing.</p></div></div>
      {bootstrapAdmin && <section className="hcv-staff-bootstrap"><div className="hcv-staff-section-icon"><ShieldCheck size={18}/></div><div className="hcv-staff-section-copy"><div className="hcv-eyebrow">BOOTSTRAP ADMINISTRATOR</div><h2>Register your first facility</h2><p>This account is on the server-controlled administrator allowlist. Add the facility details to create its first approved administrator membership.</p></div><FacilityForm name={name} setName={setName} address={address} setAddress={setAddress} phone={phone} setPhone={setPhone} website={website} setWebsite={setWebsite} latitude={latitude} setLatitude={setLatitude} longitude={longitude} setLongitude={setLongitude} busy={busy} submit={bootstrapOrganization} submitLabel="Register facility"/></section>}
      <section className="hcv-card hcv-staff-apply"><div className="hcv-card-heading"><div><div className="hcv-eyebrow">VERIFIED STAFF ACCESS</div><h2>Apply to a facility</h2></div><span className="hcv-staff-section-icon"><Building2 size={18}/></span></div><p className="hcv-section-intro">A facility administrator reviews clinician requests. Patient appointments are visible only to approved members of the assigned facility.</p><form className="hcv-form" onSubmit={submitApplication}>
        <div className="hcv-form-row"><label>Requested access<select value={role} onChange={event => setRole(event.target.value as 'doctor' | 'hospital_admin')}><option value="doctor">Clinician / doctor</option><option value="hospital_admin">Hospital administrator</option></select></label><label>Existing facility<select value={organizationId} onChange={event => setOrganizationId(event.target.value)}><option value="">{role === 'hospital_admin' ? 'Apply to register a new facility' : 'Select a facility'}</option>{organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label></div>
        {role === 'hospital_admin' && !organizationId && <FacilityFormFields name={name} setName={setName} address={address} setAddress={setAddress} phone={phone} setPhone={setPhone} website={website} setWebsite={setWebsite} latitude={latitude} setLatitude={setLatitude} longitude={longitude} setLongitude={setLongitude}/>}
        <label>License or credential reference <span className="hcv-optional">For manual review</span><input maxLength={100} value={credential} onChange={event => setCredential(event.target.value)} placeholder="Professional registration reference"/></label>
        <label>Message for the administrator <span className="hcv-optional">Optional</span><textarea rows={3} maxLength={1200} value={message} onChange={event => setMessage(event.target.value)} placeholder="Share your role and connection to this facility"/></label>
        <button className="hcv-primary-button" disabled={busy || (role === 'doctor' && !organizationId)}>{busy ? 'Submitting…' : 'Submit for approval'}<ArrowRight size={15}/></button>
      </form></section>
      {ownApplications.length > 0 && <section className="hcv-card hcv-full-card"><div className="hcv-card-heading"><div><div className="hcv-eyebrow">APPLICATION STATUS</div><h2>Your requests</h2></div></div><div className="hcv-list">{ownApplications.map(application => <div className="hcv-appointment-row" key={application.id}><span className="hcv-record-icon"><ClipboardCheck size={16}/></span><div className="hcv-row-copy"><b>{application.organization_name}</b><small>{application.requested_role.replace('_', ' ')} · {new Date(application.created_at).toLocaleDateString()}</small></div><span className={`hcv-status ${application.status}`}>{application.status}</span></div>)}</div></section>}
      {notice && <p className="hcv-upload-status" role="status">{notice}</p>}
    </>
  }

  const organizationIds = new Set(memberships.map(item => item.organization_id))
  const pendingApplications = applications.filter(item => item.status === 'pending' && ((item.organization_id && organizationIds.has(item.organization_id) && memberships.some(member => member.organization_id === item.organization_id && member.role === 'hospital_admin')) || (!item.organization_id && bootstrapAdmin)))
  return <>
    <div className="hcv-page-header"><div><div className="hcv-eyebrow">VERIFIED CARE TEAM</div><h1>Hospital workspace</h1><p>Manage visits assigned to your facility. Patient records appear below only when the patient has shared them.</p></div><span className="hcv-secure-pill"><ShieldCheck size={14}/> Organization-scoped access</span></div>
    <div className="hcv-staff-org-grid">{memberships.map(member => <article className="hcv-staff-org-card" key={member.organization_id}><span className="hcv-staff-section-icon"><Building2 size={17}/></span><div><b>{member.organization.name}</b><small>{member.organization.address || 'Address not listed'}</small></div><span className="hcv-status confirmed">{member.role === 'hospital_admin' ? 'Admin' : 'Clinician'}</span></article>)}</div>
    <section className="hcv-card hcv-full-card"><div className="hcv-card-heading"><div><div className="hcv-eyebrow">FACILITY SCHEDULE</div><h2>Assigned appointment requests</h2></div><span className="hcv-count-pill">{appointmentRows.length}</span></div>{appointmentRows.length ? <div className="hcv-list">{appointmentRows.map(appointment => <article className="hcv-staff-appointment" key={appointment.id}><span className="hcv-staff-section-icon"><CalendarDays size={16}/></span><div className="hcv-row-copy"><b>{appointment.patient_name || 'Patient'}</b><small>{appointment.department} · {new Date(appointment.requested_at).toLocaleString()}</small><small>{appointment.patient_phone || 'No phone provided'}{appointment.notes ? ` · ${appointment.notes}` : ''}</small></div><label className="sr-only" htmlFor={`appointment-${appointment.id}`}>Appointment status</label><select id={`appointment-${appointment.id}`} value={appointment.status} onChange={event => void updateStatus(appointment, event.target.value)}><option value="requested">Requested</option><option value="confirmed">Confirmed</option><option value="cancelled">Cancelled</option></select></article>)}</div> : <div className="hcv-map-empty"><ClipboardCheck size={18}/><b>No facility requests yet</b><p>New appointment requests for your organization will appear here.</p></div>}</section>
    {pendingApplications.length > 0 && <section className="hcv-card hcv-full-card"><div className="hcv-card-heading"><div><div className="hcv-eyebrow">STAFF APPROVAL</div><h2>Applications to review</h2></div><span className="hcv-count-pill">{pendingApplications.length} pending</span></div><div className="hcv-staff-applications">{pendingApplications.map(application => <article className="hcv-staff-application" key={application.id}><div><b>{application.applicant_name || application.applicant_email}</b><small>{application.applicant_email} · {application.requested_role.replace('_', ' ')}</small>{application.credential_reference && <small>Credential reference: {application.credential_reference}</small>}{application.applicant_message && <p>{application.applicant_message}</p>}</div><div className="hcv-staff-review-actions"><button className="hcv-soft-button" disabled={decisionBusy === application.id} onClick={() => void review(application, 'rejected')}>Decline</button><button className="hcv-primary-button" disabled={decisionBusy === application.id} onClick={() => void review(application, 'approved')}>{decisionBusy === application.id ? 'Saving…' : 'Approve'}<Check size={14}/></button></div></article>)}</div></section>}
    <section className="hcv-card hcv-full-card"><div className="hcv-card-heading"><div><div className="hcv-eyebrow">PATIENT-CONTROLLED ACCESS</div><h2>Records shared with your facility</h2></div><span className="hcv-count-pill">{sharedRecords.length} shared</span></div>{sharedRecords.length ? <div className="hcv-record-list">{sharedRecords.map(record => <article className="hcv-record-row" key={record.id}><span className="hcv-record-icon"><ShieldCheck size={16}/></span><div className="hcv-row-copy"><b>{record.title}</b><small>{record.category} · Shared patient ID {record.user_id.slice(0, 8)} · {new Date(record.created_at).toLocaleDateString()}</small>{record.notes && <p>{record.notes}</p>}</div><a className="hcv-soft-button" href={`/api/documents/${record.id}`}>Open securely <ArrowRight size={13}/></a></article>)}</div> : <div className="hcv-map-empty"><ShieldCheck size={18}/><b>No patient-shared records</b><p>Patients choose which documents to share and can revoke access at any time.</p></div>}</section>
    {notice && <p className="hcv-upload-status" role="status">{notice}</p>}
  </>
}

function FacilityFormFields({ name, setName, address, setAddress, phone, setPhone, website, setWebsite, latitude, setLatitude, longitude, setLongitude }: { name: string; setName: (value: string) => void; address: string; setAddress: (value: string) => void; phone: string; setPhone: (value: string) => void; website: string; setWebsite: (value: string) => void; latitude: string; setLatitude: (value: string) => void; longitude: string; setLongitude: (value: string) => void }) {
  return <><div className="hcv-form-row"><label>Facility name<input required maxLength={160} value={name} onChange={event => setName(event.target.value)} placeholder="Hospital or clinic name"/></label><label>Phone<input maxLength={40} value={phone} onChange={event => setPhone(event.target.value)} placeholder="Main contact number"/></label></div><label>Address<input maxLength={300} value={address} onChange={event => setAddress(event.target.value)} placeholder="Street, city, region"/></label><label>Website<input type="url" maxLength={500} value={website} onChange={event => setWebsite(event.target.value)} placeholder="https://hospital.example"/></label><div className="hcv-form-row"><label>Latitude <span className="hcv-optional">Optional</span><input type="number" step="any" min="-90" max="90" value={latitude} onChange={event => setLatitude(event.target.value)} placeholder="37.7749"/></label><label>Longitude <span className="hcv-optional">Optional</span><input type="number" step="any" min="-180" max="180" value={longitude} onChange={event => setLongitude(event.target.value)} placeholder="-122.4194"/></label></div><p className="hcv-field-hint"><MapPin size={13}/> Add coordinates to display the facility on patient maps.</p></>
}
function FacilityForm(props: Parameters<typeof FacilityFormFields>[0] & { busy: boolean; submit: (event: FormEvent<HTMLFormElement>) => void; submitLabel: string }) {
  return <form className="hcv-form" onSubmit={props.submit}><FacilityFormFields {...props}/><button className="hcv-primary-button" disabled={props.busy}>{props.busy ? 'Saving…' : props.submitLabel}<ArrowRight size={15}/></button></form>
}
