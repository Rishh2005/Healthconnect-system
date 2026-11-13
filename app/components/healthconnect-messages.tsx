"use client"

import { FormEvent, useMemo, useState } from 'react'
import { ArrowRight, MessageCircle, Send, ShieldCheck, UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Organization = { id: string; name: string }
type Conversation = { id: string; organization_id: string; patient_id: string; subject: string; created_at: string; closed_at: string | null }
type Message = { id: string; conversation_id: string; sender_id: string; body: string; created_at: string }
export default function HealthConnectMessages({ userId, staff, organizations, initialConversations, initialMessages, initialOrganizationId }: { userId: string; staff: boolean; organizations: Organization[]; initialConversations: Conversation[]; initialMessages: Message[]; initialOrganizationId?: string | null }) {
  const supabase = createClient()
  const [conversations, setConversations] = useState(initialConversations)
  const [messages, setMessages] = useState(initialMessages)
  const [selectedId, setSelectedId] = useState(initialConversations.find(item => item.organization_id === initialOrganizationId)?.id ?? initialConversations[0]?.id ?? '')
  const [newOrganizationId, setNewOrganizationId] = useState(initialOrganizationId ?? '')
  const [subject, setSubject] = useState('Appointment question')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState('')
  const selected = conversations.find(item => item.id === selectedId)
  const visibleMessages = useMemo(() => messages.filter(item => item.conversation_id === selectedId).sort((a, b) => a.created_at.localeCompare(b.created_at)), [messages, selectedId])

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanBody = body.trim()
    if (!cleanBody || sending) return
    setSending(true)
    setNotice('')
    let conversation = selected
    if (!conversation) {
      if (staff || !newOrganizationId) { setSending(false); setNotice('Choose a verified facility to start a conversation.'); return }
      const { data, error } = await supabase.from('healthconnect_conversations').insert({ organization_id: newOrganizationId, patient_id: userId, subject: subject.trim() }).select('id, organization_id, patient_id, subject, created_at, closed_at').single()
      if (error || !data) { setSending(false); setNotice('A conversation could not be started.'); return }
      conversation = data as Conversation
      setConversations(current => [conversation!, ...current])
      setSelectedId(conversation.id)
    }
    if (conversation.closed_at) { setSending(false); setNotice('This conversation is closed.'); return }
    const { data: message, error } = await supabase.from('healthconnect_messages').insert({ conversation_id: conversation.id, sender_id: userId, body: cleanBody }).select('id, conversation_id, sender_id, body, created_at').single()
    setSending(false)
    if (error || !message) { setNotice('Message could not be sent. Please try again.'); return }
    setMessages(current => [...current, message as Message])
    setBody('')
  }

  return <>
    <div className="hcv-page-header"><div><div className="hcv-eyebrow">SECURE CARE MESSAGES</div><h1>Messages</h1><p>Keep appointment questions in one place. Messages are visible to the patient and approved members of the selected facility.</p></div><span className="hcv-secure-pill"><ShieldCheck size={14}/> Private inbox</span></div>
    <div className="hcv-message-layout">
      <aside className="hcv-card hcv-message-list"><div className="hcv-card-heading"><div><div className="hcv-eyebrow">INBOX</div><h2>{staff ? 'Facility conversations' : 'Your conversations'}</h2></div><span className="hcv-count-pill">{conversations.length}</span></div>
        {conversations.length ? conversations.map(item => <button key={item.id} className={`hcv-message-thread ${selectedId === item.id ? 'is-selected' : ''}`} onClick={() => setSelectedId(item.id)}><span className="hcv-record-icon"><MessageCircle size={15}/></span><span><b>{item.subject}</b><small>{organizations.find(org => org.id === item.organization_id)?.name ?? 'Care facility'}</small><small>{new Date(item.created_at).toLocaleDateString()}</small></span></button>) : <p className="hcv-section-intro">No conversations yet.</p>}
      </aside>
      <section className="hcv-card hcv-message-panel">
        {selected ? <><div className="hcv-message-panel-head"><span className="hcv-record-icon"><UserRound size={16}/></span><div><b>{selected.subject}</b><small>{organizations.find(org => org.id === selected.organization_id)?.name ?? 'Care facility'}</small></div><span className="hcv-live-dot"/></div>
          <div className="hcv-message-feed" aria-live="polite">{visibleMessages.map(item => <article key={item.id} className={`hcv-message-bubble ${item.sender_id === userId ? 'is-mine' : ''}`}><small>{item.sender_id === userId ? 'You' : staff ? 'Patient' : 'Care team'} · {new Date(item.created_at).toLocaleString()}</small><p>{item.body}</p></article>)}</div>
          <form className="hcv-message-compose" onSubmit={send}><label className="sr-only" htmlFor="message-reply">Write a message</label><textarea id="message-reply" rows={2} maxLength={3000} value={body} onChange={event => setBody(event.target.value)} placeholder="Write a message…" disabled={Boolean(selected.closed_at)}/><button className="hcv-primary-button" disabled={sending || !body.trim() || Boolean(selected.closed_at)}>{sending ? 'Sending…' : 'Send'}<Send size={14}/></button></form>
        </> : !staff && <form className="hcv-form hcv-new-message" onSubmit={send}><div className="hcv-message-empty"><MessageCircle size={19}/><b>Start a conversation</b><p>Messages are available for verified HealthConnect facilities only.</p></div><label>Verified facility<select required value={newOrganizationId} onChange={event => setNewOrganizationId(event.target.value)}><option value="">Select a facility</option>{organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label><label>Subject<input required maxLength={160} value={subject} onChange={event => setSubject(event.target.value)}/></label><label>Message<textarea required rows={4} maxLength={3000} value={body} onChange={event => setBody(event.target.value)} placeholder="Keep your message focused on scheduling or care coordination."/></label><button className="hcv-primary-button" disabled={sending || !body.trim()}>{sending ? 'Sending…' : 'Start conversation'}<ArrowRight size={14}/></button></form>}
        {staff && !selected && <div className="hcv-message-empty"><MessageCircle size={20}/><b>Select a conversation</b><p>Patient messages sent to your organization will appear here.</p></div>}
        {notice && <p className="hcv-upload-status" role="status">{notice}</p>}
      </section>
    </div>
    <p className="hcv-ai-disclosure"><ShieldCheck size={14}/> Do not use messages for emergencies. Call local emergency services for immediate help. Avoid sending highly sensitive health details.</p>
  </>
}
