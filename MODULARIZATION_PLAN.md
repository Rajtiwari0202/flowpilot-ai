# ACE — Modularization Plan

This document details the transition plan of dashboard components from monolithic page views to modular components.

---

## 1. Modularization Scope

| Resource Name | Role | Target Sizing | Actions Taken |
| :--- | :--- | :--- | :--- |
| `page.tsx` | App Orchestration | < 300 lines | Tab routes separated. |
| `types.ts` | Type definitions | < 50 lines | Standardized data mapping. |
| `DashboardPage.tsx` | Overview widgets | < 100 lines | Extracted to dedicated module. |
| `LeadsPage.tsx` | Lead logs & forms | < 100 lines | Form submissions simplified. |
| `ApprovalsPage.tsx` | Pending queues | < 100 lines | Dynamic draft edits modularized. |

---

## 2. Risk & Impact Matrix

* **Risk: Authentication Drift**
  - *Mitigation*: Internal session storage variables (`flowpilot_token` and `flowpilot_skip_sandbox`) are completely untouched. Session validations check parameters correctly.
* **Risk: Next.js Compile Failures**
  - *Mitigation*: Added comprehensive build checks (`npm run build:web`) verifying TypeScript constraints, exports, and Lucide imports.
* **Risk: Dark Mode Visual Drift**
  - *Mitigation*: Implemented a clean design system token framework (`design-system/colors.ts`, `spacing.ts`, etc.) and verified prefers-color-scheme mappings inside `globals.css`.
