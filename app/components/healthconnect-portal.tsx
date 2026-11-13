"use client"

import { FormEvent, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, AlertTriangle, ArrowDownToLine, ArrowLeft, ArrowRight, Building2, CalendarDays, Check, ChevronDown, FilePlus2, FileText, HeartPulse, Home, LogOut, MapPin, MessageCircle, Mic, Paperclip, Phone, Plus, Send, Settings, ShieldCheck, Sparkles, Stethoscope, Trash2, UserRound, Volume2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import HealthConnectHospitalMap from './healthconnect-hospital-map'
import HealthConnectMessages from './healthconnect-messages'
import HealthConnectRecordAccess from './healthconnect-record-access'
import HealthConnectStaff from './healthconnect-staff'

type Section = 'overview' | 'appointments' | 'records' | 'symptoms' | 'guide' | 'emergency' | 'profile' | 'hospitals' | 'messages' | 'staff'
type PortalUser = { id: string; email: string }
type Profile = { id: string; full_name: string; phone: string; birth_date: string | null; blood_type: string; emergency_contact_name: string; emergency_contact_phone: string; role: string }
type Organization = { id: string; name: string; address: string; phone: string; website_url: string; latitude: number | null; longitude: number | null }
type Membership = { organization_id: string; role: 'doctor' | 'hospital_admin'; status: string; organization: Organization }
type StaffApplication = { id: string; user_id: string; applicant_name: string; applicant_email: string; organization_id: string | null; organization_name: string; requested_role: string; credential_reference: string; applicant_message: string; status: string; created_at: string }
type Appointment = { id: string; user_id: string; healthconnect_organization_id: string | null; patient_name: string; patient_phone: string; department: string; requested_at: string; notes: string; status: string; created_at: string }
type HealthRecord = { id: string; title: string; category: string; notes: string; storage_path: string | null; mime_type: string | null; created_at: string }
type SharedRecord = { id: string; user_id: string; title: string; category: string; notes: string; created_at: string }
type RecordGrant = { id: string; record_id: string; patient_id: string; organization_id: string; created_at: string }
type Conversation = { id: string; organization_id: string; patient_id: string; subject: string; created_at: string; closed_at: string | null }
type PortalMessage = { id: string; conversation_id: string; sender_id: string; body: string; created_at: string }
type SymptomEntry = { id: string; symptoms: string; severity: number; ai_summary: string; created_at: string }
type EmergencyRequest = { id: string; callback_phone: string; location_text: string; details: string; status: string; created_at: string }
type ChatMessage = { role: 'user' | 'assistant'; content: string }
type Recognition = { lang: string; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void; stop: () => void }

type Props = { user: PortalUser; initialSection: Section; initialProfile: Profile | null; initialAppointments: Appointment[]; initialRecords: HealthRecord[]; initialSharedRecords: SharedRecord[]; initialSymptoms: SymptomEntry[]; initialEmergencyRequests: EmergencyRequest[]; organizations: Organization[]; memberships: Membership[]; applications: StaffApplication[]; recordGrants: RecordGrant[]; conversations: Conversation[]; messages: PortalMessage[]; bootstrapAdmin: boolean }

const navigation = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'appointments', label: 'Appointments', icon: CalendarDays },
  { id: 'records', label: 'Health records', icon: FileText },
  { id: 'hospitals', label: 'Find hospitals', icon: MapPin },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
  { id: 'staff', label: 'Hospital workspace', icon: Building2 },
  { id: 'symptoms', label: 'Symptom tracker', icon: Activity },
  { id: 'guide', label: 'AI care guide', icon: Sparkles },
  { id: 'emergency', label: 'Emergency support', icon: Phone },
] as const

