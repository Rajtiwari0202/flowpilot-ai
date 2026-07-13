# Database Schema Report

This document audits the physical and logical data persistence layouts of FlowPilot AI, highlighting structural relationships, indices, and performance concerns.

---

## 1. Physical Persistence Schema (Postgres / Supabase)

FlowPilot implements a Document-Store simulation on top of a single PostgreSQL table. This mapping is applied via migrations in `supabase/migrations/202606020001_flowpilot_core.sql`.

### Table: `public.flowpilot_records`
Holds all structured objects in the application.

| Field | Type | Attributes | Description |
|---|---|---|---|
| **collection** | `text` | `primary key` (1/2) | Name of the collection (e.g. `leads`, `users`) |
| **record_id** | `text` | `primary key` (2/2) | Unique ID of the record (e.g. `usr_123`, `lead_456`) |
| **user_id** | `text` | `nullable` | ID of the owner user for query scope |
| **data** | `jsonb` | `not null` | Complete JSON object representation of the entity |
| **created_at** | `timestamptz` | `default now()` | Record creation timestamp |
| **updated_at** | `timestamptz` | `default now()` | Auto-updating modification timestamp |

### Physical Indexes:
1. `flowpilot_records_pkey`: Composite Primary Key (`collection`, `record_id`)
2. `flowpilot_records_collection_idx`: Index on `collection`
3. `flowpilot_records_user_idx`: Index on `user_id`

---

## 2. Logical Data Model Entities

The application logically breaks down the JSON objects stored in the `data` column into the following entity types.

### 2.1 User
Logical representation of a workspace owner.
- **Fields:**
  - `id`: `text` (Unique ID, prefix `usr_`)
  - `name`: `text`
  - `email`: `text` (Unique identifier, lowercased)
  - `passwordHash`: `text` or `null` (Absent for Google Sign-In)
  - `emailVerified`: `boolean`
  - `googleId`: `text` or `null`
  - `plan`: `text` (`free` or `pro`)
  - `createdAt`: `text` (ISO 8601)
  - `emailVerifiedAt`: `text` or `null` (ISO 8601)
  - `passwordChangedAt`: `text` or `null` (ISO 8601)
  - `billing`: `object` or `null` (Razorpay subscription details)
- **Relationships:**
  - Has one `Business`
  - Has many `Integrations`
  - Has many `Workflows`
  - Has many `Leads`
  - Has many `Approvals`
  - Has many `Activity`
  - Has many `AuthTokens`
  - Has many `Outbox`

### 2.2 Business
Onboarding profile parameters used to tune follow-up email drafts.
- **Fields:**
  - `id`: `text` (prefix `biz_`)
  - `userId`: `text` (Foreign Key -> User)
  - `name`: `text`
  - `type`: `text` (`agency`, `startup`, `e-commerce`, etc.)
  - `tone`: `text` (`friendly` or `professional`)
  - `goals`: `array of text` (e.g. `["lead_follow_up"]`)
  - `createdAt`: `text` (ISO 8601)
  - `updatedAt`: `text` (ISO 8601)

### 2.3 Integration
Credentials mapping user integrations to external APIs.
- **Fields:**
  - `id`: `text` (prefix `int_`)
  - `userId`: `text` (Foreign Key -> User)
  - `provider`: `text` (`gmail`, `hubspot`, `whatsapp`)
  - `status`: `text` (`connected`)
  - `encryptedCredentials`: `text` (AES-256-GCM cipher string of API tokens)
  - `connectedEmail`: `text` or `null`
  - `createdAt`: `text` (ISO 8601)
  - `updatedAt`: `text` (ISO 8601)

