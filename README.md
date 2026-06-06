# FlowPilot AI

AI-powered workflow automation platform for small businesses, startups, and solo founders.

## Current State

- Static frontend prototype: `flowdesk_full_frontend.html`
- Dependency-free Node backend MVP: `backend/server.js`
- Local JSON datastore for development: `backend/data/store.json`
- Next.js App Router frontend: `apps/web`
- Supabase/Postgres starter schema: `supabase/schema.sql`

## Start Backend + Frontend

```bash
node backend/server.js
```

In a second terminal, start the Next.js frontend:

```bash
npm run dev:web
```

Open `http://localhost:3000` for the Next.js app.

The original prototype remains available from the backend at `http://localhost:8787`.

## Test

```bash
node backend/test.js
```

## Product Backend Includes

- Signup/login with local JWT-style bearer tokens
- Business onboarding profile
- Template library
- Workflow activation and pause/resume
- Lead intake and secret-protected public webhook intake
- Groq AI follow-up drafts with a local fallback
- Approval queue
- Dashboard metrics and activity log
- Razorpay subscription creation, Checkout handoff, and signed webhook processing
- Duplicate Razorpay webhook protection
- Production-readiness status in workspace settings

## Supabase Migration

1. Create a Supabase project.
2. Add the session-pooler `DATABASE_URL` and migration `DIRECT_URL` to `.env`.
3. Run `npm run migrate`.
4. Copy `apps/web/.env.local.example` to `apps/web/.env.local`.
5. Add your Supabase URL and publishable key.

When `DATABASE_URL` is present, the backend uses the Supabase Postgres repository. Without it, local development and automated tests continue to use the ignored JSON runtime store. The public sandbox seed works in both modes.

## Local MVP Demo

The Next.js workspace now supports a complete local demonstration:

1. Create an account or log in.
2. Add a business profile.
3. Activate the Lead Follow-up template.
4. Capture a test lead.
5. Review and edit the generated follow-up draft.
6. Approve the draft to simulate sending it.
7. Confirm dashboard metrics, workflow runs, and activity logs update.

Gmail, WhatsApp, and HubSpot buttons use sandbox behavior until their OAuth flows are configured. Groq AI and Razorpay subscriptions become live automatically when their environment variables are provided and the disabling flags are turned off.

## Public Resume Sandbox

For a resume or portfolio link, keep the public sandbox enabled. Visitors land in a safe seeded workspace without needing credentials, and setup/payment screens are hidden from the sandbox experience.

1. Start the API with `npm run dev:api`.
2. Start the web app with `npm run dev:web`.
3. Open `http://localhost:3000` to load the sandbox automatically.
4. Alternatively, open `http://localhost:3000/?sandbox=1` or click **Try FlowPilot**.
5. Show the dashboard metrics and recent activity.
6. Open **Approvals**, edit Sarah Chen's AI-style draft, and click **Approve and send**.
7. Return to **Dashboard** to show the pending approval count drop to zero.
8. Open **Automations** to show the Lead Follow-up run count increase.
9. Use **Reset sandbox** in the sidebar before another walkthrough.

The sandbox is deterministic sample data. It does not call paid providers or send real email when `DISABLE_REAL_EMAIL_SEND=true`.

Portfolio deployment flags:

```env
PUBLIC_SANDBOX_ENABLED=true
DISABLE_BILLING=true
DISABLE_REAL_EMAIL_SEND=true
NEXT_PUBLIC_PUBLIC_SANDBOX_ENABLED=true
NEXT_PUBLIC_HIDE_PROVIDER_SETUP=true
```

For a public portfolio sandbox, the backend can run without Supabase only when you explicitly set:

```env
ALLOW_JSON_STORE_IN_PRODUCTION=true
```

Use that flag only for demo deployments with seeded data. For a durable production workspace, add Supabase `DATABASE_URL` and keep `ALLOW_JSON_STORE_IN_PRODUCTION=false`.

## India-First Free-Tier Stack

- Database and auth: Supabase Free
- Frontend deployment: Vercel Hobby during development
- AI drafts: Groq Free Plan during MVP testing
- Email: Gmail API within its quota limits
- Billing: Razorpay Test Mode during development; live payments are pay-as-you-go

Razorpay billing configuration:

