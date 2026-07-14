# FlowPilot AI — Security Audit

This document outlines the security controls, risks, and findings audited across the authentication, database, session, and secrets layers.

---

## 1. Authentication & JWT Validation

* **Validation Status**: Deployed JWT tokens are signed using `process.env.JWT_SECRET` using standard HS256 algorithm.
* **Expiration Logic**: Short-lived JWT access tokens expire in 1 hour.
* **Refresh Token Rotation (RTR)**: Long-lived refresh tokens are stored in the database (`auth_tokens`). We have active replay detection which revokes the entire user session if a refresh token is reused.
* **Risk Level**: **Low**

---

## 2. OAuth Verification

* **State Isolation**: Both Google Login and Gmail Integration callback state parameters are uniquely generated cryptographically (using high-entropy random bytes) and checked inside the repository before code exchange.
* **PKCE Flow**: Proof Key for Code Exchange (PKCE) is enforced for Google OAuth login using SHA-256 code challenge method (`S256`).
* **Redirect URI Guards**: Standard redirect parameters are checked against strict host matches to prevent open redirection vulnerabilities.
* **Risk Level**: **Low**

---

## 3. Database & SQL Injection Protection

* **Parameterization**: The backend uses the `postgres.js` library which naturally parameterizes raw queries using tagged template literals, meaning raw SQL injections are impossible.
* **Risk Level**: **Low**

---

## 4. Encryption

* **Credential Encryption**: Client credentials and Google refresh tokens are encrypted at-rest inside the database using AES-256-GCM authenticated encryption.
* **Key Management**: Encryption keys are derived via PBKDF2 using system-level env variables.
* **Risk Level**: **Low**

---

## 5. Summary Findings

| ID | Finding | Severity | Recommendation | Status |
|---|---|---|---|---|
| SEC-01 | OAuth Redirect URI Mismatch | Critical | Fallback to GOOGLE_CALLBACK_URL environment variable | **RESOLVED** |
| SEC-02 | SQL parameter compilation crash | Critical | Added explicit type casts in `integrations.upsert` | **RESOLVED** |
| SEC-03 | Missing CSRF Host Checks | Medium | Added origin check middleware on state transitions | **RESOLVED** |
| SEC-04 | Env Secret Fallbacks | Low | Explicitly error on missing client secrets on startup | **RESOLVED** |
