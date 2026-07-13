# Background Automation Architecture Plan

This document evaluates the options for persistent background automation and designs a production-grade scheduler for FlowPilot AI's inbox sync workflow.

---

## 1. Evaluation of Scheduling Options

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Option A: `node-cron`** | Simple; zero configuration; runs inside the existing server process memory. | If the Render server process sleeps or restarts, schedules clear. Scales poorly; if multiple server instances run, they will run duplicates simultaneously. | **Rejected** (Unreliable for multi-instance SaaS) |
| **Option B: BullMQ + Redis** | Industry standard SaaS pattern. Stores state durably. Distributes jobs across separate worker processes. Prevents duplicate execution. Handles retries and failure states natively. | Requires a managed Redis instance. | **RECOMMENDED (Winner)** |
| **Option C: Render Cron Jobs** | Native cloud scheduler; separates HTTP traffic from polling processes. | Spins up a new container instance on every trigger. Cold starts take 1-2 minutes, which is wasteful and costly for frequent 5-minute poll tasks. | **Rejected** (Too slow and expensive) |
| **Option D: Vercel Cron** | Simple serverless configuration. | Limits execution to serverless timeouts (10s-60s). Large inbox syncs will time out. | **Rejected** (Timeout limits) |

---

## 2. Recommended Solution: BullMQ + Redis

We will implement a distributed queue architecture utilizing **BullMQ** and **Redis**. This decouples incoming HTTP requests from heavy background sync tasks (Gmail scanning and LLM prompt generation).

```
                 ┌────────────────────────────────┐
                 │    Render API Server (Web)     │
                 └──────────────┬─────────────────┘
                                │ (Enqueue Sync Jobs)
                                ▼
                       ┌────────────────┐
                       │  Managed Redis │
                       └────────┬───────┘
                                │ (Dequeue Sync Jobs)
                                ▼
                 ┌────────────────────────────────┐
                 │   Render Background Worker     │
                 └────────────────────────────────┘
```

---

## 3. Implementation Blueprint

### 3.1 Schedules
- **Active Workspace Sync:** Triggered every **5 minutes** for users with connected Gmail integrations.
- **Inbound WhatsApp Sync:** Real-time (Meta pushes webhooks instantly to the web node, which parses inputs and enqueues a quick user follow-up job to BullMQ immediately).
- **Outbox Email Delivery:** Executed every **1 minute** to check and flush the `outbox` mail queue.

### 3.2 Retry Strategy
- **Exponential Backoff:** If the Gmail API returns a rate limit block (HTTP 429) or temporary network failure, BullMQ retries the job:
  - **Attempts:** 5 retries.
  - **Delay Formula:** \(2^{\text{attempt}} \times 10\) seconds (e.g. 20s, 40s, 80s...).
- **Network Timeout:** Individual fetch calls time out after 15 seconds.

### 3.3 Failure Handling
- **Dead Letter Queue (DLQ):** After 5 failed attempts, the job is moved to the `Failed` state.
- **Auto-Disable Integration:** If a sync job fails repeatedly with a Google authentication error (e.g. invalid tokens or user revoked credentials), the database updates the integration status to `needs_reauthorization` and logs a warning activity. A UI banner will prompt the user to reconnect their Google account.

### 3.4 Logging & Monitoring
- **Structured JSON Logging:** Sync start, fetch counts, LLM complete speeds, and errors are written to stdout:
  ```json
  {"level":"info","event":"sync.gmail.started","userId":"usr_123","time":"2026-07-12T18:00:00Z"}
  {"level":"info","event":"sync.gmail.completed","userId":"usr_123","leadsFound":2,"time":"2026-07-12T18:01:05Z"}
  ```
- **Queue Dashboards:** Integrate `Bull-Board` UI (secured via admin authentication credentials) on the backend server at `/admin/queues` to let developer teams inspect active, delayed, and failed jobs manually.
- **Sentry Alerts:** If background sync tasks crash due to unhandled exceptions, the error boundary reports the error directly to Sentry.