```env
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
RAZORPAY_PLAN_ID=
```

## Production Configuration

Create your local environment file:

```bash
copy .env.example .env
```

Required before deploying:

```env
APP_ORIGIN=https://your-frontend-domain.example
API_PUBLIC_URL=https://your-api-domain.example
JWT_SECRET=generate-a-long-random-secret
TOKEN_ENCRYPTION_KEY=generate-a-separate-long-random-secret
MAX_BODY_BYTES=1048576
AUTH_RATE_LIMIT=12
API_RATE_LIMIT=180
GROQ_API_KEY=
LEAD_WEBHOOK_SECRET=generate-a-separate-random-secret
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
RAZORPAY_PLAN_ID=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

Generate secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Use this endpoint for website lead ingestion:

```text
POST /api/webhooks/lead/:workspaceUserId
X-FlowPilot-Webhook-Secret: your-lead-webhook-secret
```

Configure Razorpay to send subscription webhook events to:

```text
POST /api/webhooks/razorpay
```

The backend validates `X-Razorpay-Signature` and deduplicates events using `X-Razorpay-Event-Id`.

## Account Security

The API includes:

- Password hashing with Node `scrypt`
- Short-lived JWT bearer tokens
- One-time email-verification tokens
- One-time password-reset tokens
- Optional verification and recovery delivery through Resend
- Local development outbox fallback when Resend is not configured
- Per-IP rate limiting for authentication and general API routes
- One-megabyte request body limits by default
- Security headers and request IDs
- Structured JSON request and error logs
- Production startup validation for database and secret configuration

Configure account email delivery before production:

```env
RESEND_API_KEY=
RESEND_FROM_EMAIL=FlowPilot <no-reply@your-verified-domain.example>
```

Run the Postgres migration:

```bash
npm run migrate
```

Gmail and HubSpot OAuth callback URLs:

```text
GET /api/oauth/gmail/callback
GET /api/oauth/hubspot/callback
```

WhatsApp Cloud API webhook URL:

```text
GET|POST /api/webhooks/whatsapp
```

Set `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, and `WHATSAPP_OWNER_USER_ID` before registering the webhook in Meta.

## Remaining Production Work

- Add WhatsApp outbound replies if you want approvals to answer on WhatsApp as well as Gmail.
- Deploy the API and web app, then configure public webhook URLs.

## Free Deployment Plan

Recommended free/portfolio setup:

- Frontend: Vercel Hobby, root directory `apps/web`
- Backend API: Render/Railway/Fly-style Node web service running `npm start`
- Database: optional for the portfolio sandbox; Supabase Free for durable production

Vercel environment variables for `apps/web`:

```env
NEXT_PUBLIC_API_URL=https://your-api-domain.example
NEXT_PUBLIC_PUBLIC_SANDBOX_ENABLED=true
NEXT_PUBLIC_HIDE_PROVIDER_SETUP=true
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Backend environment variables for a free Node service:

```env
NODE_ENV=production
APP_ORIGIN=https://your-vercel-domain.vercel.app
API_PUBLIC_URL=https://your-api-domain.example
PUBLIC_SANDBOX_ENABLED=true
DISABLE_BILLING=true
DISABLE_REAL_EMAIL_SEND=true
ALLOW_JSON_STORE_IN_PRODUCTION=true
DATABASE_URL=
DIRECT_URL=
JWT_SECRET=
TOKEN_ENCRYPTION_KEY=
LEAD_WEBHOOK_SECRET=
GROQ_API_KEY=
```

Apply the Supabase migration before deploying the backend:

```bash
npm run migrate
```

Portfolio sandbox deployment order:

1. Deploy the backend API first. The included `render.yaml` can create a Render web service.
2. Set `APP_ORIGIN` on the backend to your final Vercel URL, for example `https://flowpilot-ai.vercel.app`.
3. Set `API_PUBLIC_URL` on the backend to the backend service URL.
4. Deploy the frontend from `apps/web` on Vercel.
5. Set `NEXT_PUBLIC_API_URL` on Vercel to the backend service URL.
6. Open the Vercel app. With `NEXT_PUBLIC_PUBLIC_SANDBOX_ENABLED=true`, visitors should land in the safe sandbox workspace automatically.
