# Product Gap Analysis

This document compares FlowPilot AI's codebase against the core product promise of an automated AI operations copilot for small businesses.

---

## The Core Promise

```
Email arrives  ──>  Lead created  ──>  AI draft generated  ──>  Approval queue  ──>  Send email  ──>  Activity logged
```

---

## 1. Step-by-Step Flow Evaluation

### 1.1 Step 1: Email Arrives
- **Status:** **Partially Implemented**
- **Existing Code:** `backend/src/services/gmail.service.js` has `syncGmailInbox()`, which queries Google Gmail API list/get endpoints.
- **Gaps & Fakes:** There is no background worker (cron, daemon, or serverless scheduler) running in the API server. Inbound emails are only fetched if a user manually clicks **"Sync inbox now"** in the integrations panel, or triggers `POST /api/integrations/gmail/sync`. If the client closes the browser, the automation stops.

### 1.2 Step 2: Lead Created
- **Status:** **Production Ready (Local) / Bottlenecked (DB)**
- **Existing Code:** `backend/src/services/user.service.js` contains `createLeadApproval()`, which appends new leads to the database.
- **Gaps & Fakes:** While functional, database writes are blocked by O(N) whole-store serialization truncates.

### 1.3 Step 3: AI Draft Generated
- **Status:** **Production Ready**
- **Existing Code:** `backend/src/services/user.service.js` has `draftFollowUp()`, connecting to Groq chat completions using `llama-3.3-70b-versatile`.
- **Gaps & Fakes:** Personalization is limited to preset buttons (Professional/Friendly). Prompt templates are hardcoded in the codebase; business owners cannot customize the instructions or supply custom context documents.

### 1.4 Step 4: Approval Queue
- **Status:** **Production Ready**
- **Existing Code:** Frontend approval panels map approvals and render textareas for inline editing, calling `/api/approvals/:id/approve`.
- **Gaps & Fakes:** Queue features are basic. There are no options to filter, search, label, or bulk-approve drafts.

### 1.5 Step 5: Send Email
- **Status:** **Production Ready**
- **Existing Code:** `backend/src/services/gmail.service.js` encodes mail bodies to RFC 2822 base64 url formats and calls Google SMTP dispatch endpoints.
- **Gaps & Fakes:** In local sandbox mode, sending real emails is bypassed by the `REAL_EMAIL_SEND_DISABLED` variable to prevent accidental spamming during trials.

### 1.6 Step 6: Activity Logged
- **Status:** **Production Ready**
- **Existing Code:** `logActivity()` writes structured audit objects to log listings.
- **Gaps & Fakes:** Clean, structured logging is implemented.

---

## 2. Customer Readiness Assessment

### Can a real customer use this today?
**PARTIALLY**

### Why:
1. **Lack of Automated Scheduling (Product Gap):** An automation copilot must run unattended. Currently, syncing Gmail leads requires manual client button triggers. A real business needs a background daemon or event webhook to ingest leads 24/7.
2. **Database Concurrency Risks (Technical Gap):** The whole-database rewrite transaction pattern locks the table on every write call. If multiple users execute requests concurrently, the server will experience high latency and database advisory lock timeouts.
3. **No Multi-Tenant Database Isolation:** There is no schema-level user data isolation or indexed collections. All workspaces share a single database table loaded into the server process memory context. This is suitable for self-hosted instances but not as a commercial multi-tenant SaaS application.
4. **WhatsApp Dispatching is Missing:** Inbound WhatsApp webhooks ingest messages, but there is no outbound WhatsApp service to reply. The approval queue is Gmail-only.
