# FlowPilot AI

FlowPilot AI is an AI-assisted workflow automation workspace for small businesses, startups, and solo founders. It helps teams capture leads, generate follow-up drafts, route approvals, track activity, and demonstrate automation workflows through a safe public sandbox.

Live demo:

```text
https://flowpilot-ai-web.vercel.app
```

Backend API:

```text
https://flowpilot-api.onrender.com
```

## Product Highlights

- Public sandbox mode for portfolio/recruiter review without requiring signup.
- Lead intake workflow with AI-generated follow-up drafts.
- Approval queue where users can edit and approve generated messages.
- Dashboard metrics for active automations, pending approvals, and activity.
- Workflow templates with activation, pause, resume, and run tracking.
- Business onboarding profile used to personalize draft tone.
- Provider setup screens for Gmail, WhatsApp, HubSpot, AI, email, and billing readiness.
- Razorpay subscription and webhook foundation for paid plans.
- Supabase/Postgres migration path for durable production storage.
- Local JSON store mode for deterministic demo and automated tests.

## Tech Stack

| Area | Tools |
| --- | --- |
| Frontend | Next.js App Router, React, TypeScript, Tailwind CSS |
| Backend | Node.js HTTP API, local JWT-style auth, structured logging |
| Database | Local JSON store for demo/testing, Supabase/Postgres migration path |
| AI | Groq API with local fallback draft generation |
| Billing | Razorpay subscription foundation |
| Deployment | Vercel frontend, Render API |

## Repository Structure

```text
flowpilot-ai/
|-- apps/
|   `-- web/                 # Next.js web app
|-- backend/
|   |-- server.js            # API server
|   |-- repository.js        # Store abstraction
|   |-- postgres.js          # Postgres/Supabase path
|   |-- migrate.js           # Migration runner
|   |-- test.js              # Backend smoke tests
|   `-- data/store.json      # Seed/demo data
|-- supabase/schema.sql      # Database schema
|-- flowdesk_full_frontend.html
|-- render.yaml
|-- package.json
`-- README.md
```

## Local Setup

Install dependencies:

```bash
npm install
```

Create environment files:

```bash
copy .env.example .env
copy apps/web/.env.local.example apps/web/.env.local
```

Start the API:

```bash
npm run dev:api
```

Start the web app in another terminal:

```bash
npm run dev:web
```

Open:

```text
http://localhost:3000
```

The original static prototype is also served by the backend at:

```text
http://localhost:8787
```

## Public Sandbox Flow

The sandbox is the recommended portfolio walkthrough:

1. Open the live app or local frontend.
2. Click **Try FlowPilot** or open with `?sandbox=1`.
3. Review dashboard metrics and recent activity.
4. Open Approvals and approve/edit the seeded AI follow-up draft.
5. Return to Dashboard to see the pending approval count update.
6. Open Automations to inspect workflow status and run counts.
7. Use Reset Sandbox before another walkthrough.

Sandbox mode does not send real emails or trigger paid provider actions when these flags are enabled:

```env
PUBLIC_SANDBOX_ENABLED=true
DISABLE_BILLING=true
DISABLE_REAL_EMAIL_SEND=true
NEXT_PUBLIC_PUBLIC_SANDBOX_ENABLED=true
NEXT_PUBLIC_HIDE_PROVIDER_SETUP=true
```

For a public demo deployment without Supabase, explicitly set:

```env
ALLOW_JSON_STORE_IN_PRODUCTION=true
```

Use that only for seeded portfolio demos. For a durable production workspace, use Supabase/Postgres and keep JSON-store production mode disabled.

## Environment Variables

Important backend values:

```env
PORT=8787
APP_ORIGIN=http://localhost:3000
API_PUBLIC_URL=http://localhost:8787
JWT_SECRET=replace-with-a-long-random-secret
TOKEN_ENCRYPTION_KEY=replace-with-a-separate-long-random-secret
LEAD_WEBHOOK_SECRET=replace-with-a-random-secret
GROQ_API_KEY=
DATABASE_URL=
DIRECT_URL=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

Important frontend values:

```env
NEXT_PUBLIC_API_URL=http://localhost:8787
NEXT_PUBLIC_PUBLIC_SANDBOX_ENABLED=true
NEXT_PUBLIC_HIDE_PROVIDER_SETUP=true
```

Generate long secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Supabase Migration Path

1. Create a Supabase project.
2. Add `DATABASE_URL` and `DIRECT_URL` to `.env`.
3. Run the migration:

```bash
npm run migrate
```

When `DATABASE_URL` is present, the backend uses the Postgres repository. Otherwise, local development and tests use the JSON store.

## Commands

```bash
npm run dev:api
npm run dev:web
npm run build:web
npm run lint:web
npm test
npm run migrate
```

## Deployment Notes

### Render API

Use:

```text
Build command: npm install
Start command: npm start
```

Required public demo values:

```env
NODE_ENV=production
APP_ORIGIN=https://flowpilot-ai-web.vercel.app
API_PUBLIC_URL=https://flowpilot-api.onrender.com
PUBLIC_SANDBOX_ENABLED=true
DISABLE_BILLING=true
DISABLE_REAL_EMAIL_SEND=true
ALLOW_JSON_STORE_IN_PRODUCTION=true
```

### Vercel Web

Set the root directory to:

```text
apps/web
```

Use:

```env
NEXT_PUBLIC_API_URL=https://flowpilot-api.onrender.com
NEXT_PUBLIC_PUBLIC_SANDBOX_ENABLED=true
NEXT_PUBLIC_HIDE_PROVIDER_SETUP=true
```

## Security and Production Notes

- Passwords are hashed with Node `scrypt`.
- Bearer tokens are signed and short-lived.
- Email verification and password reset tokens are one-time use.
- Request IDs, structured logs, rate limits, and body-size limits are included.
- Razorpay webhooks are signature-verified and duplicate-protected.
- Public sandbox mode is intentionally separated from durable production mode.

## Portfolio Context

FlowPilot appears in my portfolio as a SaaS automation project focused on:

- AI-assisted workflow automation
- Approval-driven human-in-the-loop UX
- Public sandbox deployment
- Full-stack product architecture
- Production-readiness thinking

## Author

Raj Tiwari  
GitHub: https://github.com/Rajtiwari0202  
Portfolio: https://rajtiwari0202.github.io/my_portfolio/
