# HealthConnect

**HealthConnect** is a healthcare management and personal-care portal built with Next.js. It brings patient-facing tools—appointments, health documents, symptom notes, facility discovery, and an AI information guide—together with account-based data access and staff application workflows.

> **Important:** HealthConnect is not a medical device, emergency service, or substitute for professional care. The AI guide does not diagnose or prescribe. Appointment entries are requests, and an emergency callback form does not contact emergency responders. The in-app Privacy & Terms page also states that this build is not a representation of HIPAA compliance and that clinician/hospital record sharing is not active. Do not use this project with real patient information until its infrastructure, security, legal obligations, and operational workflows have been independently reviewed.

## Contents

- [Features](#features)
- [Technology stack](#technology-stack)
- [How the application works](#how-the-application-works)
- [Repository structure](#repository-structure)
- [Requirements](#requirements)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Supabase and storage setup](#supabase-and-storage-setup)
- [Routes and API](#routes-and-api)
- [Development commands](#development-commands)
- [Security and privacy notes](#security-and-privacy-notes)
- [Limitations](#limitations)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Features

### Patient portal

- **Account registration and sign-in:** Email and password authentication through Supabase Auth, email confirmation, and an auth callback route.
- **Overview:** A single place to see a summary of the signed-in user's care information.
- **Appointments:** Create appointment requests for a department and, where available, a facility; view and remove requests. Requests are not confirmed bookings until a provider confirms them.
- **Health records:** Upload, retrieve, and delete personal documents. The upload endpoint accepts PDF, plain text, PNG, and JPEG files up to 10 MB and stores uploaded files privately in Vercel Blob.
- **Symptom tracker:** Save a symptom description and subjective severity rating. The app attempts to generate conservative, non-diagnostic AI information, but saving the entry does not depend on AI availability.
- **AI care guide:** Ask general health-information questions and prepare questions for a clinician. Voice input and spoken output are available where supported by the browser.
- **Facility discovery:** View configured HealthConnect organizations and search for nearby public facility listings using browser location or entered coordinates. The map uses Leaflet/OpenStreetMap; public listings are sourced through the OpenStreetMap Overpass API and may be incomplete or out of date.
- **Messages:** Patient and facility conversation interfaces for appointment-related questions. Messages are not for emergencies; avoid sending highly sensitive details.
- **Emergency callback requests:** Save a callback request, phone number, location text, and details to the user's account. This does **not** dispatch an ambulance or notify emergency services.
- **Profile and account controls:** Edit profile information and request permanent account deletion, including cleanup of files under the account's Vercel Blob prefix.
- **Privacy and terms information:** `/about` presents the application's privacy notice and terms summary.

### Healthcare staff workflows

- Healthcare professionals can submit an application for doctor or hospital-administrator access.
- Applications are subject to approval. A configured bootstrap administrator can register a facility and review specified applications.
- The staff workspace includes facility appointment and application workflows, subject to the Supabase schema and access policies configured for the deployment.
- The portal includes patient-controlled record grant/revoke UI. However, the current in-app privacy notice says clinician/hospital record sharing is **not active** in this build. Treat that workflow as unavailable until the database, authorization rules, and complete sharing behavior have been verified and the notice has been updated accordingly.

## Technology stack

| Area | Technologies |
| --- | --- |
| Language | TypeScript, TSX, JavaScript configuration |
| Web framework | Next.js 16 App Router, React 19, Node.js runtime for file uploads |
| Authentication and data | Supabase Auth, Supabase JavaScript client, `@supabase/ssr` for browser/server sessions |
| File storage | Vercel Blob, using private access for health documents |
| AI | Vercel AI SDK (`ai`) with the `google/gemini-3.8-flash` model identifier in the chat route; provider credentials and gateway configuration must be set up for the deployment |
| Styling and UI | Tailwind CSS, project CSS, shadcn-style UI components, Radix UI primitives, Lucide icons |
| Mapping | Leaflet, React Leaflet, OpenStreetMap tiles and Overpass API |
| Charts and animation | Recharts and Framer Motion are dependencies used by the UI ecosystem; check individual screens before assuming every dependency is used in the active portal |
| Forms and validation utilities | React Hook Form, Zod, and `@hookform/resolvers` are available dependencies |
| Package manager | pnpm (the package manifest specifies `pnpm@12.3.4`) |

## How the application works

1. Next.js serves the App Router application. The root route (`app/page.tsx`) checks the Supabase session on the server. Signed-out visitors see the authentication screen; signed-in users receive portal data and the selected portal section.
2. Supabase Auth cookies are refreshed by `proxy.ts` and `lib/supabase/proxy.ts`. Browser and server Supabase clients are created separately in `lib/supabase/client.ts` and `lib/supabase/server.ts`.
3. The root page queries the signed-in user's profile, appointments, health records, symptom entries, and callback requests, as well as available facility and staff-workspace data. The interactive portal is rendered by `app/components/healthconnect-portal.tsx`.
4. The portal uses Supabase for account-scoped data and Next.js route handlers for privileged or provider-integrated operations, including document storage, AI requests, nearby facility search, staff administration, and account deletion.
5. Access to sensitive data depends on the policies and database objects in the connected Supabase project. This repository does not include SQL migrations or a complete database bootstrap schema; a working UI alone does not establish that production permissions are correctly configured.

## Repository structure

```text
app/
  page.tsx                         Auth gate and server-side portal data loading
  layout.tsx                       Root document, metadata, global styles
  about/page.tsx                   Privacy notice and terms summary
  appointments/, dashboard/        Convenience routes that redirect to portal sections
  auth/callback/route.ts           Supabase email-confirmation callback
  api/
    account/delete/                Account and associated file deletion
    chat/                          Authenticated AI guide and symptom information
    documents/                     Private document retrieval, upload, deletion
    hospitals/nearby/              Authenticated OpenStreetMap Overpass search
    staff/                         Staff applications, bootstrap, and review
  components/                      Portal, authentication, map, messages, staff UI
components/
  ui/                              Reusable UI primitives
  theme-provider.tsx               Theme provider
hooks/                             Reusable React hooks
lib/
  supabase/                        Browser, server, admin, and session clients
  utils.ts                         Shared utility functions
public/                            Icons and static images
styles/                            Additional stylesheet
```

The active product flow is the signed-in portal in `app/components/healthconnect-portal.tsx`. `app/components/healthconnect-app.tsx` is a separate demo-style interface with seeded local-storage data; it is not the component rendered by the root route. Do not mistake its sample appointments, vitals, staffing, bed, or billing data for live database-backed functionality.

## Requirements

- Node.js compatible with the installed Next.js 16 release.
- pnpm 12.3.4 (or a compatible pnpm version).
- A Supabase project with Auth configured and the database objects and row-level security policies required by the app.
- A Vercel Blob store for document uploads and private retrieval.
- AI provider / Vercel AI Gateway access configured for the model used by `app/api/chat/route.ts` if AI features are to be enabled.
- Internet access for OpenStreetMap tiles and nearby searches.

## Getting started

```bash
git clone https://github.com/Rishh2005/Healthconnect-system.git
cd Healthconnect-system
pnpm install
```

Create `.env.local` in the project root and configure the variables described below. `.env.local` is ignored by Git; never commit secrets.

```bash
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000). Create an account and confirm the email if email confirmation is enabled in Supabase.

> The repository does not provide database migrations or a ready-to-run Supabase schema. Configure the required tables, functions, policies, storage provider, and Auth redirect URLs before expecting all portal workflows to work. See [Supabase and storage setup](#supabase-and-storage-setup).

## Environment variables

Set only the credentials required for the capabilities you enable. The code references the following names:

| Variable | Purpose | Required for |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL; also used as the fallback URL by the server admin client | Supabase features |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key used by browser/server session clients | Supabase features; preferred over the legacy anon key |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Legacy fallback key if the publishable key is not set | Supabase features when using the legacy key |
| `SUPABASE_URL` | Optional server-side URL override for admin operations | Admin operations if set; otherwise `NEXT_PUBLIC_SUPABASE_URL` is used |
| `SUPABASE_SECRET_KEY` | Server-only Supabase privileged key | Admin workflows and account deletion; preferred over the legacy service-role key |
| `SUPABASE_SERVICE_ROLE_KEY` | Legacy server-only privileged-key fallback | Admin workflows and account deletion if `SUPABASE_SECRET_KEY` is not set |
| `HEALTHCONNECT_BOOTSTRAP_ADMIN_EMAILS` | Comma-separated email addresses allowed to use bootstrap-admin workflows | Facility bootstrap and bootstrap-admin application review |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token used by `@vercel/blob` | Private document upload, retrieval, deletion, and account cleanup |
| `OPENAI_API_KEY` | Exposed through the Next.js `env` configuration in `next.config.js` | Present in project configuration; verify whether your deployment needs it. The chat route specifies a Google Gemini model through the AI SDK, so this variable alone does not establish AI provider configuration. |
| `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` | Optional email confirmation redirect override; otherwise the app uses the current origin plus `/auth/callback` | Local development when the Supabase redirect URL needs an explicit value |

Example placeholder file (replace values locally; never commit real credentials):

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
# Optional legacy alternative:
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Server-only credentials; do not prefix these with NEXT_PUBLIC_.
SUPABASE_SECRET_KEY=your-server-only-supabase-secret
SUPABASE_URL=https://your-project.supabase.co
HEALTHCONNECT_BOOTSTRAP_ADMIN_EMAILS=admin@example.com

BLOB_READ_WRITE_TOKEN=your-vercel-blob-token
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000/auth/callback
```

The admin/secret key must remain server-only. Never put it in a `NEXT_PUBLIC_` variable, browser code, screenshots, issue reports, or committed files. If a secret is exposed, revoke and rotate it.

### AI provider configuration

`app/api/chat/route.ts` calls the AI SDK with `google/gemini-3.8-flash`. Configure the AI Gateway/provider credentials required by the deployment platform for that model. The exact credential name can vary by provider and deployment configuration; the repository does not define a dedicated AI environment variable in the chat route. Do not assume `OPENAI_API_KEY` is the correct credential for the configured Gemini model.

## Supabase and storage setup

The app expects Supabase Auth and application data objects. The code references these tables:

- `profiles`
- `appointments`
- `health_records`
- `symptom_entries`
- `emergency_requests`
- `healthconnect_organizations`
- `healthconnect_memberships`
- `healthconnect_staff_applications`
- `healthconnect_record_grants`
- `healthconnect_conversations`
- `healthconnect_messages`

Staff workflows also call the database functions `healthconnect_bootstrap_organization` and `healthconnect_review_staff_application`.

**These names are references from application code, not a supplied schema.** This repository does not include migrations defining their columns, constraints, row-level security (RLS), indexes, grants, or function implementations. Before use, provide and review a schema that matches the queries, enforce least-privilege RLS for every sensitive table, and test that users cannot access another user's data. Never make privileged service-role credentials available to the browser.

Configure Supabase Auth's allowed redirect URLs for your local and deployed origins, including `/auth/callback`. Configure email confirmation according to your intended account flow.

Configure Vercel Blob for private file access and provide `BLOB_READ_WRITE_TOKEN` to the server runtime. Uploads are limited in code to 10 MB and accepted MIME types are verified from file signatures for PDF, PNG, JPEG, and plain text.

## Routes and API

### Pages

| Path | Behavior |
| --- | --- |
| `/` | Authentication when signed out; portal when signed in. Optional `?panel=` selects a portal section. |
| `/about` | Privacy and terms information. |
| `/appointments` | Redirects to `/?panel=appointments`. |
| `/records` | Redirects to `/?panel=records`. |
| `/profile` | Redirects to `/?panel=profile`. |
| `/dashboard` | Redirects to `/?panel=overview`. |
| `/hospitals` | Redirects to `/?panel=overview`; use the portal's facility discovery section. |
| `/auth/callback` | Exchanges the Supabase email-auth code for a session. |

Portal section names include `overview`, `appointments`, `records`, `symptoms`, `guide`, `emergency`, `profile`, `hospitals`, `messages`, and `staff`.

### API handlers

| Method and path | Purpose |
| --- | --- |
| `POST /api/chat` | Authenticated AI guide or symptom-information response. Conversations are limited and validated by the handler. |
| `POST /api/documents/upload` | Authenticated private upload; accepts PDF, text, PNG, or JPEG up to 10 MB. |
| `GET /api/documents/:id` | Retrieve an authenticated user's private document. |
| `DELETE /api/documents/:id` | Delete an authenticated user's document and its stored blob. |
| `POST /api/hospitals/nearby` | Search OpenStreetMap/Overpass around validated coordinates and a supported radius. |
| `GET, POST /api/staff/applications` | List or submit healthcare staff access applications. |
| `POST /api/staff/bootstrap` | Register a facility for an authorized bootstrap administrator. |
| `POST /api/staff/review` | Approve or reject a pending staff application, subject to authorization. |
| `DELETE /api/account/delete` | Delete the signed-in user's stored blobs and Supabase Auth account. |

All endpoints should be treated as authenticated application functionality, not a public API contract. Their behavior also relies on correctly configured Supabase policies and provider credentials.

## Development commands

```bash
pnpm dev       # Start the Next.js development server
pnpm lint      # Run ESLint
pnpm build     # Create a production build
pnpm start     # Serve a previously built app
```

There is no test script in `package.json` at this time.

## Security and privacy notes

- Health and identity information is sensitive. Use synthetic data during development and demonstrations.
- Verify Supabase RLS and authorization for each table and each user role; never treat UI hiding as an authorization control.
- Keep Supabase admin/secret keys, Blob tokens, and AI provider credentials in server-side environment configuration only.
- Document uploads use private Blob access and the API checks the signed-in user before file operations. Review deployment logs, retention, backups, access controls, and provider terms before handling real data.
- AI prompts and document contents may be processed by external AI providers when AI features are used. Review applicable provider policies and disclose this to users.
- Facility search sends coordinates to the Overpass API. Ask for user permission before using browser geolocation and make the data flow clear.
- The code's privacy notice is not a legal determination or compliance certification. Obtain qualified security, privacy, and legal review before any real-world healthcare deployment.

## Limitations

- No database migrations, SQL schema, or test suite are included in this repository. A fresh clone alone is not a complete backend deployment.
- Availability of database-backed features depends on the external Supabase project and its policies/functions.
- Appointment requests are not provider-confirmed bookings.
- Emergency callback submissions are saved in the account only; they do not contact an emergency service.
- The AI guide provides general information only and can be wrong. It must not be used for diagnosis, treatment decisions, or urgent triage.
- Public OpenStreetMap facility listings may be incomplete or inaccurate. Confirm information with the facility.
- The separate `healthconnect-app.tsx` component contains seeded demo data and browser-local state; it should not be confused with real patient records.
- No license file is currently included. Unless a license is added, do not assume the code is available for unrestricted reuse.

## Deployment

The app is a Next.js project and can be deployed to a compatible Node.js hosting platform. For a production deployment:

1. Provision and secure Supabase, Blob storage, and AI provider access.
2. Apply and audit the database schema, RLS policies, and required database functions in the target Supabase project.
3. Set environment variables in the hosting provider's server-side secret settings. Keep privileged keys out of client-visible variables.
4. Add the deployed `/auth/callback` URL to Supabase's allowed redirect URLs.
5. Run `pnpm build` and resolve any build or lint issues before release.
6. Test sign-up, confirmation, sign-in, authorization boundaries, upload/download/delete, account deletion, staff review, AI behavior, and failure cases using synthetic accounts and data.
7. Complete security, privacy, legal, accessibility, and operational review before allowing real health information.

## Contributing

1. Create a focused branch for your change.
2. Keep secrets and real personal/health information out of commits, test data, logs, screenshots, and pull requests.
3. Run `pnpm lint` and `pnpm build` before submitting a pull request.
4. Include tests or clear manual verification steps for behavior changes. Add automated tests as the project grows.
5. For changes to data access or health-information handling, describe the affected policies and privacy implications in the pull request.

## License

No license file is present in the repository. Add an appropriate `LICENSE` file before granting reuse rights or redistributing the project.
