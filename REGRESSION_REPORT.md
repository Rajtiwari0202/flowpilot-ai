# FlowPilot AI — Regression Report

This document reports the verification status of FlowPilot AI feature flows.

---

## 1. Feature Flows Audit

| Flow | Status | Verification Actions Taken |
|---|---|---|
| **Email signup** | **PASS** | Validated creating a new user, storing password hash, and triggering profile creation. |
| **Email login** | **PASS** | Checked password comparison, verification state lookup, and returning short JWT access tokens. |
| **Google OAuth Login** | **PASS** | Verified code parameter challenge validation and PKCE callback mappings. |
| **Gmail OAuth Connect** | **PASS** | Checked callback code exchange, secret encryption at rest, and saving configurations. |
| **Onboarding flow** | **PASS** | Verified business profile creation endpoint and UI saving setup. |
| **Sandbox flow** | **PASS** | Verified workspace initialization, template lookups, and seeding workflows. |
| **Workflows creation** | **PASS** | Verified template cloning, mapping parameters, and updating status flags. |
| **Leads creation** | **PASS** | Tested lead capturing, message processing, and queue dispatching. |
| **Dashboard loading** | **PASS** | Checked metric compilation, activity feed, and pending approvals retrieval. |
| **Integrations page** | **PASS** | Tested Gmail connection status rendering and syncing. |

---

## 2. Test Execution Proof

All automated tests completed successfully without regressions:
- **Core backend tests**: Passed (`npm test`)
- **Zero-trust production readiness checks**: Passed (`node backend/test_production.js`)
- **Zero-trust security suite**: Passed (`node backend/test_security.js`)
