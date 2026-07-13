# Launch Readiness Audit

This document audits the deployment readiness of FlowPilot AI, mapping blockers, missing infrastructure, and launch risk scores.

---

## 1. What is Currently Deployable
- **Frontend App:** The Next.js web application is ready to deploy to **Vercel** (`apps/web` root directory). It compiles successfully and correctly points to the `NEXT_PUBLIC_API_URL` environment variables.
- **Backend API:** The modularized native Node.js API can deploy to **Render** via the configured `render.yaml` blueprint mapping.
- **Database Migrations:** The migration runner (`backend/migrate.js`) can successfully target and apply the core document-store Postgres table (`flowpilot_records`) to Supabase or any standard PostgreSQL instance.
- **E2E Smoke Suite:** The test suite (`backend/test.js`) verifies all routing lifecycles and controller integrations pass cleanly.

---

## 2. Launch Blockers

### 2.1 Deployment Blockers:
- **Google Console Verification:** The Google OAuth redirect URI limits are restricted. Production requires registering public domains (e.g. `https://api.flowpilot.ai/api/auth/google/callback`) and undergoing Google App Verification to bypass the "Unverified App" warnings on client consents.
- **Hardcoded local origins:** Several webhook checks and state builders rely on fallback local variables if public ones fail to map, which can lead to route callbacks routing to localhost in staging.

### 2.2 Blockers to Real Users:
- **No Background Sync Cron:** Syncing inbox leads only works when the client keeps the dashboard open and manually clicks "Sync inbox now". Real users will not receive automation value unless the server pulls leads 24/7.
- **Whole-Store Database Rewrite (`repository.js`):** Every database update truncates the entire table. If two concurrent users save workspace data, they block on advisory locks or trigger transaction timeouts, causing complete loss of active databases.
- **Shared Decryption Salt:** All client Google credentials utilize a single global key `TOKEN_ENCRYPTION_KEY`. This blocks multi-tenant security requirements.

---

## 3. Infrastructure & Control Gaps

### 3.1 Missing Production Infrastructure:
- **Cache & Message Broker:** Missing Redis or Memcached instances to support active task queues, rate-limit buckets, and distributed schedules.
- **Normalized Relational Store:** The current setup simulates a document store inside a single Postgres table. We are missing structured Postgres tables (`users`, `leads`, `workflows`) mapping data to rows and columns.

### 3.2 Missing Monitoring & Alerts:
- **Uncaught Exception Sentry Hook:** Errors are logged to stdout using Winston, but there are no alert hookups (like Sentry or Datadog) to ping engineering teams on high-priority HTTP 500 crashes.
- **Audit Logging Alerts:** No systems monitor failed logins or unauthorized webhook attempts (e.g. invalid Razorpay signatures).

### 3.3 Missing Security Controls:
- **Unique Cryptographic Derivation:** Missing User-Scoped Cryptographic Key Derivation (e.g. HKDF utilizing the user's password hash and system salt) to encrypt individual API keys.
- **No Strict CSRF Guards:** Session endpoints lack CSRF protection flags.
- **MFA:** No multi-factor authentication support.

---

## 4. Launch Risk Score

We score the launch risks from **0 (No Risk)** to **100 (Immediate Outage / Catastrophic Risk)**:

### 4.1 MVP Launch (Trial Demo / Developer Walkthrough)
- **Score:** **20 / 100** (Low Risk)
- **Status:** Deployable. In local/single-user sandbox setups, the json-store or postgres-mock table works deterministically without concurrency collision.

### 4.2 Beta Launch (First 5-10 Real Users)
- **Score:** **75 / 100** (High Risk)
- **Status:** Blocked. Concurrent writes will lock transaction pipelines. If users sync Gmail threads at the same time, database locks will cause API timeouts.

### 4.3 Production Launch (Commercial SaaS Release)
- **Score:** **98 / 100** (Critical Risk)
- **Status:** Strictly Blocked. High latency from whole-store DB truncating, lack of multi-tenant row isolation, single-key credential encryption, and manual Gmail syncing make commercial launch impossible.
