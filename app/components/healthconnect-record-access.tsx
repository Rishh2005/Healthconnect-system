"use client"

import { useState } from 'react'
import { Check, LockKeyhole, Share2, ShieldCheck, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type HealthDocument = { id: string; title: string; category: string; created_at: string }
type Organization = { id: string; name: string }
type Grant = { id: string; record_id: string; organization_id: string; created_at: string }
export default function HealthConnectRecordAccess({ records, organizations, grants: initialGrants }: { records: HealthDocument[]; organizations: Organization[]; grants: Grant[] }) {
  const supabase = createClient()
  const [grants, setGrants] = useState(initialGrants)
  const [organizationByRecord, setOrganizationByRecord] = useState<Record<string, string>>({})
  const [busyRecord, setBusyRecord] = useState('')
  const [notice, setNotice] = useState('')

  async function share(record: HealthDocument) {
    const organizationId = organizationByRecord[record.id]
    if (!organizationId || busyRecord) return
    setBusyRecord(record.id)
    const { data, error } = await supabase.from('healthconnect_record_grants').insert({ record_id: record.id, organization_id: organizationId }).select('id, record_id, organization_id, created_at').single()
    setBusyRecord('')
    if (error || !data) { setNotice('Access could not be granted. Check whether this document is already shared.'); return }
    setGrants(current => [...current, data as Grant])
    setNotice(`Shared “${record.title}” with ${organizations.find(org => org.id === organizationId)?.name ?? 'the facility'}.`)
  }

  async function revoke(grant: Grant) {
    setBusyRecord(grant.id)
    const { error } = await supabase.from('healthconnect_record_grants').delete().eq('id', grant.id)
    setBusyRecord('')
    if (error) { setNotice('Access could not be revoked. Please try again.'); return }
    setGrants(current => current.filter(item => item.id !== grant.id))
    setNotice('Facility access was revoked.')
  }

  return <section className="hcv-card hcv-full-card hcv-record-access"><div className="hcv-card-heading"><div><div className="hcv-eyebrow">YOU CONTROL SHARING</div><h2>Facility access</h2></div><span className="hcv-record-icon"><LockKeyhole size={16}/></span></div><p className="hcv-section-intro">Sharing is per document and facility. Approved clinicians at that facility can view the selected record until you revoke access.</p>
    {records.length ? <div className="hcv-record-access-list">{records.map(record => { const recordGrants = grants.filter(grant => grant.record_id === record.id); return <article className="hcv-record-access-row" key={record.id}><div className="hcv-row-copy"><b>{record.title}</b><small>{record.category} · Added {new Date(record.created_at).toLocaleDateString()}</small>{recordGrants.map(grant => <div className="hcv-shared-grant" key={grant.id}><span><ShieldCheck size={13}/>{organizations.find(org => org.id === grant.organization_id)?.name ?? 'HealthConnect facility'} · shared {new Date(grant.created_at).toLocaleDateString()}</span><button className="hcv-text-button" disabled={busyRecord === grant.id} onClick={() => void revoke(grant)}><X size={13}/> Revoke</button></div>)}</div><div className="hcv-share-controls"><label className="sr-only" htmlFor={`share-${record.id}`}>Choose facility for {record.title}</label><select id={`share-${record.id}`} value={organizationByRecord[record.id] ?? ''} onChange={event => setOrganizationByRecord(current => ({ ...current, [record.id]: event.target.value }))}><option value="">Select facility</option>{organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}</select><button className="hcv-soft-button" disabled={busyRecord === record.id || !organizationByRecord[record.id]} onClick={() => void share(record)}><Share2 size={13}/>{busyRecord === record.id ? 'Saving…' : 'Share record'}</button></div></article> })}</div> : <p className="hcv-section-intro">Add a document before sharing it with a facility.</p>}
    {notice && <p className="hcv-upload-status" role="status"><Check size={14}/>{notice}</p>}
  </section>
}
