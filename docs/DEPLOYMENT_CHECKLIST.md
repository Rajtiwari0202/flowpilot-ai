# Production Deployment Checklist

This checklist tracks validation steps required before declaring FlowPilot AI fully ready for live SaaS operation.

---

## 1. Domain & DNS Verification
- [ ] Configure Cloudflare DNS records for `app.flowpilot.ai` (Frontend) and `api.flowpilot.ai` (Backend).
- [ ] Disable proxy options in Cloudflare during initial Let's Encrypt validation. Re-enable Cloudflare proxy (orange cloud) once SSL resolves.

---

## 2. Google Console Consent & Redirect URIs
- [ ] Add the following OAuth Redirect Callback URLs under Authorized Redirect URIs inside Google Developer Console Credentials:
  - `https://api.flowpilot.ai/api/auth/google/callback` (Auth user logins)
  - `https://api.flowpilot.ai/api/oauth/gmail/callback` (Gmail API integration connects)
- [ ] Set user permissions to "External" and configure a public privacy policy page at `https://app.flowpilot.ai/privacy`.
- [ ] Submit the Google Consent Screen for OAuth App verification to prevent browser trust warnings.

---

## 3. Frontend Vercel Deploy Settings
- [ ] Root directory set to: `apps/web`.
- [ ] Node runtime version matched: `Node 20` or `22`.
- [ ] Environment properties populated matching backend API URLs.
- [ ] Successful client bundle builds: `npm run build` exits with code 0.

---

## 4. Backend Railway Deploy Settings
- [ ] Start command matches: `npm start` (which translates to `node backend/server.js`).
- [ ] Auto-bind `PORT` variables active.
- [ ] Build execution executes successfully without package lock file conflicts.

---

## 5. Supabase Postgres & Migration Verification
- [ ] Run migration scripts: `DATABASE_URL=postgres://... npm run migrate` verifies correct table setups.
- [ ] Verify database connection pool setting incorporates `pgbouncer=true` if using Supabase pooling configurations.
- [ ] Add indexing profiles on `flowpilot_records` collections.

---

## 6. Webhooks & Integrations Verification
- [ ] Register the Razorpay payment success webhook targeting: `https://api.flowpilot.ai/api/webhooks/razorpay` with signature checks enabled.
- [ ] Register WhatsApp callback URLs targeting: `https://api.flowpilot.ai/api/webhooks/whatsapp` using verify tokens matched to environmental keys.
