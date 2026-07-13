# Environment Variables Specifications

This document registers all required environment variables for the FlowPilot AI production environment.

---

## 1. Backend Core Variables (API Server)

These variables must be populated in the API Server deployment (e.g. Railway or Render dashboards).

| Variable Name | Required | Default / Staging | Description |
|---|---|---|---|
| **PORT** | Yes | `8080` | Port the native HTTP server binds to. Railway allocates this dynamically. |
| **NODE_ENV** | Yes | `production` | Prevents local stack leaks inside exception handlers. |
| **APP_ORIGIN** | Yes | `https://app.flowpilot.ai` | Allowed CORS header origin matching frontend SPA domains. |
| **API_PUBLIC_URL** | Yes | `https://api.flowpilot.ai` | Public URL routing API callback responses. |
| **JWT_SECRET** | Yes | *Generate secure key* | Signer secret validating JWT token sessions. |
| **TOKEN_ENCRYPTION_KEY**| Yes | *Generate secure key* | 32-byte hexadecimal key to encrypt third-party credentials. |
| **DATABASE_URL** | Yes | `postgres://...` | Connection parameters mapping Postgres/Supabase records. |
| **GROQ_API_KEY** | Yes | `gsk_...` | Groq developer console API token. |
| **RESEND_API_KEY** | No | `re_...` | Resend notifications sender token. |
| **RESEND_FROM_EMAIL** | No | `onboarding@resend.dev`| Valid Resend verified outbox sender address. |
| **LEAD_WEBHOOK_SECRET** | Yes | *Generate secure key* | Secret checking webhook intake calls. |

---

## 2. Backend Integration Variables

These variables are required to enable active user CRM, WhatsApp, and Google sync connections.

| Variable Name | Required | Default / Staging | Description |
|---|---|---|---|
| **GMAIL_CLIENT_ID** | Yes | `12345-abc...` | Google Client ID generated in Developer Console. |
| **GMAIL_CLIENT_SECRET** | Yes | `GOCSPX-...` | Google Client Secret generated in Developer Console. |
| **HUBSPOT_CLIENT_ID** | No | `hub-...` | HubSpot developer portal Client ID. |
| **HUBSPOT_CLIENT_SECRET**| No | `secret-...` | HubSpot developer portal Client Secret. |
| **WHATSAPP_ACCESS_TOKEN**| No | `EAAG...` | Meta WhatsApp Cloud API access token. |
| **WHATSAPP_VERIFY_TOKEN**| No | *Generate secure key* | Secret verifying Meta webhook registrations. |
| **WHATSAPP_APP_SECRET** | No | `hash...` | Meta App Secret matching webhook signature checks. |

---

## 3. Backend Billing Variables

Required to process live subscriptions and payments.

| Variable Name | Required | Default / Staging | Description |
|---|---|---|---|
| **RAZORPAY_KEY_ID** | Yes | `rzp_live_...` | Live Razorpay Dashboard Key ID. |
| **RAZORPAY_KEY_SECRET** | Yes | `sec_live_...` | Live Razorpay Dashboard Secret. |
| **RAZORPAY_WEBHOOK_SECRET**| Yes | `wh_sec_...` | Secret checking webhook payloads signatures. |

---

## 4. Frontend Variables (Next.js client)

Must be configured inside the Vercel project settings dashboard.

| Variable Name | Required | Default / Staging | Description |
|---|---|---|---|
| **NEXT_PUBLIC_API_URL** | Yes | `https://api.flowpilot.ai` | Target address pointing to API backend server. |
| **NEXT_PUBLIC_PUBLIC_SANDBOX_ENABLED**| Yes | `false` | Disables guest-mode walkthrough trials. |
| **NEXT_PUBLIC_HIDE_PROVIDER_SETUP** | Yes | `false` | Exposes billing profiles and integration connect menus. |
