# FlowPilot Backend

This is the first backend slice for the FlowPilot AI MVP. It is intentionally dependency-free so it can run on this machine with the current Node install.

## Run

```bash
node backend/server.js
```

The API and the current static frontend are served at:

```text
http://localhost:8787
```

## API Surface

- `GET /health`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/me`
- `POST /api/onboarding/business`
- `GET /api/templates?q=lead`
- `POST /api/workflows/from-template`
- `PATCH /api/workflows/:id`
- `POST /api/leads`
- `POST /api/webhooks/lead`
- `GET /api/dashboard`
- `GET /api/activity`
- `POST /api/approvals/:id/approve`
- `POST /api/approvals/:id/reject`
- `POST /api/integrations/:provider/connect`
- `POST /api/ai/draft-follow-up`
- `POST /api/billing/portal`

Authenticated endpoints use:

```text
Authorization: Bearer <token from signup/login>
```

## Next Production Step

Replace `backend/data/store.json` with Postgres/Supabase repositories, then swap the local token and mock integration handlers for Clerk/Supabase Auth, real OAuth, Stripe webhooks, and a queued workflow runner.