export default function HealthConnectPortal({ user, initialSection, initialProfile, initialAppointments, initialRecords, initialSharedRecords, initialSymptoms, initialEmergencyRequests, organizations, memberships, applications, recordGrants, conversations, messages, bootstrapAdmin }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [active, setActive] = useState<Section>(initialSection)
  const [profile, setProfile] = useState<Profile | null>(initialProfile)
  const [appointments, setAppointments] = useState(initialAppointments)
  const [records, setRecords] = useState(initialRecords)
  const [symptoms, setSymptoms] = useState(initialSymptoms)
  const [emergencyRequests, setEmergencyRequests] = useState(initialEmergencyRequests)
  const [toast, setToast] = useState('')
  const [busy, setBusy] = useState(false)
  const [appointmentOpen, setAppointmentOpen] = useState(false)
  const [department, setDepartment] = useState('Primary care')
  const [appointmentDate, setAppointmentDate] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10))
  const [appointmentTime, setAppointmentTime] = useState('10:00')
  const [appointmentNotes, setAppointmentNotes] = useState('')
  const [appointmentOrganizationId, setAppointmentOrganizationId] = useState('')
  const [appointmentPatientName, setAppointmentPatientName] = useState(initialProfile?.full_name ?? '')
  const [appointmentPatientPhone, setAppointmentPatientPhone] = useState(initialProfile?.phone ?? '')
  const [messageOrganizationId, setMessageOrganizationId] = useState<string | null>(null)
  const [symptomText, setSymptomText] = useState('')
  const [severity, setSeverity] = useState(4)
  const [profileDraft, setProfileDraft] = useState(() => ({ full_name: initialProfile?.full_name ?? '', phone: initialProfile?.phone ?? '', birth_date: initialProfile?.birth_date ?? '', blood_type: initialProfile?.blood_type ?? '', emergency_contact_name: initialProfile?.emergency_contact_name ?? '', emergency_contact_phone: initialProfile?.emergency_contact_phone ?? '' }))
  const [callbackPhone, setCallbackPhone] = useState(initialProfile?.phone ?? '')
  const [locationText, setLocationText] = useState('')
  const [emergencyDetails, setEmergencyDetails] = useState('')
  const [chat, setChat] = useState<ChatMessage[]>([{ role: 'assistant', content: 'Hi, I’m your HealthConnect guide. I can help you prepare questions for a clinician, understand common health terms, and find your way around the portal. What would you like to know?' }])
  const [chatInput, setChatInput] = useState('')
  const [chatBusy, setChatBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const [uploadBusy, setUploadBusy] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  const recognition = useRef<Recognition | null>(null)

  function notify(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 3200)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.refresh()
  }

  async function createAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    const requestedAt = new Date(`${appointmentDate}T${appointmentTime}`).toISOString()
    const { data, error } = await supabase.from('appointments').insert({ user_id: user.id, department, requested_at: requestedAt, notes: appointmentNotes.trim(), healthconnect_organization_id: appointmentOrganizationId || null, patient_name: appointmentOrganizationId ? appointmentPatientName.trim() : '', patient_phone: appointmentOrganizationId ? appointmentPatientPhone.trim() : '' }).select('id, user_id, healthconnect_organization_id, patient_name, patient_phone, department, requested_at, notes, status, created_at').single()
    setBusy(false)
    if (error || !data) { notify('We could not save that appointment. Please try again.'); return }
    setAppointments(current => [...current, data as Appointment].sort((a, b) => a.requested_at.localeCompare(b.requested_at)))
    setAppointmentNotes('')
    setAppointmentOpen(false)
    notify('Appointment request saved')
  }

  async function cancelAppointment(id: string) {
    const { error } = await supabase.from('appointments').delete().eq('id', id)
    if (error) { notify('We could not cancel that request.'); return }
    setAppointments(current => current.filter(item => item.id !== id))
    notify('Appointment request removed')
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    const values = { ...profileDraft, birth_date: profileDraft.birth_date || null, updated_at: new Date().toISOString() }
    const { error } = await supabase.from('profiles').update(values).eq('id', user.id)
    setBusy(false)
    if (error) { notify('Your profile could not be saved. Please try again.'); return }
    setProfile(current => ({ ...(current ?? { id: user.id, role: 'patient' }), ...values, birth_date: values.birth_date }))
    notify('Profile details saved securely')
  }

  async function submitSymptoms(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = symptomText.trim()
    if (!text) return
    setBusy(true)
    let summary = 'Your note is saved. A care professional can help interpret symptoms in context.'
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'symptom', messages: [{ role: 'user', content: `Symptoms: ${text}\nSelf-rated severity: ${severity}/10.` }] }) })
      const result = await response.json()
      if (response.ok && typeof result.text === 'string') summary = result.text
    } catch { /* Keep the symptom entry even if AI guidance is temporarily unavailable. */ }
    const { data, error } = await supabase.from('symptom_entries').insert({ user_id: user.id, symptoms: text, severity, ai_summary: summary }).select('id, symptoms, severity, ai_summary, created_at').single()
    setBusy(false)
    if (error || !data) { notify('We could not save that symptom entry.'); return }
    setSymptoms(current => [data as SymptomEntry, ...current])
    setSymptomText('')
    notify('Symptom entry saved')
  }

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const file = (form.elements.namedItem('medical-file') as HTMLInputElement | null)?.files?.[0]
    if (!file) return
    setUploadBusy(true)
    setUploadMessage('Uploading privately and preparing a summary…')
    const body = new FormData()
    body.append('file', file)
    try {
      const response = await fetch('/api/documents/upload', { method: 'POST', body })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Upload failed')
      setRecords(current => [result.record as HealthRecord, ...current])
      form.reset()
      setUploadMessage('')
      notify('Private health document saved')
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : 'Upload failed. Please try again.')
    } finally { setUploadBusy(false) }
  }

  async function deleteRecord(record: HealthRecord) {
    const response = await fetch(`/api/documents/${record.id}`, { method: 'DELETE' })
    if (!response.ok) { notify('The document could not be deleted.'); return }
    setRecords(current => current.filter(item => item.id !== record.id))
    notify('Document deleted')
  }

  async function requestCallback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    const { data, error } = await supabase.from('emergency_requests').insert({ user_id: user.id, callback_phone: callbackPhone.trim(), location_text: locationText.trim(), details: emergencyDetails.trim() }).select('id, callback_phone, location_text, details, status, created_at').single()
    setBusy(false)
    if (error || !data) { notify('We could not save your callback request.'); return }
    setEmergencyRequests(current => [data as EmergencyRequest, ...current])
    setEmergencyDetails('')
    notify('Callback request saved. This does not dispatch an ambulance.')
  }

  async function sendGuide(message = chatInput) {
    const text = message.trim()
    if (!text || chatBusy) return
    const nextMessages = [...chat, { role: 'user' as const, content: text }]
    setChat(nextMessages)
    setChatInput('')
    setChatBusy(true)
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'guide', messages: nextMessages.slice(-12) }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'The guide is unavailable right now.')
      const answer = String(result.text)
      setChat(current => [...current, { role: 'assistant', content: answer }])
    } catch (error) {
      setChat(current => [...current, { role: 'assistant', content: error instanceof Error ? error.message : 'The guide is unavailable right now. Please try again.' }])
    } finally { setChatBusy(false) }
  }

  function startVoice() {
    const browser = window as Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }
    const Speech = browser.SpeechRecognition ?? browser.webkitSpeechRecognition
    if (!Speech) { notify('Voice input is not available in this browser.'); return }
    const instance = new Speech()
    instance.lang = navigator.language || 'en-US'
    instance.onresult = event => {
      const spoken = event.results[0]?.[0]?.transcript?.trim()
      if (!spoken) return
      setListening(false)
      const command = spoken.toLowerCase()
      const target = navigation.find(item => command.includes(item.label.toLowerCase()))
      if (target) setActive(target.id)
      else { setActive('guide'); void sendGuide(spoken) }
    }
    instance.onerror = () => { setListening(false); notify('Voice input stopped. You can type instead.') }
    instance.onend = () => setListening(false)
    recognition.current = instance
    setListening(true)
    instance.start()
  }

  function speak(text: string) {
    if (!('speechSynthesis' in window)) { notify('Spoken playback is not available in this browser.'); return }
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text))
  }

  async function deleteAccount() {
    const confirmed = window.confirm('Permanently delete your account and health data? This cannot be undone.')
    if (!confirmed) return
    setBusy(true)
    const response = await fetch('/api/account/delete', { method: 'DELETE' })
    setBusy(false)
    if (!response.ok) { notify('We could not delete your account. Please contact support.'); return }
    await supabase.auth.signOut({ scope: 'local' })
    window.location.assign('/')
  }

  const displayName = profile?.full_name?.trim() || user.email.split('@')[0] || 'there'
  const upcoming = appointments.filter(item => new Date(item.requested_at).getTime() >= Date.now() && item.status !== 'cancelled')
  const currentPage = navigation.find(item => item.id === active)?.label ?? 'Overview'

  return <main className="hcv-app">
    <aside className="hcv-sidebar">
      <a className="hcv-brand" href="#overview" onClick={event => { event.preventDefault(); setActive('overview') }}><span className="hcv-brand-mark"><HeartPulse size={19}/></span><span>health<span>connect</span></span></a>
      <div className="hcv-workspace"><div className="hcv-workspace-icon"><UserRound size={17}/></div><div><b>My care space</b><small>Private patient portal</small></div><ChevronDown size={15}/></div>
      <p className="hcv-nav-caption">YOUR HEALTH</p>
      <nav className="hcv-nav" aria-label="Health portal">{navigation.map(item => { const Icon = item.icon; return <button key={item.id} className={active === item.id ? 'is-active' : ''} onClick={() => setActive(item.id)}><Icon size={17}/><span>{item.label}</span>{item.id === 'appointments' && upcoming.length > 0 && <i>{upcoming.length}</i>}</button> })}</nav>
      <div className="hcv-sidebar-bottom"><div className="hcv-privacy-card"><ShieldCheck size={18}/><b>Your data stays yours</b><p>Your records are private to your account. You control what you add and when you delete it.</p><button onClick={() => setActive('profile')}>Privacy & profile <ArrowRight size={13}/></button></div><div className="hcv-user-row"><div className="hcv-avatar">{displayName.slice(0, 1).toUpperCase()}</div><div className="hcv-user-copy"><b>{displayName}</b><small>{user.email}</small></div><button className="hcv-small-icon" aria-label="Open profile" onClick={() => setActive('profile')}><Settings size={16}/></button></div></div>
    </aside>
    <section className="hcv-main">
      <header className="hcv-topbar"><div><span className="hcv-top-kicker">HEALTHCONNECT /</span><b>{currentPage}</b></div><div className="hcv-top-actions"><span className="hcv-secure-pill"><ShieldCheck size={14}/> Secure session</span><button className="hcv-logout" onClick={signOut}><LogOut size={15}/> Sign out</button></div></header>
      <div className="hcv-content">
        {active === 'overview' && <Overview name={displayName} appointments={appointments} records={records} symptoms={symptoms} emergencyRequests={emergencyRequests} onNavigate={setActive} onBook={() => setAppointmentOpen(true)} />}
        {active === 'appointments' && <Appointments userId={user.id} appointments={appointments} onCreate={() => setAppointmentOpen(true)} onCancel={cancelAppointment} />}
        {active === 'records' && <><Records records={records} uploadBusy={uploadBusy} uploadMessage={uploadMessage} onUpload={uploadDocument} onDelete={deleteRecord} /><HealthConnectRecordAccess records={records} organizations={organizations.map(({ id, name }) => ({ id, name }))} grants={recordGrants.filter(grant => grant.patient_id === user.id)}/></>}
        {active === 'hospitals' && <HealthConnectHospitalMap organizations={organizations} onBook={organizationId => { setAppointmentOrganizationId(organizationId); setActive('appointments'); setAppointmentOpen(true) }} onMessage={organizationId => { setMessageOrganizationId(organizationId); setActive('messages') }} />}
        {active === 'messages' && <HealthConnectMessages userId={user.id} staff={memberships.length > 0} organizations={organizations.map(({ id, name }) => ({ id, name }))} initialConversations={conversations} initialMessages={messages} initialOrganizationId={messageOrganizationId} />}
        {active === 'staff' && <HealthConnectStaff userId={user.id} email={user.email} organizations={organizations} memberships={memberships} applications={applications} appointments={appointments.filter(item => item.healthconnect_organization_id)} sharedRecords={initialSharedRecords} bootstrapAdmin={bootstrapAdmin} />}
        {active === 'symptoms' && <Symptoms symptoms={symptoms} text={symptomText} setText={setSymptomText} severity={severity} setSeverity={setSeverity} busy={busy} onSubmit={submitSymptoms} onEmergency={() => setActive('emergency')} />}
        {active === 'guide' && <Guide chat={chat} input={chatInput} setInput={setChatInput} busy={chatBusy} listening={listening} onSend={sendGuide} onVoice={startVoice} onSpeak={speak} />}
        {active === 'emergency' && <Emergency requests={emergencyRequests} phone={callbackPhone} setPhone={setCallbackPhone} location={locationText} setLocation={setLocationText} details={emergencyDetails} setDetails={setEmergencyDetails} busy={busy} onSubmit={requestCallback} />}
        {active === 'profile' && <ProfileSettings profile={profile} email={user.email} draft={profileDraft} setDraft={setProfileDraft} busy={busy} onSave={saveProfile} onDelete={deleteAccount} />}
      </div>
      <footer className="hcv-footer"><span>HealthConnect <i/> Your care, connected</span><span><ShieldCheck size={13}/> Personal health information is sensitive. Share only what you choose.</span></footer>
    </section>
    {appointmentOpen && <div className="hcv-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setAppointmentOpen(false) }}><section className="hcv-modal" role="dialog" aria-modal="true" aria-labelledby="appointment-title"><button className="hcv-modal-close" aria-label="Close appointment form" onClick={() => setAppointmentOpen(false)}><X size={18}/></button><div className="hcv-icon-tile"><CalendarDays size={20}/></div><div className="hcv-eyebrow">CARE PLANNING</div><h2 id="appointment-title">Request an appointment</h2><p>Choose a preferred time. Your care team can confirm the details with you.</p><form className="hcv-form" onSubmit={createAppointment}><label>Facility<select value={appointmentOrganizationId} onChange={event => setAppointmentOrganizationId(event.target.value)}><option value="">General appointment request</option>{organizations.map(organization => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></label>{appointmentOrganizationId && <><label>Your name<input required maxLength={160} autoComplete="name" value={appointmentPatientName} onChange={event => setAppointmentPatientName(event.target.value)}/></label><label>Phone for appointment updates<input required type="tel" maxLength={40} autoComplete="tel" value={appointmentPatientPhone} onChange={event => setAppointmentPatientPhone(event.target.value)}/></label><p className="hcv-field-hint">Your name and phone will be shared with this facility for scheduling.</p></>}<label>Department<select value={department} onChange={event => setDepartment(event.target.value)}><option>Primary care</option><option>Cardiology</option><option>Neurology</option><option>Dermatology</option><option>Mental health</option><option>Other</option></select></label><div className="hcv-form-row"><label>Preferred date<input type="date" min={new Date().toISOString().slice(0, 10)} required value={appointmentDate} onChange={event => setAppointmentDate(event.target.value)}/></label><label>Time<input type="time" required value={appointmentTime} onChange={event => setAppointmentTime(event.target.value)}/></label></div><label>Note for the care team <span className="hcv-optional">Optional</span><textarea maxLength={500} rows={3} value={appointmentNotes} onChange={event => setAppointmentNotes(event.target.value)} placeholder="Share a brief reason for your visit"/></label><button className="hcv-primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save appointment request'}<ArrowRight size={16}/></button></form></section></div>}
    {toast && <div className="hcv-toast" role="status"><Check size={15}/>{toast}</div>}
  </main>
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="hcv-page-header"><div><div className="hcv-eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>
}

