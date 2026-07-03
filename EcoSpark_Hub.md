# EcoSpark Hub

## Software Architecture & Technical Design Document

**Prepared by:** Md. Shafayat Hossain Patowary
**Date:** June 16, 2026
**Version:** 1.0

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Analysis](#2-architecture-analysis)
3. [Database Models & Relations](#3-database-models--relations)
4. [Key Implementation Details](#4-key-implementation-details)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Pages Reference](#6-pages-reference)

---

## 1. Project Overview

EcoSpark Hub is a community portal where members share sustainability-oriented ideas — from reducing plastic consumption to launching solar power projects. Admins moderate submissions, provide feedback, and surface the best ideas to all portal members. Think of it as a lightweight Reddit × Medium × Stripe mashup: community-driven content, editorial workflow, and a payment gate for premium ideas.

> **Mental Model:** EcoSpark Hub = Reddit (voting + nested comments) + Medium (rich idea drafts + editorial approval) + Stripe (payment gate for premium content). Hold this mental model throughout development.

### 1.1 Core Value Proposition

- Members submit, vote on, and discuss sustainability ideas in a structured workflow.
- Admins gatekeep quality through a formal review and approval pipeline.
- High-impact ideas can be monetized — other members pay to unlock paid content.
- Public visibility rewards the best ideas via up-votes and featured placement.

### 1.2 Technology Stack

| Layer      | Technology                        | Purpose                   |
| ---------- | --------------------------------- | ------------------------- |
| Frontend   | Next.js + Tailwind CSS            | SSR/SSG, responsive UI    |
| Backend    | Node.js + Express.js              | RESTful API               |
| ORM        | Prisma                            | Type-safe database access |
| Database   | PostgreSQL                        | Relational data storage   |
| Auth       | JWT (+ Passport.js / BetterAuth)  | Session management        |
| Payments   | SSLCommerz / ShurjoPay / Stripe   | Premium idea purchases    |
| Images     | Cloudinary / S3-compatible        | Idea image uploads        |
| Deployment | Vercel (FE) + Render/Railway (BE) | Hosting                   |

---

## 2. Architecture Analysis

### 2.1 Complexity Hotspots

The following areas require deep architectural thought before writing any code. Underestimating these is the most common cause of rework on projects like this.

#### Paid Idea Access Model

When a member pays for an idea, you must persist that access grant in an `IdeaPurchases` join table. Critical questions to resolve up front:

- Does access remain valid if the idea is later edited or repriced?
- Payment is **NOT** confirmed synchronously — the gateway sends an async webhook callback.
- Never grant access until the webhook confirms payment with `COMPLETED` status.
- Always verify the webhook signature before processing — skipping this is a critical security hole.

#### Nested Comments (Reddit-style)

Comments use an adjacency list — a self-referencing `parentId` column on the Comments table. Key considerations:

- Top-level comments have `parentId = null`. Replies reference another comment's id.
- Fetching a full thread with 3+ nesting levels requires recursive CTEs in PostgreSQL or client-side assembly.
- Plan the query strategy before writing any comment endpoints. Naive loops will be painfully slow.
- Soft-delete comments (`isDeleted` flag) so admin deletions don't break child threads — render as `[comment removed]` in UI.

#### Idea Status State Machine

An idea moves through a strict workflow: `DRAFT → PENDING → UNDER_REVIEW → APPROVED / REJECTED`. Rules:

- Only the idea owner can transition from `DRAFT` to `PENDING` (submit for review).
- Only an admin can transition from `UNDER_REVIEW` to `APPROVED` or `REJECTED`.
- Rejected ideas can be edited and re-submitted. Approved ideas are locked from owner edits.
- Enforce **ALL** transitions in the backend policy layer — never trust the frontend to restrict actions.

#### Voting Integrity

One vote per member per idea. Enforce this at the database level with a unique constraint on `(userId, ideaId)` in the Votes table — application-level checks alone are insufficient under concurrent requests.

#### Denormalized Vote Counters

The Ideas table stores `upvoteCount` and `downvoteCount` as columns. While these could be computed from the Votes table at query time, maintaining counters on the Idea row itself is essential for performant listing pages (where hundreds of cards render simultaneously). Update counters transactionally whenever a vote is cast or removed.

---

### 2.2 API Structure

Organize Express routes by resource. Keep admin routes under a separate prefix protected by admin middleware:

| Route Prefix       | Resource                          | Middleware                                   |
| ------------------ | --------------------------------- | -------------------------------------------- |
| `/api/auth`        | Registration, login, JWT refresh  | Public                                       |
| `/api/ideas`       | CRUD, submit, status              | `requireAuth` (most), Public (approved list) |
| `/api/categories`  | List, create, delete              | Public (list), `requireAdmin` (write)        |
| `/api/votes`       | Cast, remove vote                 | `requireAuth`                                |
| `/api/comments`    | Create, reply, delete             | `requireAuth`                                |
| `/api/purchases`   | Initiate, webhook confirm         | `requireAuth` (initiate), Public (webhook)   |
| `/api/admin/users` | Activate, deactivate, role change | `requireAdmin`                               |
| `/api/admin/ideas` | Review queue, approve, reject     | `requireAdmin`                               |

---

### 2.3 Next.js Data Fetching Strategy

- Use **Server Components** for all public listing pages (Home, All Ideas) — enables SSR for SEO and faster initial load.
- Use **Client Components** only where interactivity is required: voting buttons, comment forms, purchase flow.
- The All Ideas page is SEO-critical (publicly indexed content) — never make it a purely client-side rendered page.
- Idea Detail pages for free ideas are Server Components. Paid idea content is gated behind a client-side access check after auth.

---

## 3. Database Models & Relations

The full schema is built around seven core tables. Below is a detailed breakdown of each model, its fields, and the reasoning behind key design decisions.

### 3.1 USERS(Handled through Better-Auth)

| Field                | Type      | Constraint        | Notes                                                          |
| -------------------- | --------- | ----------------- | -------------------------------------------------------------- |
| `id`                 | UUID      | PK                | Auto-generated                                                 |
| `name`               | String    | Required          | Display name                                                   |
| `email`              | String    | Unique, Required  | Login identifier                                               |
| `password`           | String    | Required          | handled better-auth                                            |
| `emailVerified`      | Boolean   | Default: `false`  | Verified with 6-digit code                                     |
| `status`             | Enum      | Default: `ACTIVE` | `INACTIVE`                                                     |
| `needPasswordChange` | Boolean   | Default: `false`  | Login first time                                               |
| `role`               | Enum      | Default: `MEMBER` | `ADMIN`                                                        |
| `isDeleted`          | Boolean   | Default: `false`  | True soft-delete — keeps data for audit but hides from queries |
| `deletedAt`          | Timestamp | Nullable          | Soft delete timestamp                                          |
| `createdAt`          | Timestamp | Auto              |                                                                |
| `updatedAt`          | Timestamp | Auto              |                                                                |

### 3.2 CATEGORIES

| Field         | Type      | Constraint       | Notes                  |
| ------------- | --------- | ---------------- | ---------------------- |
| `id`          | UUID      | PK               |                        |
| `name`        | String    | Unique, Required | e.g. Energy, Waste     |
| `slug`        | String    | Unique, Required | URL-safe identifier    |
| `description` | String    | Optional         | Admin-provided summary |
| `createdBy`   | UUID      | FK → USERS       | Admin who created it   |
| `createdAt`   | Timestamp | Auto             |                        |

### 3.3 IDEAS

| Field               | Type      | Constraint         | Notes                                                   |
| ------------------- | --------- | ------------------ | ------------------------------------------------------- |
| `id`                | UUID      | PK                 |                                                         |
| `title`             | String    | Required           |                                                         |
| `problemStatement`  | Text      | Required           |                                                         |
| `proposedSolution`  | Text      | Required           |                                                         |
| `description`       | Text      | Optional           | Rich extended content                                   |
| `status`            | Enum      | Default: `PENDING` | `PENDING` \| `UNDER_REVIEW` \| `APPROVED` \| `REJECTED` |
| `isPaid`            | Boolean   | Default: `false`   | Gates content behind payment(using stripe webhook)      |
| `price`             | Decimal   | Nullable           | Required if `isPaid = true`                             |
| `imageUrls`         | String[]  | Optional           | Array of Cloudinary/S3 URLs                             |
| `authorId`          | UUID      | FK → USERS         | Idea owner                                              |
| `categoryId`        | UUID      | FK → CATEGORIES    | Required on submit                                      |
| `rejectionFeedback` | String    | Nullable           | Visible only to idea owner                              |
| `upvoteCount`       | Int       | Default: `0`       | Denormalized — updated transactionally                  |
| `downvoteCount`     | Int       | Default: `0`       | Denormalized — updated transactionally                  |
| `publishedAt`       | Timestamp | Nullable           | Set when status → `APPROVED`                            |
| `createdAt`         | Timestamp | Auto               |                                                         |
| `updatedAt`         | Timestamp | Auto               |                                                         |

### 3.4 VOTES

| Field       | Type      | Constraint | Notes                  |
| ----------- | --------- | ---------- | ---------------------- |
| `id`        | UUID      | PK         |                        |
| `userId`    | UUID      | FK → USERS | Voter                  |
| `ideaId`    | UUID      | FK → IDEAS | Target idea            |
| `type`      | Enum      | Required   | `UPVOTE` \| `DOWNVOTE` |
| `createdAt` | Timestamp | Auto       |                        |

> **⚠️ Critical Constraint:** Add a unique constraint on `(userId, ideaId)` at the database level — not just application logic. This prevents duplicate votes under race conditions.

### 3.5 COMMENTS

| Field       | Type      | Constraint              | Notes                                 |
| ----------- | --------- | ----------------------- | ------------------------------------- |
| `id`        | UUID      | PK                      |                                       |
| `content`   | Text      | Required                |                                       |
| `authorId`  | UUID      | FK → USERS              | Comment author                        |
| `ideaId`    | UUID      | FK → IDEAS              | Parent idea                           |
| `parentId`  | UUID      | FK → COMMENTS, Nullable | `null` = top-level; set = reply       |
| `isDeleted` | Boolean   | Default: `false`        | Soft delete — preserves child threads |
| `createdAt` | Timestamp | Auto                    |                                       |
| `updatedAt` | Timestamp | Auto                    |                                       |

### 3.6 IDEA_PURCHASES

| Field           | Type      | Constraint         | Notes                                  |
| --------------- | --------- | ------------------ | -------------------------------------- |
| `id`            | UUID      | PK                 |                                        |
| `userId`        | UUID      | FK → USERS         | Buyer                                  |
| `ideaId`        | UUID      | FK → IDEAS         | Purchased idea                         |
| `transactionId` | String    | Unique             | Gateway-assigned transaction reference |
| `paymentStatus` | Enum      | Default: `PENDING` | `PENDING` \| `COMPLETED`               |
| `amountPaid`    | Decimal   | Required           | Snapshot of price at purchase time     |
| `gateway`       | String    | Required           | `stripe`                               |
| `completedAt`   | Timestamp | Nullable           | Set when webhook confirms `COMPLETED`  |
| `createdAt`     | Timestamp | Auto               |                                        |

> **⚠️ Payment Flow:** Create the purchase record with `PENDING` status when the member initiates payment. A stripe webhook from the gateway updates it to `COMPLETED`. **NEVER** grant content access until the webhook fires — do not trust the frontend redirect.

### 3.7 NEWSLETTER_SUBSCRIBERS

| Field          | Type      | Constraint       | Notes              |
| -------------- | --------- | ---------------- | ------------------ |
| `id`           | UUID      | PK               |                    |
| `email`        | String    | Unique, Required |                    |
| `isActive`     | Boolean   | Default: `true`  | Unsubscribe toggle |
| `subscribedAt` | Timestamp | Auto             |                    |

### 3.8 Entity Relationships Summary

| Relationship           | Cardinality     | Notes                                |
| ---------------------- | --------------- | ------------------------------------ |
| USERS → IDEAS          | 1 : Many        | A user authors many ideas            |
| USERS → VOTES          | 1 : Many        | A user casts many votes (1 per idea) |
| USERS → COMMENTS       | 1 : Many        | A user writes many comments          |
| USERS → IDEA_PURCHASES | 1 : Many        | A user makes many purchases          |
| CATEGORIES → IDEAS     | 1 : Many        | A category classifies many ideas     |
| IDEAS → VOTES          | 1 : Many        | An idea receives many votes          |
| IDEAS → COMMENTS       | 1 : Many        | An idea has many comments            |
| IDEAS → IDEA_PURCHASES | 1 : Many        | An idea is sold many times           |
| COMMENTS → COMMENTS    | 1 : Many (self) | Nested replies via `parentId`        |

---

## 4. Development Roadmap

| Phase | Timeline | Deliverables                                                                                                                                                     |
| ----- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Week 1–2 | Backend foundation: Express setup, Prisma migrations for full schema, auth endpoints (register/login/JWT), role guard middleware (`requireAuth`, `requireAdmin`) |
| 2     | Week 2–3 | Core idea flow: CRUD for ideas, draft/submit workflow, admin moderation endpoints (list pending, approve, reject with feedback), category management             |
| 3     | Week 3–4 | Public frontend: Next.js pages — Home, All Ideas (search/filter/sort/pagination), Idea Details. Voting on detail page. Server Components for public routes.      |
| 4     | Week 4–5 | Payment integration: purchase initiation endpoint, gateway redirect, async webhook handler, webhook signature verification, access grant on `COMPLETED`          |
| 5     | Week 5–6 | Dashboards: member dashboard (own ideas, statuses, rejection feedback), admin dashboard (user management, idea moderation queue, category CRUD)                  |
| 6     | Week 6–7 | Polish: nested comments, newsletter subscription, full responsive design pass, loading states, error messages, deployment (Vercel + Render/Railway)              |

## 5. Key Implementation Details

### 5.1 Idea Status State Machine

The `status` field must follow strict transitions. Enforce these in a dedicated service layer — not directly in route handlers:

| From | To  | Triggered by | Validation |
| ---- | --- | ------------ | ---------- |

Default : PENDING
| `PENDING` | `UNDER_REVIEW` | Admin (submit) | `requireAdmin` |
| `UNDER_REVIEW` | `APPROVED` | Admin (approve) | `requireAdmin`; sets `publishedAt` |
| `UNDER_REVIEW` | `REJECTED` | Admin (reject) | `requireAdmin`; `rejectionFeedback` required |

### 5.2 Voting Logic

The vote endpoint must handle these operations atomically:

- **Cast upvote:** `INSERT` into Votes, increment `upvoteCount` on Idea.
- **Cast downvote:** `INSERT` into Votes, increment `downvoteCount` on Idea.
- **Remove vote:** `DELETE` from Votes, decrement the corresponding counter on Idea.
- **Change vote (up → down):** `UPDATE` type in Votes, decrement `upvoteCount`, increment `downvoteCount`.

Use Prisma transactions (`$transaction`) for all vote operations so counters never drift out of sync.

### 5.3 Nested Comment Fetch Strategy

**Option A** _(recommended for moderate thread depth)_: Fetch all comments for an idea in a single query ordered by `createdAt`, then assemble the tree in the API response handler before sending JSON. This avoids N+1 queries.

**Option B** _(for deep threads)_: Use a PostgreSQL recursive CTE via Prisma's `$queryRaw` to fetch the full tree in one database round-trip.

Limit render depth to 3–4 levels in the frontend regardless of how deep the DB tree goes — deeper nesting is unusable on mobile.

### 5.4 Paid Idea Access Check

On every request to view a paid idea's full content:

1. Check if the requesting user is authenticated (`requireAuth`).
2. Query `IDEA_PURCHASES` for a record where `userId = req.user.id AND ideaId = idea.id AND paymentStatus = 'COMPLETED'`.
3. If found, return full content. If not, return `402 Payment Required` with a purchase initiation URL.
4. Admins bypass the payment check — they see all content regardless of purchase status.

### 5.5 Search & Filter Architecture

The All Ideas page requires server-side search and filter. Build a single flexible endpoint:

```
GET /api/ideas?q=solar&category=energy&sort=topVoted&page=1&limit=12&isPaid=false
```

- Use Prisma's `where` clauses with `OR` for keyword search across `title`, `description`, and `problemStatement`.
- Apply cursor-based or offset-based pagination — offset pagination is simpler to implement for this scale.
- Always filter by `status = 'APPROVED'` in public endpoints — never expose `DRAFT`, `PENDING`, or `REJECTED` ideas to the public listing.

---

## 6. Non-Functional Requirements

### 6.1 Security Checklist

- **Passwords:** bcrypt with minimum cost factor 10. Never log or return `passwordHash`.
- **JWT:** Short expiry (15–60 min access token). Consider refresh tokens for better UX.
- **Payment webhooks:** Always verify gateway signature header before processing.
- **Admin routes:** Double-gated by `requireAuth` + `requireAdmin` middleware on every route.
- **Input validation:** Validate all request bodies with Zod or Joi before hitting the database.
- **SQL injection:** Prisma parameterizes queries by default — never use `$queryRaw` with user input.

### 6.2 Error Handling Standards

| HTTP Code | Status                | When to use                                                           |
| --------- | --------------------- | --------------------------------------------------------------------- |
| `400`     | Bad Request           | Validation failures, malformed input                                  |
| `401`     | Unauthorized          | Missing or invalid JWT                                                |
| `402`     | Payment Required      | Accessing paid idea without purchase                                  |
| `403`     | Forbidden             | Authenticated but insufficient role (e.g. member hitting admin route) |
| `404`     | Not Found             | Idea, user, or category does not exist                                |
| `409`     | Conflict              | Duplicate vote, email already registered                              |
| `500`     | Internal Server Error | Unexpected errors — never expose stack traces in production           |

### 6.3 Responsive Design Requirements

- All pages must work on mobile (320px+), tablet (768px+), and desktop (1024px+).
- The All Ideas grid collapses from 3 columns (desktop) → 2 (tablet) → 1 (mobile).
- Navigation collapses to a hamburger menu on mobile.
- Idea cards must remain legible and tappable at mobile widths — min tap target 44px.

---

## 7. Pages Reference

| Page             | Route            | Key Features                                                                                                |
| ---------------- | ---------------- | ----------------------------------------------------------------------------------------------------------- |
| Home             | `/`              | Hero banner, search bar, featured idea cards, testimonials (top 3 by votes), newsletter signup              |
| All Ideas        | `/ideas`         | Paginated grid (12/page), sort (recent/top voted/most commented), filter (category/paid/vote range), search |
| Idea Details     | `/ideas/[id]`    | Full content, voting, nested comments, paid gate, author info, share buttons                                |
| Login            | `/auth/login`    | Email/password, redirect after login, JWT storage                                                           |
| Register         | `/auth/register` | Name, email, password with strength indicator, duplicate email check                                        |
| Member Dashboard | `/dashboard`     | My ideas list, create idea, draft management, submission status, rejection feedback                         |
| Admin Dashboard  | `/admin`         | Moderation queue, user management (activate/deactivate/roles), category management                          |
| About Us         | `/about`         | Portal mission, team info                                                                                   |
| Profile          | `/profile`       | View/edit personal info, purchased ideas list                                                               |

_EcoSpark Hub — Architecture Document v1.0 — Md. Shafayat Hossain Patowary_
