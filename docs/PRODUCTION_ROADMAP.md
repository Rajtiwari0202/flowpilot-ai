# Production Execution Roadmap

This roadmap outlines the prioritized engineering roadmap to transition FlowPilot AI from its current modular state to a commercial, production-ready SaaS product.

---

## Phase 1: Core Automation & Real User Sync (Weeks 1-2)
*Focus: Bringing real value to users without browser dependency.*

### Task 1.1: Persistent Background Gmail Sync Scheduler
- **Why it matters:** Ensures lead syncing runs 24/7. Users don't need to keep their browsers open.
- **Estimated Effort:** 1-2 days
- **Risk Level:** Low
- **Dependencies:** None

### Task 1.2: Production Google OAuth App Verification
- **Why it matters:** Removes the "Unverified App" browser warnings, allowing users to trust and connect their Gmail accounts.
- **Estimated Effort:** 3-5 days (depends on Google Console review timeline)
- **Risk Level:** Medium (Google review delays)
- **Dependencies:** Public domain DNS configurations and privacy policy setups.

---

## Phase 2: Database Reliability & Security (Weeks 2-3)
*Focus: Resolving lock timeouts, data loss risks, and credential exposures.*

### Task 2.1: Transition to O(1) Relational DB Layer
- **Why it matters:** Removes the `TRUNCATE` + bulk snapshot rewrite loop. Writes become granular (inserts, updates, deletes) which stops advisory write blocks.
- **Estimated Effort:** 3 days
- **Risk Level:** High (requires refactoring the data access layer in `repository.js` to individual tables: `users`, `leads`, `approvals`)
- **Dependencies:** None

### Task 2.2: User-Scoped Credential Key Derivation
- **Why it matters:** Derives a unique encryption key per user (using a PBKDF2 hash of user secrets + global salt) to encrypt Google tokens. If the database leaks, a hacker cannot decrypt any token without individual user passwords.
- **Estimated Effort:** 1 day
- **Risk Level:** Medium
- **Dependencies:** Task 2.1 (relational user table mapping)

---

## Phase 3: Revenue & Self-Service Monetization (Week 3)
*Focus: Enabling billing checkout and reducing administrative support queries.*

### Task 3.1: Activate Razorpay Production Credentials
- **Why it matters:** Swaps sandbox checkout credentials with live production merchant credentials to capture real subscription revenues.
- **Estimated Effort:** 1 day
- **Risk Level:** Medium (requires live checkout validation)
- **Dependencies:** Task 2.1 (for storing user plan upgrades reliably)

### Task 3.2: Self-Service Customer Billing Portal
- **Why it matters:** Allows users to cancel, upgrade, or view invoices without customer support manually intervening.
- **Estimated Effort:** 1-2 days
- **Risk Level:** Low
- **Dependencies:** Task 3.1

---

## Phase 4: Production Monitoring & Resiliency (Week 4)
*Focus: Crash visibility, database performance, and failover mechanisms.*

### Task 4.1: Sentry Integration for Error Tracking
- **Why it matters:** Sends instant slack/email notifications to engineering when the API throws uncaught HTTP 500 exceptions in production.
- **Estimated Effort:** 0.5 days
- **Risk Level:** Low
- **Dependencies:** None

### Task 4.2: Postgres DB Indices & GIN JSON Queries
- **Why it matters:** Speeds up dashboard loading queries. Prevents full-table scans when querying active leads and pending approvals.
- **Estimated Effort:** 1 day
- **Risk Level:** Low
- **Dependencies:** Task 2.1

### Task 4.3: Persistent Rate Limiting Cache (Redis)
- **Why it matters:** Migrates in-memory rate-limiter caches to Redis. Ensures rate throttling survives server restarts.
- **Estimated Effort:** 2 days
- **Risk Level:** Low
- **Dependencies:** Redis instance provisioned
