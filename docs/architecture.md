# System Architecture & Design

This document details the backend architectural design of FlowPilot AI, mapping operational flows, request lifecycles, and core business sequences.

---

## 1. High-Level System Architecture

FlowPilot AI splits tasks between request parsing (controllers), business operations (services), and storage synchronization (repositories).

```mermaid
graph TD
    Client[SPA Client / Webhooks]
    Server[server.js - Listener]
    App[src/app.js - Orchestration]
    RateLimit[rateLimit.middleware.js]
    Router[src/routes/index.js - Multiplexer]
    AuthMdl[auth.middleware.js]
    
    Routes[Feature Routes]
    Controllers[Feature Controllers]
    Services[Feature Services]
    Repo[repository.js - Datastore]
    
    Client --> Server
    Server --> App
    App --> RateLimit
    App --> Router
    Router --> AuthMdl
    AuthMdl --> Routes
    Routes --> Controllers
    Controllers --> Services
    Services --> Repo
```

---

## 2. Request Lifecycle

1. **TCP Connection**: Client requests are bound by the HTTP listener in `server.js`.
2. **Context Enrichment**: `src/app.js` tags the connection with a `requestId` and hooks a response listener for structured metrics.
3. **Throttling check**: In-memory rate limiting check.
4. **Multiplexing**: Central route index router delegates routing matches to sub-route handlers.
5. **Guard Verification**: Auth token decryption and validation checks.
6. **Controller Trigger**: Request buffers parsed, parameters validated, controller processes payloads.
7. **Transactional execution**: Business services perform work and commit writes.
8. **Error capture**: Central try-catch captures exceptions, hides debugging stacks in production, and returns uniform JSON error payloads.

---

## 3. Core Business Flows

### 3.1 Authentication Flow
Uses short-lived cryptographically signed JSON Web Tokens (JWT) to secure user requests.

```mermaid
sequenceDiagram
    participant Client
    participant Controller
    participant Service
    participant Database

    Client->>Controller: POST /api/auth/login
    Controller->>Service: Validate email & password hash
    Service->>Database: Query user record
    Database-->>Service: User record
    Service-->>Controller: Login verified
    Controller->>Service: Sign token { sub: userId }
    Service-->>Controller: JWT string
    Controller-->>Client: Response (JWT + User Profile)
```

### 3.2 Google OAuth Flow
Links workspaces to Google logins and establishes OAuth email permissions.

```mermaid
sequenceDiagram
    participant Client
    participant API as API Server
    participant Google as Google OAuth API

    Client->>API: GET /api/auth/google
    API->>API: Sign state token (anti-forgery check)
    API-->>Client: Redirect to Google authorization URL
    Client->>Google: Authorization Grant Approve
    Google-->>Client: Redirect with Auth Code & state
    Client->>API: GET /api/auth/google/callback
    API->>API: Verify state signature
    API->>Google: POST code exchange
    Google-->>API: Access & Refresh Tokens
    API->>Google: GET user profile (email)
    Google-->>API: User email & id
    API->>API: Link account & encrypt credentials
    API-->>Client: Redirect to app with JWT
```

### 3.3 Gmail Inbox Lead Synchronization
Background scheduler polls Gmail messages to ingest lead records automatically.

```mermaid
sequenceDiagram
    participant API as API Server
    participant Google as Gmail API
    participant UserSvc as User Service
    participant Repo as Repository DB

    API->>API: Load user Gmail integration
    API->>API: Refresh token if expired
    API->>Google: GET message threads list
    Google-->>API: Threads array
    loop Thread Parsing
        API->>Google: GET raw message content
        Google-->>API: RFC 822 message payload
        API->>API: Parse sender header & body text
        API->>UserSvc: createLeadApproval()
        UserSvc->>Repo: Insert new Lead (status: new)
        UserSvc->>Repo: Generate and save follow-up Draft
    end
```

### 3.4 Lead Intake Processing & AI Draft Generation
Handles lead registration and proposed follow-up messages.

```mermaid
flowchart TD
    Inbound[Inbound Lead: manual/webhook/WhatsApp]
    Validate[Validate payload: name, email, query]
    SaveLead[Save Lead in DB - status: new]
    LoadBiz[Load Business tone & name profile]
    CheckGroq{Is Groq Key configured?}
    
    CallGroq[Call Groq LLM API with tone prompts]
    CallLocal[Generate draft using local template fallback]
    SaveDraft[Save Draft in approvals DB - status: pending]
    Log[Log Activity: lead.created]
    SyncHubspot[Sync lead contact to HubSpot CRM]
    
    Inbound --> Validate
    Validate --> SaveLead
    SaveLead --> LoadBiz
    LoadBiz --> CheckGroq
    CheckGroq -- Yes --> CallGroq
    CheckGroq -- No --> CallLocal
    CallGroq & CallLocal --> SaveDraft
    SaveDraft --> Log
    Log --> SyncHubspot
```

### 3.5 Approval Workflow
Ensures human-in-the-loop validation before automated communications are sent.

```mermaid
stateDiagram-v2
    [*] --> New : Lead Created
    New --> Pending : AI Draft Prepared
    
    state Pending {
        [*] --> AwaitingReview
        AwaitingReview --> EditDraft : User edits text
    }
    
    Pending --> Approved : POST /approve
    Pending --> Rejected : POST /reject
    
    Approved --> EmailSent : Dispatch via Gmail API
    Rejected --> NeedsReview : Flag lead for review
    
    EmailSent --> [*]
    NeedsReview --> [*]
```

---

## 4. Integration Architecture

FlowPilot integrates with third-party SaaS services:

1. **Meta WhatsApp Business Webhooks**:
   - Inbound endpoint verified using `WHATSAPP_VERIFY_TOKEN`.
   - Incoming messages trigger HMAC-SHA256 signature checks using `WHATSAPP_APP_SECRET`.
   - Messages are parsed and ingested as leads under the workspace owner account.
2. **HubSpot CRM API**:
   - Outbound contact sync exchanges HubSpot OAuth codes, persists refresh credentials, and pushes contact payloads (email, name, phone) on lead creations.
3. **Razorpay Billing**:
   - Creates active subscription plans via API keys.
   - Receives subscription state triggers (payment success/failures) verified via `RAZORPAY_WEBHOOK_SECRET` signatures.
