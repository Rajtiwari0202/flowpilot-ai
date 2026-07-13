# Project Directory Tree Map

This document outlines the codebase map of FlowPilot AI, detailing the modular structure of the backend and frontend components.

---

```
flowpilot-ai/
├── apps/
│   └── web/                               # Next.js Frontend Application
│       ├── package.json                   # Dependencies: Next, Tailwind, Supabase Client
│       └── src/
│           ├── app/
│           │   ├── globals.css            # Stylesheets
│           │   ├── layout.tsx             # Root layout
│           │   └── page.tsx               # Monolithic frontend dashboard & screens (42KB React view)
│           └── lib/
│               ├── api.ts                 # API utility injecting JWT credentials
│               └── supabase.ts            # Supabase browser client builder
├── backend/                               # Native Node.js API Backend
│   ├── migrate.js                         # Migration execution runner script
│   ├── repository.js                      # Database adapter (JSON files or Postgres collections)
│   ├── server.js                          # Port binder and entry-point bootstrapper (22 lines)
│   ├── test.js                            # Automated smoke integrations test suite
│   ├── data/
│   │   └── store.json                     # Seed store data template
│   └── src/
│       ├── app.js                         # Request lifecycle and store connection orchestrator (66 lines)
│       ├── config/
│       │   └── env.js                     # Global variables configuration and checks
│       ├── controllers/
│       │   ├── auth.controller.js         # Parses requests and responds for auth routes
│       │   ├── gmail.controller.js        # Formats parameters and responds for inbox syncs
│       │   └── user.controller.js         # Controls leads, dashboards, workflows, and webhooks
│       ├── middleware/
│       │   ├── auth.middleware.js         # JWT validators and endpoint guards
│       │   └── rateLimit.middleware.js    # Client connection throttlers
│       ├── routes/
│       │   ├── index.js                   # Primary gateway redirecting to sub-routes
│       │   ├── auth.routes.js             # Routes logins, signups, Google callbacks
│       │   ├── gmail.routes.js            # Routes Gmail trigger actions
│       │   ├── integrations.routes.js     # Routes Meta, Razorpay webhooks, integrations connect
│       │   └── users.routes.js            # Routes dashboard feeds, workflows, leads, approvals
│       ├── services/
│       │   ├── auth.service.js            # Outbox delivery, auth tokens, demo workspace builders
│       │   ├── gmail.service.js           # RFC email encoders, Gmail lists/sends
│       │   ├── jwt.service.js             # JWT keys encoders/decoders
│       │   ├── oauth.service.js           # Google URL redirections, token refreshers, HubSpot syncs
│       │   └── user.service.js            # Workspace analytics, AI drafting, lead creation
│       └── utils/
│           ├── crypto.js                  # Scrypt passwords, AES ciphers, SHA token hashes
│           ├── helpers.js                 # Parse body hooks, ID builders, status responders
│           └── logger.js                  # Structured logs wrapper
├── docs/                                  # Audits and architectural documents
│   ├── FEATURE_STATUS.md                  # Features maturity report
│   ├── DATABASE_SCHEMA.md                 # Physical & logical persistence schemas
│   ├── PROJECT_TREE.md                    # Current tree map file
│   └── architecture.md                    # System designs and request life cycles
├── supabase/
│   ├── schema.sql                         # Reference database schema
│   └── migrations/
│       └── 202606020001_flowpilot_core.sql # Live Postgres table definition migration
├── package.json                           # Root workspace configuration
└── render.yaml                            # Staging/production infrastructure mapping
```
