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
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `apps/web/.env.local.example` to `apps/web/.env.local`.
4. Add your Supabase URL and publishable key.

The backend still uses the local JSON store while the Supabase repositories and Auth migration are built incrementally.

## Local MVP Demo

The Next.js workspace now supports a complete local demonstration:

1. Create an account or log in.
2. Add a business profile.
3. Activate the Lead Follow-up template.
4. Capture a test lead.
5. Review and edit the generated follow-up draft.
6. Approve the draft to simulate sending it.
7. Confirm dashboard metrics, workflow runs, and activity logs update.

Gmail, WhatsApp, and HubSpot buttons remain demo connectors until their OAuth flows are configured. Groq AI and Razorpay subscriptions become live automatically when their environment variables are provided. Production rollout still requires the Supabase repository migration, provider OAuth applications, and deployment configuration.

## Recording Demo

For a clean product recording:

1. Start the API with `npm run dev:api`.
2. Start the web app with `npm run dev:web`.
3. Open `http://localhost:3000/?demo=1` to load a fresh demo automatically.
4. Alternatively, open `http://localhost:3000` and click **Launch recording demo**.
5. Show the dashboard metrics and recent activity.
6. Open **Approvals**, edit Sarah Chen's AI-style draft, and click **Approve and send**.
7. Return to **Dashboard** to show the pending approval count drop to zero.
8. Open **Automations** to show the Lead Follow-up run count increase.
9. Use **Reset demo** in the sidebar before recording another take.

The recording demo is deterministic local sample data. It does not call external providers or send a real email.

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
GROQ_API_KEY=
LEAD_WEBHOOK_SECRET=generate-a-separate-random-secret
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
RAZORPAY_PLAN_ID=
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

- Replace the JSON development repository with Supabase/Postgres queries using `supabase/schema.sql`.
- Add WhatsApp outbound replies if you want approvals to answer on WhatsApp as well as Gmail.
- Deploy the API and web app, then configure public webhook URLs.