function Overview({ name, appointments, records, symptoms, emergencyRequests, onNavigate, onBook }: { name: string; appointments: Appointment[]; records: HealthRecord[]; symptoms: SymptomEntry[]; emergencyRequests: EmergencyRequest[]; onNavigate: (page: Section) => void; onBook: () => void }) {
  const upcoming = appointments.filter(item => new Date(item.requested_at).getTime() >= Date.now() && item.status !== 'cancelled').slice(0, 2)
  return <>
    <PageHeader eyebrow="YOUR PRIVATE CARE SPACE" title={`Good to see you, ${name.split(' ')[0]}`} description="A simple overview of what is happening with your care." action={<button className="hcv-primary-button hcv-header-button" onClick={onBook}><Plus size={16}/> Request a visit</button>} />
    <div className="hcv-welcome-strip"><div className="hcv-welcome-icon"><HeartPulse size={20}/></div><div><b>Your health journey, all in one place.</b><p>Appointments, documents, symptom notes, and guidance stay connected to your private profile.</p></div><span className="hcv-welcome-tag"><ShieldCheck size={14}/> Private workspace</span></div>
    <div className="hcv-stat-grid"><StatCard label="UPCOMING VISITS" value={String(upcoming.length)} detail={upcoming[0] ? new Date(upcoming[0].requested_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Nothing scheduled'} icon={<CalendarDays size={17}/>} tone="blue"/><StatCard label="HEALTH DOCUMENTS" value={String(records.length)} detail={records.length ? 'Stored privately' : 'Add your first document'} icon={<FileText size={17}/>} tone="violet"/><StatCard label="SYMPTOM NOTES" value={String(symptoms.length)} detail={symptoms[0] ? 'Last updated ' + new Date(symptoms[0].created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No entries yet'} icon={<Activity size={17}/>} tone="mint"/><StatCard label="CALLBACK REQUESTS" value={String(emergencyRequests.length)} detail="For non-immediate help" icon={<Phone size={17}/>} tone="amber"/></div>
    <div className="hcv-overview-grid"><section className="hcv-card"><div className="hcv-card-heading"><div><div className="hcv-eyebrow">NEXT STEPS</div><h2>Care at a glance</h2></div><button className="hcv-text-button" onClick={() => onNavigate('appointments')}>All visits <ArrowRight size={14}/></button></div>{upcoming.length ? <div className="hcv-list">{upcoming.map(appointment => <AppointmentRow key={appointment.id} appointment={appointment}/>)}</div> : <EmptyState icon={<CalendarDays size={19}/>} title="No visits planned" text="Request an appointment whenever you are ready." action={<button className="hcv-soft-button" onClick={onBook}>Request a visit <ArrowRight size={14}/></button>}/>}</section><section className="hcv-guide-card"><div className="hcv-guide-glow"/><div className="hcv-guide-icon"><Sparkles size={20}/></div><div className="hcv-eyebrow">YOUR AI CARE GUIDE</div><h2>Clearer answers,<br/>one question at a time.</h2><p>Get help understanding common health terms and prepare questions for your clinician. It is guidance, not a diagnosis.</p><button className="hcv-guide-button" onClick={() => onNavigate('guide')}>Talk to your guide <ArrowRight size={15}/></button></section></div>
    <div className="hcv-quick-grid"><QuickAction icon={<Activity size={17}/>} title="Log a symptom" text="Keep a note of how you feel" onClick={() => onNavigate('symptoms')}/><QuickAction icon={<FilePlus2 size={17}/>} title="Add a health document" text="Store a report or discharge note" onClick={() => onNavigate('records')}/><QuickAction icon={<UserRound size={17}/>} title="Update your profile" text="Keep contact details current" onClick={() => onNavigate('profile')}/><QuickAction icon={<MapPin size={17}/>} title="Find nearby care" text="Explore hospitals and clinics" onClick={() => onNavigate('hospitals')}/></div>
    <p className="hcv-medical-note"><AlertTriangle size={15}/> HealthConnect is not an emergency service or a substitute for professional medical care. For an emergency, call your local emergency number.</p>
  </>
}

function StatCard({ label, value, detail, icon, tone }: { label: string; value: string; detail: string; icon: React.ReactNode; tone: string }) { return <article className="hcv-stat-card"><div className="hcv-stat-top"><span>{label}</span><i className={`hcv-stat-icon ${tone}`}>{icon}</i></div><strong>{value}</strong><small>{detail}</small></article> }
function QuickAction({ icon, title, text, onClick }: { icon: React.ReactNode; title: string; text: string; onClick: () => void }) { return <button className="hcv-quick-action" onClick={onClick}><span>{icon}</span><span><b>{title}</b><small>{text}</small></span><ArrowRight size={15}/></button> }
function EmptyState({ icon, title, text, action }: { icon: React.ReactNode; title: string; text: string; action?: React.ReactNode }) { return <div className="hcv-empty"><span>{icon}</span><b>{title}</b><p>{text}</p>{action}</div> }
function AppointmentRow({ appointment, onCancel }: { appointment: Appointment; onCancel?: () => void }) { return <article className="hcv-appointment-row"><div className="hcv-date-tile"><b>{new Date(appointment.requested_at).toLocaleDateString(undefined, { day: '2-digit' })}</b><small>{new Date(appointment.requested_at).toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</small></div><div className="hcv-row-copy"><b>{appointment.department}</b><small>{new Date(appointment.requested_at).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</small>{appointment.notes && <small>{appointment.notes}</small>}</div><span className={`hcv-status ${appointment.status}`}>{appointment.status}</span>{onCancel && <button className="hcv-small-icon" aria-label={`Cancel ${appointment.department} appointment`} onClick={onCancel}><X size={16}/></button>}</article> }

function Appointments({ appointments, userId, onCreate, onCancel }: { appointments: Appointment[]; userId: string; onCreate: () => void; onCancel: (id: string) => void }) {
  return <><PageHeader eyebrow="YOUR VISITS" title="Appointments" description="Keep track of upcoming visits and requests." action={<button className="hcv-primary-button hcv-header-button" onClick={onCreate}><Plus size={16}/> Request a visit</button>}/><section className="hcv-card hcv-full-card"><div className="hcv-card-heading"><div><div className="hcv-eyebrow">SCHEDULE</div><h2>Your appointments</h2></div><span className="hcv-count-pill">{appointments.length} total</span></div>{appointments.length ? <div className="hcv-list">{appointments.map(item => <AppointmentRow key={item.id} appointment={item} onCancel={item.user_id === userId ? () => onCancel(item.id) : undefined}/>)}</div> : <EmptyState icon={<CalendarDays size={19}/>} title="No appointments yet" text="Your appointment requests will appear here." action={<button className="hcv-soft-button" onClick={onCreate}>Request your first visit</button>}/>}</section></>
}

function Records({ records, uploadBusy, uploadMessage, onUpload, onDelete }: { records: HealthRecord[]; uploadBusy: boolean; uploadMessage: string; onUpload: (event: FormEvent<HTMLFormElement>) => void; onDelete: (record: HealthRecord) => void }) {
  return <><PageHeader eyebrow="YOUR HEALTH LIBRARY" title="Health records" description="Store your health documents privately and find them when you need them."/><section className="hcv-upload-card"><div className="hcv-upload-icon"><FilePlus2 size={21}/></div><div><b>Add a document</b><p>PDF, plain text, PNG, or JPEG up to 10 MB. Files are saved privately and are not sent to AI during upload.</p></div><form onSubmit={onUpload} className="hcv-upload-form"><label className="hcv-upload-button"><Paperclip size={15}/>{uploadBusy ? 'Uploading…' : 'Choose document'}<input type="file" name="medical-file" accept="application/pdf,text/plain,image/png,image/jpeg" required disabled={uploadBusy}/></label><button className="hcv-primary-button" disabled={uploadBusy}>{uploadBusy ? 'Saving securely…' : 'Upload privately'}<ArrowRight size={15}/></button></form>{uploadMessage && <p className="hcv-upload-status" role="status">{uploadMessage}</p>}</section><p className="hcv-ai-disclosure"><ShieldCheck size={14}/> Files are stored in private Blob storage and remain available in your health library. Document contents are not sent to AI during upload.</p><section className="hcv-card hcv-full-card"><div className="hcv-card-heading"><div><div className="hcv-eyebrow">PRIVATE LIBRARY</div><h2>Your documents</h2></div><span className="hcv-count-pill">{records.length} saved</span></div>{records.length ? <div className="hcv-record-list">{records.map(record => <article className="hcv-record-row" key={record.id}><span className="hcv-record-icon"><FileText size={17}/></span><div className="hcv-row-copy"><b>{record.title}</b><small>{record.category} · Added {new Date(record.created_at).toLocaleDateString()}</small>{record.notes && <p>{record.notes}</p>}</div><a className="hcv-small-icon" href={`/api/documents/${record.id}`} aria-label={`Download ${record.title}`}><ArrowDownToLine size={16}/></a><button className="hcv-small-icon hcv-delete-button" aria-label={`Delete ${record.title}`} onClick={() => onDelete(record)}><Trash2 size={15}/></button></article>)}</div> : <EmptyState icon={<FileText size={19}/>} title="Your library is ready" text="Upload a lab report, prescription, or discharge document to keep it close at hand."/>}</section></>
}

function Symptoms({ symptoms, text, setText, severity, setSeverity, busy, onSubmit, onEmergency }: { symptoms: SymptomEntry[]; text: string; setText: (text: string) => void; severity: number; setSeverity: (severity: number) => void; busy: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onEmergency: () => void }) {
  const urgent = /chest pain|trouble breathing|difficulty breathing|can't breathe|stroke|face droop|severe bleeding|unconscious/i.test(text)
  return <><PageHeader eyebrow="NOTICE A CHANGE?" title="Symptom tracker" description="Write down what you are experiencing and when it started. Entries are saved to your private account."/><div className="hcv-urgent-banner"><AlertTriangle size={18}/><p><b>Severe or sudden symptoms?</b> Do not wait for online guidance. Call your local emergency number or seek urgent care now.</p><button onClick={onEmergency}>Emergency options <ArrowRight size={14}/></button></div><div className="hcv-tracker-grid"><section className="hcv-card"><div className="hcv-card-heading"><div><div className="hcv-eyebrow">NEW ENTRY</div><h2>How are you feeling?</h2></div><span className="hcv-step-number">01</span></div><form className="hcv-form" onSubmit={onSubmit}><label>Describe your symptoms<textarea required rows={5} maxLength={2000} value={text} onChange={event => setText(event.target.value)} placeholder="What are you experiencing? When did it start? What makes it better or worse?"/></label><label>How intense does it feel? <b className="hcv-severity-value">{severity} / 10</b><input className="hcv-range" type="range" min="1" max="10" value={severity} onChange={event => setSeverity(Number(event.target.value))}/><span className="hcv-range-labels"><small>Mild</small><small>Severe</small></span></label>{urgent && <p className="hcv-form-error" role="alert">Your note may describe an emergency. Please call your local emergency number now instead of waiting for an AI response.</p>}<button className="hcv-primary-button" disabled={busy}>{busy ? 'Saving your entry…' : 'Save and get general guidance'}<ArrowRight size={15}/></button></form><p className="hcv-disclaimer-small">AI guidance can be incomplete and is not a diagnosis or treatment plan.</p></section><section className="hcv-card"><div className="hcv-card-heading"><div><div className="hcv-eyebrow">YOUR HISTORY</div><h2>Recent entries</h2></div><span className="hcv-count-pill">{symptoms.length}</span></div>{symptoms.length ? <div className="hcv-symptom-list">{symptoms.map(item => <article className="hcv-symptom-entry" key={item.id}><div className="hcv-symptom-meta"><b>{new Date(item.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</b><span>Severity {item.severity}/10</span></div><p>{item.symptoms}</p><div className="hcv-summary"><Sparkles size={14}/><span>{item.ai_summary}</span></div></article>)}</div> : <EmptyState icon={<Activity size={18}/>} title="No entries yet" text="Saved symptom notes and general guidance will show up here."/>}</section></div></>
}

function Guide({ chat, input, setInput, busy, listening, onSend, onVoice, onSpeak }: { chat: ChatMessage[]; input: string; setInput: (text: string) => void; busy: boolean; listening: boolean; onSend: (message?: string) => void; onVoice: () => void; onSpeak: (text: string) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); onSend() }
  return <><PageHeader eyebrow="AI HEALTH INFORMATION GUIDE" title="A little more clarity." description="Ask about common health terms, prepare for a visit, or get help using your care space."/><div className="hcv-ai-disclosure hcv-guide-notice"><ShieldCheck size={15}/><span>AI answers may be wrong and are not medical advice. Do not use this guide for emergencies or to diagnose or treat a condition. Your messages are processed by Vercel AI Gateway and are not saved as chat history.</span></div><section className="hcv-chat-card"><div className="hcv-chat-header"><div className="hcv-guide-icon"><Sparkles size={18}/></div><div><b>HealthConnect guide</b><small><span className="hcv-live-dot"/> Available for general information</small></div><button className={`hcv-voice-button ${listening ? 'is-listening' : ''}`} onClick={onVoice} aria-label={listening ? 'Listening for a voice command' : 'Use voice command'}><Mic size={16}/>{listening ? 'Listening…' : 'Voice command'}</button></div><div className="hcv-chat-messages" aria-live="polite">{chat.map((message, index) => <div className={`hcv-chat-message ${message.role}`} key={`${index}-${message.role}`}><div className="hcv-chat-avatar">{message.role === 'assistant' ? <Sparkles size={14}/> : <UserRound size={14}/>}</div><div className="hcv-chat-bubble"><p>{message.content}</p>{message.role === 'assistant' && index > 0 && <button className="hcv-speak-button" onClick={() => onSpeak(message.content)}><Volume2 size={13}/> Read aloud</button>}</div></div>)}{busy && <div className="hcv-chat-message assistant"><div className="hcv-chat-avatar"><Sparkles size={14}/></div><div className="hcv-chat-bubble"><span className="hcv-thinking"><i/><i/><i/></span></div></div>}</div><form className="hcv-chat-composer" onSubmit={submit}><label htmlFor="guide-question" className="sr-only">Ask the health guide</label><input id="guide-question" value={input} onChange={event => setInput(event.target.value)} maxLength={1200} placeholder="Ask a general health question…"/><button type="button" className="hcv-mic-button" onClick={onVoice} aria-label="Use voice command"><Mic size={17}/></button><button className="hcv-send-button" disabled={busy || !input.trim()} aria-label="Send question"><Send size={16}/></button></form><p className="hcv-chat-footnote">For urgent or personal medical concerns, contact a licensed healthcare professional.</p></section><div className="hcv-prompt-row"><button onClick={() => onSend('What questions should I ask at my next doctor visit?')}>Prepare for a visit <ArrowRight size={13}/></button><button onClick={() => onSend('Explain a common health term in plain language.')}>Explain a health term <ArrowRight size={13}/></button></div></>
}

function Emergency({ requests, phone, setPhone, location, setLocation, details, setDetails, busy, onSubmit }: { requests: EmergencyRequest[]; phone: string; setPhone: (value: string) => void; location: string; setLocation: (value: string) => void; details: string; setDetails: (value: string) => void; busy: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <><PageHeader eyebrow="HELP WHEN YOU NEED IT" title="Emergency support" description="For immediate danger, contact your local emergency services directly."/><section className="hcv-emergency-callout"><div className="hcv-emergency-symbol"><Phone size={21}/></div><div><span className="hcv-emergency-label">IMMEDIATE EMERGENCY</span><h2>Call your local emergency number</h2><p>HealthConnect does not dispatch ambulances. Do not wait for a callback or AI response if someone may be in danger.</p></div><a className="hcv-emergency-call-button" href="tel:112">Call 112 <ArrowRight size={15}/></a></section><div className="hcv-tracker-grid hcv-emergency-grid"><section className="hcv-card"><div className="hcv-card-heading"><div><div className="hcv-eyebrow">NON-URGENT FOLLOW-UP</div><h2>Request a care-team callback</h2></div></div><p className="hcv-section-intro">This saves a callback request to your account. It does not contact emergency services or dispatch an ambulance.</p><form className="hcv-form" onSubmit={onSubmit}><label>Callback phone<input type="tel" required maxLength={30} value={phone} onChange={event => setPhone(event.target.value)} placeholder="Phone number"/></label><label>Your location<textarea required maxLength={300} rows={2} value={location} onChange={event => setLocation(event.target.value)} placeholder="Address or location details"/></label><label>What do you need help with? <span className="hcv-optional">Optional</span><textarea maxLength={500} rows={2} value={details} onChange={event => setDetails(event.target.value)} placeholder="A brief note for your care team"/></label><button className="hcv-primary-button hcv-emergency-submit" disabled={busy}>{busy ? 'Saving request…' : 'Save callback request'}<ArrowRight size={15}/></button></form></section><section className="hcv-card"><div className="hcv-card-heading"><div><div className="hcv-eyebrow">REQUEST HISTORY</div><h2>Recent callback requests</h2></div></div>{requests.length ? <div className="hcv-list">{requests.map(item => <article className="hcv-appointment-row" key={item.id}><div className="hcv-date-tile"><Phone size={16}/></div><div className="hcv-row-copy"><b>{item.location_text}</b><small>{new Date(item.created_at).toLocaleString()} · {item.callback_phone}</small>{item.details && <small>{item.details}</small>}</div><span className="hcv-status requested">{item.status}</span></article>)}</div> : <EmptyState icon={<Phone size={18}/>} title="No callback requests" text="Non-urgent requests you save will appear here."/>}</section></div></>
}

function ProfileSettings({ profile, email, draft, setDraft, busy, onSave, onDelete }: { profile: Profile | null; email: string; draft: { full_name: string; phone: string; birth_date: string; blood_type: string; emergency_contact_name: string; emergency_contact_phone: string }; setDraft: (draft: { full_name: string; phone: string; birth_date: string; blood_type: string; emergency_contact_name: string; emergency_contact_phone: string }) => void; busy: boolean; onSave: (event: FormEvent<HTMLFormElement>) => void; onDelete: () => void }) {
  const change = (key: keyof typeof draft, value: string) => setDraft({ ...draft, [key]: value })
  return <><PageHeader eyebrow="ACCOUNT & PRIVACY" title="Your profile" description="Update your contact details and manage your HealthConnect account."/><div className="hcv-profile-layout"><section className="hcv-card"><div className="hcv-card-heading"><div><div className="hcv-eyebrow">PERSONAL DETAILS</div><h2>Contact information</h2></div><span className="hcv-profile-avatar"><UserRound size={20}/></span></div><form className="hcv-form" onSubmit={onSave}><label>Full name<input autoComplete="name" required maxLength={100} value={draft.full_name} onChange={event => change('full_name', event.target.value)}/></label><label>Account email<input type="email" value={email} disabled/><span className="hcv-field-hint">Email changes are managed through account verification.</span></label><div className="hcv-form-row"><label>Phone number<input type="tel" autoComplete="tel" maxLength={30} value={draft.phone} onChange={event => change('phone', event.target.value)}/></label><label>Date of birth<input type="date" value={draft.birth_date} onChange={event => change('birth_date', event.target.value)}/></label></div><div className="hcv-form-row"><label>Blood type <span className="hcv-optional">Optional</span><select value={draft.blood_type} onChange={event => change('blood_type', event.target.value)}><option value="">Not provided</option>{['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−', 'Unknown'].map(item => <option key={item}>{item}</option>)}</select></label><span/></div><div className="hcv-field-divider"/><div><div className="hcv-eyebrow">EMERGENCY CONTACT</div><p className="hcv-section-intro">A person your care team may contact if needed.</p></div><label>Contact name<input maxLength={100} value={draft.emergency_contact_name} onChange={event => change('emergency_contact_name', event.target.value)} placeholder="Full name"/></label><label>Contact phone<input type="tel" maxLength={30} value={draft.emergency_contact_phone} onChange={event => change('emergency_contact_phone', event.target.value)} placeholder="Phone number"/></label><button className="hcv-primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save profile changes'}<Check size={15}/></button></form></section><aside className="hcv-profile-aside"><section className="hcv-card hcv-security-card"><div className="hcv-profile-avatar"><ShieldCheck size={19}/></div><h2>Account security</h2><p>Your health records and profile are protected by your signed-in account. Your account role cannot be changed from this screen.</p><div className="hcv-security-row"><span>Signed in as</span><b>{email}</b></div></section><section className="hcv-card hcv-danger-card"><div className="hcv-eyebrow">IRREVERSIBLE ACTION</div><h2>Delete your account</h2><p>Permanently remove your profile, appointments, symptom history, callback requests, and private health documents.</p><button className="hcv-danger-button" onClick={onDelete} disabled={busy}><Trash2 size={15}/> Delete account and data</button></section></aside></div></>
}
