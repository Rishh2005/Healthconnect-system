import Link from 'next/link'

export default function PrivacyAndTermsPage() {
  return <main className="hcv-public-page">
    <header className="hcv-public-header"><Link href="/" className="hcv-public-brand">health<span>connect</span></Link><Link href="/" className="hcv-public-back">Back to sign in</Link></header>
    <article className="hcv-public-content">
      <div className="hcv-eyebrow">HEALTHCONNECT · IMPORTANT INFORMATION</div>
      <h1>Privacy & terms</h1>
      <p className="hcv-public-intro">A plain-language summary of how this portal handles health information. This product notice is not a substitute for a legal review or a provider privacy notice.</p>
      <section id="privacy" className="hcv-public-section">
        <h2>Privacy notice</h2>
        <h3>Information you provide</h3>
        <p>This build stores your account identity and the contact details you add, plus your profile details, appointment requests, symptom entries, emergency callback requests, uploaded documents, and document summaries.</p>
        <h3>Where information is stored</h3>
        <p>Account and health-record metadata are stored in Supabase with per-account row-level access controls. Uploaded files are stored in private Vercel Blob storage and served only after an authenticated ownership check. Account deletion removes your account-owned database rows and attempts to remove its private files.</p>
        <h3>AI processing</h3>
        <p>When you use the AI guide, your message is processed through Vercel AI Gateway with a Google Gemini model. When you ask for a document summary, the file content is sent for the same AI processing. Do not submit information you are not authorized or comfortable sharing with those services. AI answers may be incomplete or wrong and are not medical advice.</p>
        <h3>Sharing and access</h3>
        <p>This build does not share patient records with clinicians or hospital accounts. Only patient account workflows are active. Do not use this app as a hospital record system or for clinical decisions. A production healthcare deployment needs an appropriate privacy, security, and regulatory review, including any required provider agreements, before handling regulated health data.</p>
        <h3>Retention and deletion</h3>
        <p>You can permanently delete your account and the records tied to it from Profile. Service backups and provider retention may follow their own retention schedules.</p>
      </section>
      <section id="terms" className="hcv-public-section">
        <h2>Terms of use</h2>
        <ul>
          <li>HealthConnect is an organizational tool for keeping personal health information organized; it does not diagnose, treat, or replace a licensed clinician.</li>
          <li>For severe or time-critical symptoms, contact your local emergency service immediately. This app does not dispatch an ambulance.</li>
          <li>Appointment entries are requests only and are not confirmed until a care provider confirms them.</li>
          <li>The emergency callback form only saves a callback request in your account. It is not sent to emergency responders or a dispatch service.</li>
          <li>Use the app only for information you have the right to provide. AI guidance and document summaries should be checked with a qualified healthcare professional.</li>
        </ul>
      </section>
      <p className="hcv-public-disclaimer">This implementation is a starting point, not a representation of HIPAA compliance, a business associate agreement, or a live hospital / ambulance integration.</p>
    </article>
  </main>
}
