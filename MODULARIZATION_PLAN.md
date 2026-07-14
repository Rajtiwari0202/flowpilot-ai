# FlowPilot AI — Modularization Plan

This document proposes modularization strategies for frontend and backend files exceeding 300, 500, or 800 lines of code.

---

## 1. Audit Findings: Large Files

| File Path | Total Lines | Category | Current Responsibility | Proposed Plan |
|---|---|---|---|---|
| **backend/repository.js** | ~1050 lines | > 800 lines | Contains all Supabase PostgreSQL database transaction queries. | Split into a modular folder structure under `backend/src/repositories/`:<br>- `users.repository.js`<br>- `integrations.repository.js`<br>- `workflows.repository.js`<br>- `leads.repository.js`<br>- `approvals.repository.js` |
| **apps/web/src/app/page.tsx**| ~520 lines | > 500 lines | Root frontend dashboard layout, dashboard pages, and quick actions. | **Refactoring Started**: Extracted shared authentication UI elements to `AuthComponents.tsx` and created a separate `LandingPage.tsx` component. Recommend further splitting of tab layouts into page subcomponents (`DashboardTab.tsx`, `AutomationsTab.tsx`, etc.). |
| **backend/src/services/auth.service.js** | ~360 lines | > 300 lines | User signups, credential comparisons, verification emails, password recovery. | Split into distinct service helper modules:<br>- `auth.signup.js`<br>- `auth.login.js`<br>- `auth.recovery.js` |

---

## 2. Refactoring Risk Levels & Mitigation

### Refactor A: Split `backend/repository.js`
* **Risk Level**: **Medium** (High impact if transaction locks or connections fail).
* **Migration Strategy**:
  1. Create a `src/repositories/base.js` exporting the shared client connection/transaction logic.
  2. Implement separate files for each table namespace.
  3. Export a unified `repository` object from `backend/repository.js` importing each of the namespaces, ensuring 100% backward-compatibility for controllers that import repository from the root path.

### Refactor B: Split Tab Pages in `apps/web/src/app/page.tsx`
* **Risk Level**: **Low** (Mainly UI modularization).
* **Migration Strategy**:
  1. Create a `components/tabs/` folder.
  2. Move `DashboardPage`, `AutomationsPage`, `LeadsPage`, `ApprovalsPage`, `TemplatesPage`, `IntegrationsPage`, `SettingsPage` to their own files.
  3. Keep the shared state inside `/page.tsx` and pass them down as properties.
