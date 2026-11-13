"use client"

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, ArrowRight, Eye, EyeOff, HeartPulse, LockKeyhole, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function HealthConnectAuth() {
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setError('')
    const supabase = createClient()

    if (mode === 'signup') {
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`,
          data: { full_name: name.trim(), phone: phone.trim() },
        },
      })
      setBusy(false)
      if (authError) {
        setError('We could not create your account. Check your details and try again.')
        return
      }
      if (data.session) router.refresh()
      else setMessage('Account created. Check your email and confirm your address before signing in.')
      return
    }

    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (authError) {
      const needsConfirmation = authError.message.toLowerCase().includes('confirm')
      setError(needsConfirmation ? 'Please confirm your email from the link we sent before signing in.' : 'Invalid email or password. If you are new here, create an account first.')
      return
    }
    router.refresh()
  }

  return <main className="hcv-auth-page">
    <section className="hcv-auth-story">
      <div className="hcv-brand"><span className="hcv-brand-mark"><HeartPulse size={20} /></span><span>health<span>connect</span></span></div>
      <div className="hcv-story-content">
        <div className="hcv-eyebrow"><span className="hcv-live-dot" /> A calmer way to care</div>
        <h1>Your health,<br /><em>in good hands.</em></h1>
        <p>One secure place for your care team, health records, appointments, and answers that help you feel more informed.</p>
        <div className="hcv-story-points"><div><ShieldCheck size={17} /><span>Private by default</span></div><div><Activity size={17} /><span>Care that stays connected</span></div></div>
      </div>
      <div className="hcv-story-foot">A connected care experience <span>•</span> Built around you</div>
      <div className="hcv-orb hcv-orb-one"/><div className="hcv-orb hcv-orb-two"/>
    </section>
    <section className="hcv-auth-panel">
      <div className="hcv-auth-card">
        <div className="hcv-mobile-brand"><div className="hcv-brand"><span className="hcv-brand-mark"><HeartPulse size={19}/></span><span>health<span>connect</span></span></div></div>
        <div className="hcv-auth-kicker">SECURE PATIENT PORTAL</div>
        <h2>{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h2>
        <p className="hcv-auth-subtitle">{mode === 'signin' ? 'Sign in to pick up where you left off.' : 'Start building a clearer picture of your health.'}</p>
        <div className="hcv-auth-switch" role="tablist" aria-label="Account access"><button type="button" role="tab" aria-selected={mode === 'signin'} className={mode === 'signin' ? 'is-active' : ''} onClick={() => { setMode('signin'); setError(''); setMessage('') }}>Sign in</button><button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'is-active' : ''} onClick={() => { setMode('signup'); setError(''); setMessage('') }}>Create account</button></div>
        <form className="hcv-auth-form" onSubmit={submit}>
          {mode === 'signup' && <><label>Full name<input autoComplete="name" required value={name} onChange={event => setName(event.target.value)} placeholder="Your name" maxLength={100}/></label><label>Mobile number<input type="tel" autoComplete="tel" required value={phone} onChange={event => setPhone(event.target.value)} placeholder="+1 555 000 0000" maxLength={30}/></label></>}
          <label>Email address<input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" maxLength={254}/></label>
          <label>Password<span className="hcv-password-wrap"><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={mode === 'signup' ? 12 : 1} required value={password} onChange={event => setPassword(event.target.value)} placeholder={mode === 'signup' ? 'At least 12 characters' : 'Enter your password'}/><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></span></label>
          {mode === 'signup' && <label className="hcv-consent"><input type="checkbox" required checked={acceptedTerms} onChange={event => setAcceptedTerms(event.target.checked)}/><span>I have read and agree to the <a href="/about#privacy">Privacy Notice</a> and <a href="/about#terms">Terms of Use</a>.</span></label>}{error && <p className="hcv-form-error" role="alert">{error}</p>}{message && <p className="hcv-form-success" role="status">{message}</p>}
          <button className="hcv-primary-button hcv-submit" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in securely' : 'Create secure account'}{!busy && <ArrowRight size={16}/>}</button>
        </form>
        <div className="hcv-auth-assurance"><LockKeyhole size={15}/><span>Your profile and records are scoped to your account.</span></div>
        <p className="hcv-auth-note">Patient accounts can manage records, appointments, and facility sharing. Staff access requires an approved application.</p>
      </div>
      <div className="hcv-auth-legal">AI services process prompts and document contents when requested. <a href="/about#privacy">Privacy Notice</a> · <a href="/about#terms">Terms of Use</a></div>
    </section>
  </main>
}
