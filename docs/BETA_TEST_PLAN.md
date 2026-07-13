# Beta Test Plan: First 5 Real Users

This document defines the beta testing plan for FlowPilot AI, mapping onboarding, Gmail syncing, lead collection, approval verification, and real email delivery checks.

---

## 1. Onboarding Test
**Goal:** Verify a new business owner can create an account and configure their tone settings successfully.

### Instructions:
1. Open `https://app.flowpilot.ai`.
2. Register an account using email/password.
3. Complete the onboarding screen, choosing name, type, and tone.

### Pass/Fail Criteria:
- **Pass:** The client user is redirected to the dashboard, and a `user.created` activity log is logged.
- **Fail:** Form submission crashes, password rules reject standard inputs, or the dashboard fails to load.

---

## 2. Gmail Connection Test
**Goal:** Verify Google OAuth integration connects and secures credential refresh tokens.

### Instructions:
1. Navigate to the **Integrations** tab.
2. Click **Connect Gmail**.
3. Authenticate with a Google business account and approve read/send scopes.

### Pass/Fail Criteria:
- **Pass:** The integration status displays "Connected", the `encryptedCredentials` string is populated in the database, and the correct Gmail address is saved.
- **Fail:** Auth redirect fails, state tokens are rejected as invalid, or access/refresh tokens are not received.

---

## 3. Background Lead Processing Test
**Goal:** Confirm background syncing automatically ingests leads from Gmail.

### Instructions:
1. Send an email inquiry from a personal account to the connected Google business inbox (e.g. subject: "Inquiry about your SaaS designs").
2. Wait 5 minutes for the scheduler cron task to run.
3. Check the **Leads** panel in the dashboard.

### Pass/Fail Criteria:
- **Pass:** The email is processed, the sender's details are captured in the leads list, and a `lead.created` activity log is created.
- **Fail:** The scheduler does not run, duplicate leads are created, or message contents are parsed incorrectly.

---

## 4. Approval Workflow Test
**Goal:** Verify the approval queue displays AI drafts and registers modifications correctly.

### Instructions:
1. Navigate to the **Approvals** tab.
2. Locate the generated draft for the new lead.
3. Modify the email body text inside the inline textarea.
4. Click **Approve & Send**.

### Pass/Fail Criteria:
- **Pass:** The draft status changes to `approved`, the updated body text is saved, and the approval queue resolves the item.
- **Fail:** Text changes do not save, clicking approve fails, or the workflow run counts do not increment.

---

## 5. Email Delivery Test
**Goal:** Confirm follow-up emails are sent to the lead via the Gmail API.

### Instructions:
1. Log in to the personal email inbox used in the lead inquiry.
2. Verify receipt of the follow-up email.
3. Check the sent folders of the business Gmail account.

### Pass/Fail Criteria:
- **Pass:** The email is received, formatting matches the approved text, and headers (To, Subject) are correct.
- **Fail:** The email does not arrive, headers are corrupted, or the Gmail API throws token validation errors.
