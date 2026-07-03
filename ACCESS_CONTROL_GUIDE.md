# EcoSpark Ideas - Access Control System

## Overview

This guide explains how the access control system works for ideas, ensuring that:

- Users get **full access** to ideas after completing payment
- Admins have **unrestricted access** to all ideas without needing to pay
- Non-paying users see **masked content** for paid ideas

## Access Levels

### 1. Free Ideas (`isPaid = false`)

- **Accessible to**: Everyone (authenticated and unauthenticated)
- **Content visible**: All content visible
- **Payment required**: No

### 2. Paid Ideas (`isPaid = true`) - By User Type

#### Non-Paying Users (No Purchase or Pending/Failed Payment)

```
Visible:
  - title
  - problemStatement
  - imageUrls
  - price
  - author info
  - category info

Hidden (null):
  - proposedSolution
  - description
```

#### Users Who Completed Payment

```
paymentStatus = COMPLETED
Result: Full content access (same as free ideas)
```

#### Idea Authors

```
Can always view:
  - Full content of their own ideas
  - Regardless of payment status
```

#### Admins

```
userRole = ADMIN
Result: Unrestricted access to ALL ideas and ALL content
No masking applied
```

## Implementation Details

### Core Functions (ideas.service.ts)

#### `hasFullAccess(idea, user)`

Determines if a user has full access to an idea's content.

**Returns true if:**

- Idea is free (`isPaid = false`)
- User is admin (`role = ADMIN`)
- User is the idea author (`userId = authorId`)
- User has completed payment (`paymentStatus = COMPLETED`)

**Returns false if:**

- No user logged in and idea is paid
- User has no completed purchase

```typescript
const hasFullAccess = async (
  idea: { id: string; isPaid: boolean; authorId: string },
  user?: IUserJwtPayload,
): Promise<boolean>
```

#### `getIdeaForUser(idea, user)`

Applies user-specific content masking to an idea and adds `hasFullAccess` property.

**Returns:**

- Full idea + `hasFullAccess: true` if user has access
- Masked idea + `hasFullAccess: false` if user doesn't have access
- `hasFullAccess: true` for free ideas

**Return object includes:**

- `hasFullAccess` (boolean) - Frontend can use this to show/hide purchase buttons and content

```typescript
const getIdeaForUser = async (
  idea: { id: string; isPaid: boolean; authorId: string; [key: string]: unknown },
  user?: IUserJwtPayload,
)
```

#### `maskPaidContent(idea)`

Masks paid content by setting sensitive fields to null.

**Masked fields:**

- `proposedSolution` → null
- `description` → null

### Payment Flow

#### Step 1: Initiate Purchase

- User clicks "Purchase" on a paid idea
- `PurchaseServices.initiatePurchase()` creates `IdeaPurchase` record
- Status: `PENDING`
- Stripe checkout session created

#### Step 2: Complete Payment

- User completes payment in Stripe
- Stripe sends webhook event: `checkout.session.completed`

#### Step 3: Mark Purchase as Completed

- Webhook handler calls `completePurchase()`
- `IdeaPurchase.paymentStatus` updated to `COMPLETED`
- `IdeaPurchase.completedAt` set to current timestamp

#### Step 4: Grant Access

- Next time user requests idea:
  - `hasFullAccess()` queries for purchase with `paymentStatus = COMPLETED`
  - Returns true
  - Full idea returned to user

### Database Schema

#### IdeaPurchase Model

```prisma
model IdeaPurchase {
  id              String
  transactionId   String        // Stripe session ID
  paymentStatus   PaymentStatus // PENDING | COMPLETED | FAILED
  amountPaid      Decimal
  gateway         String        // "stripe"
  stripeEventId   String        // Prevents duplicate Stripe events
  completedAt     DateTime      // When payment was completed

  userId          String
  user            User

  ideaId          String
  idea            Idea
}
```

**Key field for access control:**

- `paymentStatus = COMPLETED` → User has full access

#### Idea Model (Relevant Fields)

```prisma
model Idea {
  id              String
  title           String
  problemStatement String
  proposedSolution String  // Hidden if not paid
  description     String   // Hidden if not paid

  isPaid          Boolean
  price           Decimal

  authorId        String
  author          User

  purchases       IdeaPurchase[]  // Track all purchases
}
```

## API Endpoints & Access Control

### Get All Approved Ideas

**Endpoint:** `GET /api/ideas`

**Access Control Applied:**

- Filters: Only APPROVED ideas
- Content masking: Applied based on user access level
- Admin access: Can retrieve all approved ideas (content not masked)

**Response:**

