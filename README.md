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

## MVP Backend Includes

- Signup/login with local JWT-style bearer tokens
- Business onboarding profile
- Template library
- Workflow activation and pause/resume
- Lead intake and webhook intake
- AI follow-up draft stub
- Approval queue
- Dashboard metrics and activity log
- Integration and billing placeholders

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

External tools are still demo-mode connectors until their credentials are configured. Production rollout still requires Supabase Auth/Postgres, a real AI provider call, Gmail OAuth and sending, Razorpay subscriptions, webhook verification, and deployment configuration.

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
