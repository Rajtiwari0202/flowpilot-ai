# Deployment & Configuration Guide

This document describes how to build, run, configure, and deploy the FlowPilot AI frontend and backend services.

---

## 1. Local Development Instructions

### Prerequisite Environment
- Node.js version ≥ 20.x
- NPM version ≥ 10.x

### 1.1 First-Time Setup
1. Clone the repository and install all root and workspace dependencies:
   ```bash
   npm install
   ```
2. Set up backend environment overrides:
   ```bash
   cp .env.example .env
   ```
3. Set up frontend web environment overrides:
   ```bash
   cp apps/web/.env.local.example apps/web/.env.local
   ```

### 1.2 Running Locally
- **Start Backend API (Port 8787):**
  ```bash
  npm run dev:api
  ```
- **Start Next.js Frontend (Port 3000):**
  ```bash
  npm run dev:web
  ```
- **Launch Browser:**
  Open `http://localhost:3000` to view the modern application workspace, or `http://localhost:8787` to inspect the legacy HTML workspace.

### 1.3 Running Smoke Tests
Run E2E backend assertions matching logins, approvals, templates, and webhook registers:
```bash
npm test
```

---

## 2. Infrastructure & Deployment Platforms

### 2.1 Backend Deployment (Render)
The API backend is configured for deployment on **Render** (via `render.yaml`).
- **Service Type:** Web Service
- **Plan:** Free (or Starter for production scaling)
- **Node Version:** 22
- **Build Command:** `npm install`
- **Start Command:** `npm start`

### 2.2 Frontend Deployment (Vercel)
The Next.js frontend is designed to deploy on **Vercel**.
- **Root Directory:** Configure Vercel to build from the sub-directory:
  ```text
  apps/web
  ```
- **Build Command:** `npm run build` (runs Next.js bundle compiler)
- **Output Directory:** `.next`

### 2.3 Database Setup
FlowPilot supports two database profiles:
1. **Local Mode (Default):** Uses `backend/data/store.local.json` file writes. Useful for tests and local work.
2. **Durable Postgres Mode (Production):** Initiated if the `DATABASE_URL` environment variable is defined.
   - Run database schema migration:
     ```bash
     npm run migrate
     ```
   - Connects to Supabase or any PostgreSQL instance, creating the index table `public.flowpilot_records`.

---

## 3. Environment Variables Registry

### 3.1 Backend Variables (`backend/.env`)

| Variable | Required in Prod | Example | Description |
|---|---|---|---|
| **PORT** | No | `8787` | HTTP port the server binds to |
| **NODE_ENV** | Yes | `production` | Enforces error trace hiding for safety |
| **JWT_SECRET** | Yes | `5f24...901e` | Key used to sign user token sessions |
| **TOKEN_ENCRYPTION_KEY** | Yes | `a1b2...c3d4` | Shared key to encrypt/decrypt integration secrets |
| **LEAD_WEBHOOK_SECRET** | Yes | `wbhk_sec...` | Secret token verifying inbound REST leads webhooks |
| **DATABASE_URL** | Yes | `postgres://...` | Connection string for Postgres databases |
| **GROQ_API_KEY** | Yes | `gsk_...` | Groq console key for chat completion prompts |
| **RESEND_API_KEY** | No | `re_...` | Resend account notification email sender token |
| **RESEND_FROM_EMAIL** | No | `info@domain.com` | Verified Resend email account address |
| **PUBLIC_SANDBOX_ENABLED** | No | `true` | Allows portfolio sandbox logins |
| **DISABLE_BILLING** | No | `false` | Bypasses Razorpay checkouts |
| **DISABLE_REAL_EMAIL_SEND** | No | `false` | Safe simulation for Gmail follows |
| **ALLOW_JSON_STORE_IN_PRODUCTION** | No | `false` | Enables JSON file backup in cloud |

### 3.2 Frontend Variables (`apps/web/.env.local`)

| Variable | Required in Prod | Example | Description |
|---|---|---|---|
| **NEXT_PUBLIC_API_URL** | Yes | `https://api.domain.com` | Target URL pointing to backend API server |
| **NEXT_PUBLIC_PUBLIC_SANDBOX_ENABLED**| No | `true` | Enforces visitor walkthrough banner |
| **NEXT_PUBLIC_HIDE_PROVIDER_SETUP** | No | `false` | Hides billing credentials from guest view |