```json
{
  "data": [
    {
      "id": "idea-1",
      "title": "Green Energy Initiative",
      "problemStatement": "High electricity costs",
      "proposedSolution": null,
      "description": null,
      "isPaid": true,
      "price": 29.99,
      "author": { ... },
      "category": { ... },
      "hasFullAccess": false
    }
  ],
  "meta": { ... }
}
```

**Response with access granted:**

```json
{
  "data": [
    {
      "id": "idea-1",
      "title": "Green Energy Initiative",
      "problemStatement": "High electricity costs",
      "proposedSolution": "Use solar panels and wind turbines...",
      "description": "A comprehensive plan for sustainable energy...",
      "isPaid": true,
      "price": 29.99,
      "author": { ... },
      "category": { ... },
      "hasFullAccess": true
    }
  ],
  "meta": { ... }
}
```

### Get Idea by ID

**Endpoint:** `GET /api/ideas/:id`

**Access Control Applied:**

- Status check: Non-approved ideas only visible to author/admin
- Content masking: Applied based on user access level

**Response:**

- Full idea if user has access
- 404 if user doesn't have permission

### Admin - Get Review Queue

**Endpoint:** `GET /api/admin/ideas` (or similar)

**Access Control Applied:**

- Admin check: Must be admin role
- No masking: Full content returned
- Can see all idea statuses (DRAFT, PENDING, APPROVED, REJECTED)

**Response:**

```json
{
  "data": [
    {
      "id": "idea-1",
      "title": "...",
      "proposedSolution": "Always visible for admins",
      "description": "Always visible for admins",
      "status": "PENDING",
      "hasFullAccess": true,
      ...
    }
  ]
}
```

**Note:** Admin responses always have `hasFullAccess: true` and no content masking applied.

## Purchase History

### Get User's Purchases

**Endpoint:** `GET /api/purchases`

**Access Control Applied:**

- User can only see their own purchases
- Returns purchased ideas with full content

**Response:**

```json
{
  "data": [
    {
      "id": "purchase-1",
      "paymentStatus": "COMPLETED",
      "completedAt": "2026-07-03T10:00:00Z",
      "idea": {
        "id": "idea-1",
        "title": "...",
        "proposedSolution": "Full content visible",
        "description": "Full content visible"
      }
    }
  ]
}
```

## Security Considerations

### 1. Payment Status Verification

- Access only granted if `paymentStatus = COMPLETED`
- PENDING purchases cannot access content yet
- FAILED purchases have no access

### 2. Duplicate Stripe Events

- `stripeEventId` prevents processing same event twice
- Idempotent: Safe to retry

### 3. User/Idea Validation

- Purchase must match user and idea in Stripe session metadata
- Mismatches logged and rejected

### 4. Admin Bypass

- Admins never need to pay
- Admins can always see full content
- Useful for support and moderation

### 5. Author Access

- Authors always see their own content
- Authors can't "purchase" their own ideas
- System prevents self-purchases

## Testing the Implementation

### Test Case 1: Free Idea - Everyone Can See

```
1. Create free idea (isPaid = false)
2. GET /api/ideas
3. ✓ All users see full content
4. ✓ proposedSolution and description are not null
```

### Test Case 2: Paid Idea - User Without Payment

```
1. Create paid idea (isPaid = true, price = 29.99)
2. User NOT logged in or no purchase
3. GET /api/ideas
4. ✓ proposedSolution = null
5. ✓ description = null
6. ✓ price still visible
```

### Test Case 3: Paid Idea - After Payment

```
1. User initiates purchase
2. User completes Stripe payment
3. Webhook marks purchase as COMPLETED
4. GET /api/ideas/:id
5. ✓ Full content visible
6. ✓ proposedSolution and description not null
```

### Test Case 4: Admin Access

```
1. Admin role user
2. GET /api/admin/ideas
3. ✓ Can see all ideas regardless of status
4. ✓ No content masking applied
5. ✓ Can see DRAFT and REJECTED ideas
```

### Test Case 5: Author Viewing Own Idea

```
1. User creates paid idea
2. User is NOT logged in to "buy" it
3. Author views their own idea
4. ✓ Full content visible
5. ✓ proposedSolution and description not null
```

## Frontend Usage

### Using `hasFullAccess` Property

The `hasFullAccess` property is included in every idea response and indicates whether the current user can view the full content of the idea.

#### Example Response

```json
{
  "id": "idea-1",
  "title": "Green Energy Initiative",
  "problemStatement": "High electricity costs",
  "proposedSolution": null,
  "description": null,
  "isPaid": true,
  "price": 29.99,
  "hasFullAccess": false,
  "author": { ... },
  "category": { ... }
}
```

### Frontend Conditional Rendering Examples

#### React Example

