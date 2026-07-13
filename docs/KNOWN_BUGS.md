# Known Code Issues & Risk Analysis

This document details known structural risks, concurrency issues, edge cases, and technical debts discovered during auditing of the codebase.

---

## 1. Critical Risks

### 1.1 Database Snapshot Re-write Collisions (`backend/repository.js`)
- **Issue:** Every single write query to the Postgres database truncates the `flowpilot_records` table and inserts all collections back from scratch. It uses a single advisory lock (`721904`) to prevent write collisions.
- **Risk:** In a multi-user environment, parallel write requests block waiting on this lock. If a write fails or times out during the transaction insert loop, the table remains truncated, causing catastrophic loss of workspace data.

### 1.2 Global Key Credentials Storage (`backend/src/services/oauth.service.js`)
- **Issue:** All credentials for third-party tools (Gmail, HubSpot tokens) are encrypted with a single shared secret: `TOKEN_ENCRYPTION_KEY`.
- **Risk:** Compromise of this single environment variable decrypts the integration tokens of every customer. There is no user-specific salt or cryptographic key derivation mapping.

### 1.3 Concurrency Failures on Sandbox Resets (`backend/src/services/auth.service.js`)
- **Issue:** Seeding/resetting the sandbox workspace deletes all rows in the memory snapshot where `userId === 'usr_demo_founder'` and replaces them with demo values.
- **Risk:** If two concurrent guests hit "Reset Sandbox" simultaneously, they compete for the advisory write lock. When the second transaction commits, it truncates the table and re-inserts identical static record IDs (e.g. `lead_demo_sarah`), throwing Postgres Primary Key Conflict exceptions or corrupting active sandbox sessions.

---

## 2. High Risks

### 2.1 In-Memory Rate Limiting Reset (`backend/src/middleware/rateLimit.middleware.js`)
- **Issue:** Throttling uses a simple in-memory JavaScript cache block.
- **Risk:** Any server restart (common on Render free tier due to inactivity sleep cycles) clears the cache, resetting request trackers and enabling DDoS bypasses.

### 2.2 Lack of Cascade Delete Constraints
- **Issue:** In SQL mode, database relationships are simulated by collection scopes. There are no relational foreign key delete constraints inside the active database migrations.
- **Risk:** Deleting a user row leaves orphan records (leads, workflows, approvals, activity logs) occupying disk space in the `flowpilot_records` table.

### 2.3 HubSpot Sync Inconsistency (`backend/src/services/user.service.js`)
- **Issue:** During `createLeadApproval()`, the database inserts the lead, generates the AI draft, and executes the HubSpot API post call in a try-catch block.
- **Risk:** If HubSpot fails or responds with a timeout, the API logs the exception and returns the lead to the client anyway. The state is inconsistent between the CRM and the local datastore.

---

## 3. Medium Risks

### 3.1 Hardcoded Network Timeouts
- **Issue:** External API integrations (Groq, Resend, HubSpot, Google APIs) utilize a hardcoded AbortSignal timeout (`12000` ms) without progressive retries.
- **Risk:** A momentary network drop or cold start delay causes the request to abort and throw exceptions to users, rather than attempting a retry.

### 3.2 Unbounded Storage Consumption
- **Issue:** Outbox notifications (`outbox` collection) and authentication tokens (`authTokens` collection) queue up inside the datastore database permanently.
- **Risk:** There is no job or worker task to periodically purge expired tokens and sent notification rows. The Postgres database size grows unbounded.

### 3.3 Loose Input Validation
- **Issue:** Signups only require the password to be at least 8 characters long.
- **Risk:** Weak passwords (e.g. `12345678`, `password`) are accepted, exposing accounts to brute-force vulnerabilities.

---

## 4. Low Risks

### 4.1 Webhook JSON Empty Fallback
- **Issue:** Inbound WhatsApp and Razorpay webhooks invoke `parseJson(raw)`, which silently returns `{}` on parse errors.
- **Risk:** If a webhook request payload is corrupt, it returns an empty object. Accessing nested fields like `body.entry` or `body.payload` does not crash due to optional chaining, but it fails silently, logging no warning.
