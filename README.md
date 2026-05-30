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
4. Add your Supabase URL and anonymous key.

The backend still uses the local JSON store while the Supabase repositories and Auth migration are built incrementally.
