# FlowPilot AI

AI-powered workflow automation platform for small businesses, startups, and solo founders.

## Current State

- Static frontend prototype: `flowdesk_full_frontend.html`
- Dependency-free Node backend MVP: `backend/server.js`
- Local JSON datastore for development: `backend/data/store.json`

## Start Backend + Frontend

```bash
node backend/server.js
```

Open:

```text
http://localhost:8787
```

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