```jsx
function IdeaCard({ idea }) {
  return (
    <div className="idea-card">
      <h2>{idea.title}</h2>
      <p className="problem">{idea.problemStatement}</p>

      {idea.hasFullAccess ? (
        <>
          <p className="solution">{idea.proposedSolution}</p>
          <p className="description">{idea.description}</p>
        </>
      ) : idea.isPaid ? (
        <div className="content-locked">
          <p>🔒 This content is locked</p>
          <p>Price: ${idea.price}</p>
          <button onClick={() => purchaseIdea(idea.id)}>
            Purchase to Unlock
          </button>
        </div>
      ) : null}

      <span className="badge">{idea.isPaid ? "Paid" : "Free"}</span>
    </div>
  );
}
```

#### Vue Example

```vue
<template>
  <div class="idea-card">
    <h2>{{ idea.title }}</h2>
    <p class="problem">{{ idea.problemStatement }}</p>

    <template v-if="idea.hasFullAccess">
      <p class="solution">{{ idea.proposedSolution }}</p>
      <p class="description">{{ idea.description }}</p>
    </template>

    <template v-else-if="idea.isPaid">
      <div class="content-locked">
        <p>🔒 This content is locked</p>
        <p>Price: ${{ idea.price }}</p>
        <button @click="purchaseIdea(idea.id)">Purchase to Unlock</button>
      </div>
    </template>

    <span class="badge">{{ idea.isPaid ? "Paid" : "Free" }}</span>
  </div>
</template>
```

### Displaying Purchase State

Use the `hasFullAccess` property to show appropriate UI elements:

- **`hasFullAccess: true`** → Show full content (proposedSolution, description, etc.)
- **`hasFullAccess: false` + `isPaid: true`** → Show "Purchase" button and preview only
- **`hasFullAccess: false` + `isPaid: false`** → Free idea, show full content (fallback)

### Common Patterns

#### Show Full Content or Preview

```javascript
const canViewFull = idea.hasFullAccess;
const showProposedSolution = canViewFull
  ? idea.proposedSolution
  : idea.proposedSolution?.substring(0, 100) + "...";
```

#### Enable/Disable Purchase Button

```javascript
const shouldShowPurchaseButton = idea.isPaid && !idea.hasFullAccess;
```

#### Check if Content is Masked

```javascript
const isContentMasked =
  idea.isPaid &&
  !idea.hasFullAccess &&
  (idea.proposedSolution === null || idea.description === null);
```

#### Track User Access for Analytics

```javascript
function logIdeaView(idea) {
  analytics.track("idea_viewed", {
    ideaId: idea.id,
    isPaid: idea.isPaid,
    hasAccess: idea.hasFullAccess,
    contentRevealed: idea.hasFullAccess ? "full" : "preview",
  });
}
```

## Troubleshooting

### User Can't See Purchased Idea

**Possible causes:**

- Payment not marked as COMPLETED
- Stripe webhook failed
- User ID mismatch in database

**Solution:**

- Check `idea_purchases` table for record with `paymentStatus = COMPLETED`
- Verify `completedAt` timestamp exists
- Check Stripe webhook logs for failed events

### Admin Seeing Masked Content

**Possible causes:**

- User role not set to ADMIN
- Bug in `hasFullAccess()` logic

**Solution:**

- Verify user `role = ADMIN` in database
- Check if admin middleware is being bypassed
- Review access control function logic

### Duplicate Stripe Events Processing

**Possible causes:**

- Stripe retrying webhook delivery
- Manual webhook replay

**Solution:**

- System automatically handles via `stripeEventId`
- Each event processed only once
- Logs show "Event already processed"

## Related Files

- [src/app/modules/ideas/ideas.service.ts](src/app/modules/ideas/ideas.service.ts) - Core access control logic
- [src/app/modules/ideas/ideas.controller.ts](src/app/modules/ideas/ideas.controller.ts) - API endpoints
- [src/app/modules/purchases/purchases.service.ts](src/app/modules/purchases/purchases.service.ts) - Payment handling
- [src/app/modules/adminIdeas/adminIdeas.service.ts](src/app/modules/adminIdeas/adminIdeas.service.ts) - Admin access
- [prisma/schema/ideaPurchases.prisma](prisma/schema/ideaPurchases.prisma) - Database schema
- [prisma/schema/ideas.prisma](prisma/schema/ideas.prisma) - Ideas schema

## Future Enhancements

- [ ] Subscription model (recurring access)
- [ ] Idea bundles (purchase multiple ideas)
- [ ] Refund system integration
- [ ] Usage tracking and analytics
- [ ] Preview system (show first 50 words of proposedSolution/description)
- [ ] Partial access tiers (basic vs premium)