### 2.4 Lead
Inquiries collected manual form, webhook intakes, or inbox sweeps.
- **Fields:**
  - `id`: `text` (prefix `lead_`)
  - `userId`: `text` (Foreign Key -> User)
  - `name`: `text`
  - `email`: `text` or `null`
  - `phone`: `text` or `null`
  - `message`: `text`
  - `source`: `text` (`manual`, `Gmail`, `WhatsApp`, `website`)
  - `status`: `text` (`new`, `pending_approval`, `follow_up_sent`, `needs_review`)
  - `createdAt`: `text` (ISO 8601)

### 2.5 Approval
Queue items hosting generated messages for human review.
- **Fields:**
  - `id`: `text` (prefix `appr_`)
  - `userId`: `text` (Foreign Key -> User)
  - `leadId`: `text` (Foreign Key -> Lead)
  - `status`: `text` (`pending`, `approved`, `rejected`)
  - `kind`: `text` (`follow_up_draft`)
  - `draft`: `text` (Proposed follow-up message text)
  - `aiProvider`: `text` or `null` (`groq`, `local`, `local_fallback`)
  - `deliveryProvider`: `text` or `null` (`gmail`, `simulation`)
  - `createdAt`: `text` (ISO 8601)
  - `resolvedAt`: `text` or `null` (ISO 8601)

### 2.6 Workflow
Automation actions triggered by event occurrences.
- **Fields:**
  - `id`: `text` (prefix `wf_`)
  - `userId`: `text` (Foreign Key -> User)
  - `templateId`: `text` (`tpl_lead_follow_up`, etc.)
  - `name`: `text`
  - `status`: `text` (`active`, `paused`)
  - `trigger`: `text` (`lead.created`, etc.)
  - `actions`: `array of text`
  - `runs`: `integer`
  - `createdAt`: `text` (ISO 8601)
  - `updatedAt`: `text` (ISO 8601)

### 2.7 Activity
Structured audit logs.
- **Fields:**
  - `id`: `text` (prefix `act_`)
  - `userId`: `text` (Foreign Key -> User)
  - `type`: `text`
  - `label`: `text`
  - `source`: `text`
  - `status`: `text` (`success`, `error`, `pending`)
  - `createdAt`: `text` (ISO 8601)

### 2.8 AuthToken
One-time use verification and reset tokens.
- **Fields:**
  - `id`: `text` (prefix `tok_`)
  - `userId`: `text` (Foreign Key -> User)
  - `kind`: `text` (`verify_email`, `reset_password`)
  - `tokenHash`: `text` (SHA-256 string)
  - `expiresAt`: `text` (ISO 8601)
  - `createdAt`: `text` (ISO 8601)
  - `usedAt`: `text` or `null` (ISO 8601)

### 2.9 Outbox
Queued system verification and password reset notifications.
- **Fields:**
  - `id`: `text` (prefix `mail_`)
  - `userId`: `text` (Foreign Key -> User)
  - `to`: `text`
  - `kind`: `text`
  - `status`: `text` (`queued`, `sent`)
  - `link`: `text`
  - `createdAt`: `text` (ISO 8601)
  - `sentAt`: `text` or `null` (ISO 8601)

---

## 3. Database Normalization & Security Concerns

> [!CAUTION]
> **Whole-Store Write Scaling Bottleneck (Critical Risk)**
> Every call to `writeStore()` triggers a database advisory lock, a `TRUNCATE table` command, and a bulk re-insert of all in-memory collections. Write scaling is O(N) where N is the total records in the database, introducing high concurrency delays under high traffic.

- **Absence of Indexes on Nested Properties:** Queries that filter or sort by nested JSON fields (e.g. retrieving user settings or filtering active workflows) trigger full table scans, since there are no JSONB GIN indexes.
- **Normalizations Issues:** There are no physical constraints mapping relations (no foreign key cascading, checks, or schema types). Deleting a user does not cascadingly delete records, leading to database leaks unless cleaned in code.
- **Supabase PgBouncer Restriction:** Due to whole-database snapshot truncating transactions, pg_advisory_xact_lock requires session pinning (`prepare: false`), causing connections pooling bottlenecks.
