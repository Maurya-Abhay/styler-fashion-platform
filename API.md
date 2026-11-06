# ⚡ Styler API Reference

### Styler: A 10-Minute Fashion Professional Matching and Booking Platform

[![API](https://img.shields.io/badge/API-REST-blue?style=for-the-badge)](https://styler-web.vercel.app/api)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-green?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![Expo](https://img.shields.io/badge/Mobile-Expo-000020?style=for-the-badge&logo=expo)](https://expo.dev/)

**Styler API** is the shared backend powering the Styler web platform and its companion React Native mobile application.

It provides a unified REST API for customer accounts, professional discovery, service matching, booking management, payments, notifications, and administrator operations.

---

## 🌐 Live Platform

| Resource | URL |
|---|---|
| 🌍 Web Application | https://styler-web.vercel.app |
| ⚡ API Base URL | https://styler-web.vercel.app/api |
| 📖 API Documentation | [API.md](./API.md) |
| 📱 Mobile Application | [styler-mobile](./styler-mobile/) |

---

## 📊 API Statistics

The following statistics are calculated from the supplied API route inventory.

| Metric | Count |
|---|---:|
| Unique API Endpoint Paths | **96** |
| Total HTTP Method Operations | **121** |
| GET Requests | 54 |
| POST Requests | 41 |
| PATCH Requests | 19 |
| PUT Requests | 1 |
| DELETE Requests | 6 |

### HTTP Method Distribution

| HTTP Method | Operations | Percentage |
|---|---:|---:|
| 🟢 GET | 54 | 44.63% |
| 🔵 POST | 41 | 33.88% |
| 🟡 PATCH | 19 | 15.70% |
| 🟣 PUT | 1 | 0.83% |
| 🔴 DELETE | 6 | 4.96% |
| **Total** | **121** | **100%** |

> **Note:** Endpoint counts are based on the supplied route inventory, not an independent live-server audit. Multiple HTTP methods on the same path count as separate operations.

---

## 📑 Table of Contents

- [🚀 Getting Started](#-getting-started)
- [📖 API Conventions](#-api-conventions)
- [🔐 Authentication and Access Control](#-authentication-and-access-control)
- [📦 Response Format](#-response-format)
- [🌍 Health and Public APIs](#-health-and-public-apis)
- [🔑 Authentication APIs](#-authentication-apis)
- [🛍️ Customer APIs](#-customer-apis)
- [✂️ Professional APIs](#️-professional-apis)
- [🔔 Notification and Upload APIs](#-notification-and-upload-apis)
- [🛡️ Administrator APIs](#️-administrator-apis)
- [⏱️ Scheduled Jobs](#-scheduled-jobs)
- [💳 Payment Webhooks](#-payment-webhooks)
- [💬 Booking Communication APIs](#-booking-communication-apis)
- [🔒 Security and Operational Notes](#-security-and-operational-notes)

---

## 🚀 Getting Started

### Base URL

All API requests use the following base URL:

```text
https://styler-web.vercel.app/api
```

### Example Request

Retrieve the public professional directory:

```http
GET /api/professionals
```

### JavaScript Example

```javascript
const response = await fetch(
  "https://styler-web.vercel.app/api/professionals"
);

const result = await response.json();

if (result.success) {
  console.log(result.data);
}
```

For authenticated endpoints, include the appropriate session credentials supported by the client.

---

## 📖 API Conventions

### HTTP Methods

| Method | Description |
|---|---|
| `GET` | Retrieve resources or information. |
| `POST` | Create resources or execute actions. |
| `PATCH` | Partially update existing resources. |
| `PUT` | Replace a resource or configuration. |
| `DELETE` | Remove or deactivate resources. |

### Request Headers

For JSON requests:

```http
Content-Type: application/json
Accept: application/json
```

### Pagination

Paginated endpoints generally support:

| Parameter | Description |
|---|---|
| `page` | Page number, starting from 1. |
| `limit` | Number of records per page, maximum 100. |

Additional filters depend on the endpoint.

Common filters include:

- `status`
- `category`
- `city`
- `search`
- `professionalId`
- `unreadOnly`

---

## 🔐 Authentication and Access Control

Styler implements role-based authentication and authorization.

### Supported Roles

| Role | Access Description |
|---|---|
| 🌐 Public | No authentication required. |
| 👤 Authenticated | Any signed-in user. |
| 🛍️ Customer | Customer account only. |
| ✂️ Professional | Professional account only. |
| 🛡️ Admin | Administrator account only. |
| 🔒 Owner-scoped | Resource ownership and authorization required. |
| ⚙️ Cron | Requires the configured `CRON_SECRET`. |
| 💳 Razorpay | Requires provider signature verification. |

### Authentication Mechanisms

**Web Application**

- Secure HTTP-only session cookies.
- Server-side session validation.

**Mobile Application**

- Session credentials stored through Expo SecureStore.
- Authenticated requests to the shared API.

### Access Restrictions

- Public registration supports customers and professionals only.
- Administrator accounts cannot be created through public registration.
- Admin endpoints require administrator authorization.
- Customer and professional resources are protected by role and ownership checks.
- Scheduled jobs require cron authorization.
- Payment webhooks require valid provider signature verification.

---

## 📦 Response Format

Styler API uses a consistent JSON response envelope.

### Success Response

```json
{
  "success": true,
  "data": {},
  "requestId": "request-id"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "A description of the error",
    "details": {}
  },
  "requestId": "request-id"
}
```

### Response Fields

| Field | Description |
|---|---|
| `success` | Indicates whether the request succeeded. |
| `data` | Returned data for successful requests. |
| `error.code` | Application-specific error code. |
| `error.message` | Human-readable error description. |
| `error.details` | Additional error information, when available. |
| `requestId` | Request identifier. |

---

# 🌍 Health and Public APIs

Public endpoints provide professional discovery, service browsing, reviews, and shared platform functionality.

### 1. Health and Contact

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/health` | Public | Check application and database health. |
| POST | `/contact` | Public | Submit a contact or support message. |

The contact endpoint includes validation and rate limiting.

### 2. Professional Discovery

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/professionals` | Public | Search approved professional profiles. |
| GET | `/professionals/[slug]` | Public | Retrieve a professional's public profile, services, and review information. |

Supported filters include category, city, and text search.

### 3. Service Discovery

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/services` | Public | List active services offered by approved professionals. |
| GET | `/services/[serviceId]` | Public | Retrieve an individual active public service. |

### 4. Reviews

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/reviews` | Public | List published reviews, optionally filtered by professional. |

### 5. Location Services

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/location/reverse-geocode` | Customer / Professional | Convert coordinates into a normalized address through the server-side geocoding proxy. |

---

# 🔑 Authentication APIs

Authentication endpoints handle account registration, login, email verification, password recovery, and session management.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register a customer or professional and begin email verification. |
| POST | `/auth/login` | Public | Authenticate an account and create a web or mobile session. |
| POST | `/auth/logout` | Authenticated | Revoke the current session and clear its cookie or token. |
| GET | `/auth/me` | Authenticated | Retrieve the current safe user profile and session context. |
| POST | `/auth/refresh` | Authenticated | Refresh the current session when permitted. |
| POST | `/auth/verify-email` | Public | Verify an email address using a one-time code. |
| POST | `/auth/resend-otp` | Public | Request another email verification code. |
| POST | `/auth/forgot-password` | Public | Start password recovery without revealing whether an account exists. |
| POST | `/auth/reset-password` | Public | Reset a password using a valid reset code. |

### Account Management

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/account/profile` | Customer / Professional | Retrieve safe account details and notification preferences. |
| PATCH | `/account/profile` | Customer / Professional | Update permitted account details and notification preferences. |
| POST | `/account/change-password` | Customer / Professional | Change the current password after verifying the existing password. Other sessions are revoked. |

---

# 🛍️ Customer APIs

Customer APIs manage service discovery, booking requests, appointments, payments, saved addresses, favorites, and reviews.

### 1. Customer Dashboard

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/customer/dashboard` | Customer | Retrieve booking, request, notification, and payment summaries, including a six-month payment trend. |

### 2. Booking Requests

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/booking-requests` | Customer / Admin | List customer requests or all requests for administrators. |
| POST | `/booking-requests` | Customer | Create a service request and dispatch offers only to active, approved professionals matching the selected category, location, active service listing, and availability. Pinned professionals must be inside the requested radius; when a professional has no map pin, an exact city/state/PIN match is required. |
| GET | `/booking-requests/[requestId]` | Customer / Professional / Admin | Retrieve a request subject to ownership or offer authorization. |
| PATCH | `/booking-requests/[requestId]` | Customer | Cancel an active, unassigned request and close sent offers. |

**Privacy:** Professional responses do not expose the customer's exact address.

### 3. Booking Offers

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/booking-offers` | Professional | List offers addressed to the approved professional. |
| POST | `/booking-offers/[offerId]/accept` | Professional | Accept an eligible offer and submit a validated quote when required. |
| POST | `/booking-offers/[offerId]/reject` | Professional | Reject an offer addressed to the professional. |

### 4. Booking Management

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/bookings` | Customer / Professional / Admin | List bookings according to the signed-in user's role. |
| GET | `/bookings/[bookingId]` | Owner-scoped / Admin | Retrieve booking details. |
| POST | `/bookings/[bookingId]/cancel` | Customer / Professional / Admin | Cancel an eligible booking according to the platform cancellation and refund policy. |
| POST | `/bookings/[bookingId]/start` | Professional | Mark a confirmed booking as in progress. |
| POST | `/bookings/[bookingId]/complete` | Professional | Complete an in-progress booking and create payout bookkeeping. |

### 5. Customer Payments

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/payments/order` | Customer | Create or reuse a payment order for an accepted booking. |
| POST | `/payments/verify` | Customer | Verify checkout payment information and reconcile booking/payment state. |
| GET | `/customer/payments` | Customer | Retrieve customer payment records and payment summary. |

Accepted booking slots remain reserved until payment or cancellation according to the implemented workflow.

### 6. Customer Reviews

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/reviews` | Customer | Submit a review for an eligible completed booking. |

Published reviews are available through the public reviews endpoint.

### 7. Customer Profile

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/customer/profile` | Authenticated | Retrieve the current user's safe profile and account settings. |
| PATCH | `/customer/profile` | Customer / Professional | Update permitted account fields. |
| POST | `/customer/change-password` | Customer / Professional | Change the current password after verification and revoke other active sessions. |

Password changes are also supported through `/account/change-password`.

### 8. Saved Addresses

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/customer/addresses` | Customer | List saved customer addresses. |
| POST | `/customer/addresses` | Customer | Add a saved address. |
| PATCH | `/customer/addresses/[addressId]` | Customer | Update an owned address. |
| DELETE | `/customer/addresses/[addressId]` | Customer | Delete an owned address. |

### 9. Favorite Professionals

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/customer/favorites` | Customer | List saved professionals. |
| POST | `/customer/favorites` | Customer | Add a professional to favorites. |
| DELETE | `/customer/favorites/[professionalId]` | Customer | Remove a professional from favorites. |

---

# ✂️ Professional APIs

Professional APIs allow fashion and beauty service providers to manage their profiles, services, availability, booking requests, appointments, earnings, and payouts.

## 1. Professional Dashboard

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/professional/dashboard` | Professional | Retrieve profile, offers, bookings, payouts, reviews, services, availability, and weekly payout trends. |

## 2. Professional Onboarding

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/professional/application` | Professional | Retrieve professional application and profile status. |
| PATCH | `/professional/application` | Professional | Update onboarding information, service-location pin, and application details. |
| PATCH | `/professional/public-profile` | Professional | Update public studio name, description, and profile photo. |

> Application submission requires a location pin for administrator review.

## 3. Professional Services

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/professional/services` | Professional | List the professional's services. |
| POST | `/professional/services` | Professional | Create a service with fixed, starting-from, or quote-required pricing. |
| PATCH | `/professional/services/[serviceId]` | Professional | Update an owned service. |
| DELETE | `/professional/services/[serviceId]` | Professional | Deactivate or delete an owned service. |

## 4. Availability Management

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/professional/availability` | Professional | Retrieve weekly schedules, exceptions, and request-acceptance settings. |
| PUT | `/professional/availability` | Professional | Replace availability schedule and request-acceptance settings. |
| PATCH | `/professional/accepting-requests` | Professional | Enable or disable new booking requests. |

## 5. Professional Location

| Method | Endpoint | Access | Description |
|---|---|---|---|
| PATCH | `/professional/location` | Professional | Update service-area location and coordinates. |

City, state, and PIN information can be supplied through reverse geocoding or corrected manually.

## 6. Matching Requests and Offers

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/professional/requests` | Professional | List active matching offers, approximate GPS distance, and request details. |
| GET | `/booking-offers` | Professional | List offers addressed to the approved professional. |
| POST | `/booking-offers/[offerId]/accept` | Professional | Accept an eligible offer and submit a quote when required. |
| POST | `/booking-offers/[offerId]/reject` | Professional | Reject an offer addressed to the professional. |

**Privacy:** Customer street addresses and exact location pins are not exposed through professional request responses.

## 7. Professional Booking Management

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/professional/bookings` | Professional | List bookings assigned to the professional. |
| GET | `/professional/bookings/[bookingId]` | Professional / Owner-scoped | Retrieve assigned booking details. |
| PATCH | `/professional/bookings/[bookingId]/location` | Professional | Share current coordinates for a confirmed or in-progress booking. |
| DELETE | `/professional/bookings/[bookingId]/location` | Professional | Stop location sharing and remove stored live-location history. |
| POST | `/professional/bookings/[bookingId]/updates` | Professional | Send booking or arrival updates, optionally including an ETA. |

## 8. Professional Earnings

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/professional/earnings` | Professional | Retrieve earnings, commissions, and payout summary. |

## 9. Professional Payout Accounts

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/professional/payout-account` | Professional | Retrieve UPI payout setup and verification status. |
| PATCH | `/professional/payout-account` | Professional | Submit or update account-holder name and UPI ID for administrator review. |

Changed payout details require re-verification.

## 10. Professional Reviews

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/professional/reviews` | Professional | Retrieve reviews associated with the professional. |

---

# 🔔 Notification and Upload APIs

Styler provides notification management, browser push subscriptions, mobile device registration, media upload authorization, and receipt access.

## 1. Notification Feed

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/notifications` | Authenticated | List user notifications with pagination and optional unread filtering. |
| PATCH | `/notifications/[notificationId]/read` | Authenticated / Owner-scoped | Mark an owned notification as read. |
| PATCH | `/notifications/read-all` | Authenticated | Mark all unread notifications belonging to the current user as read. |

## 2. Web Push Subscriptions

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/notifications/push-subscriptions` | Authenticated | Retrieve the configured Web Push public key. |
| POST | `/notifications/push-subscriptions` | Authenticated | Save or update a Web Push subscription. |
| DELETE | `/notifications/push-subscriptions` | Authenticated | Deactivate the current user's Web Push subscription. |

## 3. Mobile Device Tokens

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/notifications/device-tokens` | Customer / Professional | Register an Expo push token for an authenticated physical device. |
| DELETE | `/notifications/device-tokens` | Customer / Professional | Deactivate the authenticated user's Expo push token. |

## 4. Media Upload Authorization

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/imagekit/auth` | Customer / Professional | Generate a constrained ImageKit upload signature for an allowed upload purpose. |

## 5. Payment and Payout Receipts

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/receipts/[receiptType]/[recordId]` | Customer / Professional | Retrieve an owned payment or completed payout receipt. |

Supported receipt types:

- `payment`
- `payout`

HTML is returned by default.

Payment receipts can request JSON:

```http
GET /api/receipts/payment/RECORD_ID?format=json
```

An `Accept: application/json` header also requests JSON for payment receipts.

---

# 🛡️ Administrator APIs

All endpoints in this section require administrator authorization.

The administrator dashboard provides operational control over customers, professionals, service categories, applications, bookings, payments, payouts, commissions, reports, and platform settings.

## 1. Service Category Management

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/service-categories` | Public | List active categories used by web and mobile clients. |
| GET | `/admin/service-categories` | Admin | List active and inactive categories. |
| POST | `/admin/service-categories` | Admin | Create a category; its stable slug is generated from its name. |
| PATCH | `/admin/service-categories/[categoryId]` | Admin | Edit category details or activate/deactivate it. |
| DELETE | `/admin/service-categories/[categoryId]` | Admin | Permanently delete an unused category. Categories in use must be deactivated instead. |

## 2. Admin Dashboard

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/admin/dashboard` | Admin | Retrieve platform counts, payment and revenue trends, booking trends, payout exposure, booking statuses, and recent bookings. |

## 3. Professional Application Management

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/admin/applications` | Admin | List professional applications for review. |
| GET | `/admin/applications/[id]` | Admin | Retrieve application details and review materials. |
| POST | `/admin/applications/[id]/approve` | Admin | Approve a professional application. |
| POST | `/admin/applications/[id]/reject` | Admin | Reject an application with a reason. |
| POST | `/admin/applications/[id]/request-changes` | Admin | Request applicant corrections. |
| GET | `/admin/applications/[id]/documents/[documentId]` | Admin | Authorize access to a private application document. |

## 4. Customer and User Management

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/admin/users` | Admin | Search customer and professional accounts by role or status. |
| PATCH | `/admin/users/[userId]/suspend` | Admin | Suspend or reactivate a customer or professional account with an audit reason. |

**Important:**

- Administrator accounts are excluded from user listings.
- Administrator accounts cannot be targeted through this suspension endpoint.
- User management is restricted to authorized administrators.

## 5. Professional Management

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/admin/professionals` | Admin | List professional profiles and application/account statuses. |
| GET | `/admin/professionals/[id]` | Admin | Retrieve professional profile, services, and recent payouts. |
| POST | `/admin/professionals/[id]/suspend` | Admin | Suspend or reactivate a professional profile and matching availability. |

## 6. Booking Request Management

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/admin/booking-requests` | Admin | List and filter marketplace booking requests. |
| PATCH | `/admin/booking-requests/[requestId]` | Admin | Cancel an active unassigned request, close offers, and notify the customer. |

## 7. Booking Management

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/admin/bookings` | Admin | List platform bookings. |

## 8. Payment and Refund Management

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/admin/payments` | Admin | List and filter platform payment records. |
| POST | `/admin/payments/[paymentId]/refund` | Admin | Request an eligible provider refund with an audit trail. |

## 9. Payout Account Management

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/admin/payout-accounts` | Admin | List professional payout accounts. |
| PATCH | `/admin/payout-accounts/[profileId]/verify` | Admin | Verify, reject, or restrict submitted professional payout details. |

The default payout account filter is:

```text
status=pending
```

> UPI ownership must be checked outside Styler.

## 9. Payout Management

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/admin/payouts` | Admin | List payout records. |
| POST | `/admin/payouts/[payoutId]/process` | Admin | Prepare a manual UPI payout, cancel an unsent preparation, or record a transaction reference after transfer. |

Legacy Razorpay Route payouts remain supported.

## 10. Commission Management

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/admin/commissions` | Admin | Retrieve commission configuration and overrides. |
| PATCH | `/admin/commissions` | Admin | Update platform commission settings and overrides. |

## 11. Reports and Analytics

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/admin/reports` | Admin | Retrieve booking, payment, and payout reporting summaries. |

## 12. Platform Settings

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/admin/settings` | Admin | Retrieve platform operational settings. |
| PATCH | `/admin/settings` | Admin | Update permitted platform operational settings. |

## 13. Audit Logs

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/admin/audit-logs` | Admin | Search and retrieve paginated administrative and system audit entries. |

## 14. Contact Message Management

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/admin/contact-messages` | Admin | List contact-form submissions with optional status filtering. |
| PATCH | `/admin/contact-messages/[messageId]` | Admin | Update submissions through new, in-progress, or resolved states. |

---

# ⏱️ Scheduled Jobs (Cron APIs)

Styler includes scheduled API operations to maintain booking requests, professional matching, payment holds, notification delivery, and payout reconciliation.

These endpoints support both `GET` and `POST` methods.

## 1. Cron Authentication

Every scheduled-job request requires the configured cron authorization secret.

```http
Authorization: Bearer YOUR_CRON_SECRET
```

The secret must remain private and must never be exposed in frontend or mobile application code.

## 2. Available Cron Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET, POST | `/cron/expire-offers` | Cron | Expire outstanding offers and requests past their deadlines. |
| GET, POST | `/cron/expire-payment-holds` | Cron | Remove legacy payment deadlines while preserving accepted booking slots until payment or cancellation. |
| GET, POST | `/cron/retry-matching-requests` | Cron | Retry offer dispatch for requests that remain in matching state. |
| GET, POST | `/cron/retry-notifications` | Cron | Retry queued or failed email, browser-push, and native mobile-push deliveries. |
| GET, POST | `/cron/reconcile-payouts` | Cron | Reconcile missing payouts after completed bookings and release eligible account-verification holds. |

## 3. Cron Job Responsibilities

### Offer Expiration

- Check outstanding professional offers.
- Expire offers that pass their response deadlines.
- Update relevant booking request states.

### Payment Hold Expiration

- Handle legacy payment deadlines.
- Preserve accepted booking slots until payment or cancellation.

### Matching Retry

- Identify requests that remain in matching state.
- Retry professional offer dispatch.

### Notification Retry

- Retry eligible queued or failed notifications.
- Support email, browser push, and native mobile push delivery.
- Use bounded concurrency.

Native push delivery is also attempted immediately when a notification is created.

### Payout Reconciliation

- Identify completed bookings with missing payout records.
- Reconcile eligible payout records.
- Release account-verification holds when the required conditions are met.

## 4. Production Scheduling

An external scheduler must invoke the protected cron endpoints in production.

The checked-in `vercel.json` currently schedules five jobs once per day:

| Job Schedule | Time (UTC) |
|---|---|
| Job 1 | 00:00 |
| Job 2 | 00:02 |
| Job 3 | 00:04 |
| Job 4 | 00:06 |
| Job 5 | 00:08 |

> Verify the actual deployment configuration and hosting-plan limits before production. A more frequent schedule may require a separately configured authenticated scheduler.

---

# 💳 Razorpay Payment Webhooks

Styler integrates Razorpay webhooks to receive payment provider events and reconcile payment information.

## Available Webhook

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/webhooks/razorpay` | Razorpay | Verify Razorpay webhook signatures and reconcile provider events idempotently. |

## Webhook Configuration

Configure the following in your Razorpay dashboard:

```text
Webhook URL:
https://styler-web.vercel.app/api/webhooks/razorpay
```

Configure the corresponding webhook secret in the server environment:

```env
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

## Webhook Security

- Verify provider signatures before processing events.
- Keep webhook secrets exclusively on the server.
- Configure the correct webhook URL.
- Test payment and refund workflows using provider test credentials.
- Verify reconciliation behaviour before production launch.

---

# 💬 Booking Communication APIs

Styler supports communication between customers and their assigned professionals through booking-specific conversations.

Access is restricted to the customer and professional participating in an accepted booking.

## Available Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/bookings/[bookingId]/messages` | Booking Customer / Assigned Professional | Retrieve the latest messages for an accepted booking. |
| POST | `/bookings/[bookingId]/messages` | Booking Customer / Assigned Professional | Send a message within an eligible booking conversation. |

## Messaging Rules

- Only the booking customer and assigned professional can access the conversation.
- Exact booking participation is required.
- Messaging is supported while a booking is pending payment, confirmed, or in progress.
- New messages queue in-app and native push notifications for the other participant.

---

# 🔒 Security and Access Control

Security is an important part of the Styler API architecture.

The server acts as the central authorization and business-logic layer for both the web platform and mobile application.

## 1. Authentication Security

- Web sessions use secure HTTP-only cookies.
- Mobile session credentials are stored through Expo SecureStore.
- Password changes require verification of the existing password.
- Other active sessions are revoked after a password change.
- Protected endpoints require valid authentication.

## 2. Role-Based Authorization

Styler supports separate access permissions for:

| Role | Access |
|---|---|
| Public | Public discovery and permitted account operations. |
| Customer | Customer profile, requests, bookings, and payments. |
| Professional | Professional profile, services, offers, and earnings. |
| Admin | Administrative operations and marketplace management. |

Authorization and ownership checks are applied to protected resources.

## 3. Customer Privacy

- Professional request responses do not expose exact customer street addresses.
- Approximate GPS distance may be provided for matching.
- Booking details are restricted to authorized participants.
- Booking conversations require exact booking participation.

## 4. Administrator Security

- Public registration cannot create administrator accounts.
- Administrator accounts are excluded from ordinary user management.
- The user suspension API cannot target administrators.
- Initial administrator provisioning requires a trusted, access-controlled deployment process.
- Administrative actions include audit logging where implemented.

## 5. Payment Security

- Razorpay webhook signatures must be verified.
- Payment operations require valid provider credentials.
- Refund operations are restricted to authorized administrators.
- Payment and booking state reconciliation is handled server-side.
- Never expose Razorpay secret keys in frontend or mobile application code.

## 6. Payout Security

- Professional payout details require administrator review.
- Changed payout details require re-verification.
- UPI ownership must be verified outside Styler.
- Manual payout operations should follow appropriate financial verification procedures.

## 7. Upload Security

- ImageKit upload authorization is generated through the server.
- Upload signatures are constrained to permitted upload purposes.
- ImageKit private keys must remain server-side.

## 8. Scheduled Job Security

- Cron endpoints require `CRON_SECRET`.
- The authorization secret must never be included in public client code.
- Production schedulers must use authenticated requests.

---

# ⚙️ External Integrations

Styler uses external services to support its marketplace operations.

| Integration | Purpose |
|---|---|
| MongoDB | Database and application data storage. |
| Razorpay | Payment processing and supported refund workflows. |
| ImageKit | Image and media upload management. |
| ZeptoMail-compatible SMTP | Transactional email delivery. |
| Web Push | Browser notifications. |
| Expo Notifications | Native mobile push notifications. |
| Geocoding Provider | Reverse geocoding and address normalization. |
| Vercel | Web application and API deployment. |
| Expo EAS | Mobile application builds and deployment workflows. |

> External integrations require valid credentials and appropriate staging and production configuration. Their availability should be verified independently before launch.

---

# 🗄️ Database and Transaction Requirements

Styler uses MongoDB with Mongoose for data persistence.

Booking and payment workflows use database transactions.

### Database Requirements

- Use a MongoDB replica set or compatible managed deployment.
- Configure the correct `MONGODB_URI`.
- Ensure the deployment supports transactions.
- Use separate development, testing, and production databases.
- Never run integration tests against production data.

### Example Environment Variable

```env
MONGODB_URI=mongodb+srv://your-database-connection
```

The example above is a placeholder. Use your actual database connection string.

---

# 🏗️ API Architecture

The Styler API follows a shared-backend architecture.

Both the Next.js web platform and Expo React Native application communicate with the same API.

```text
                   STYLER ECOSYSTEM
                          |
              +-----------+-----------+
              |                       |
        WEB APPLICATION          MOBILE APP
           Next.js              React Native
              |                       |
              +-----------+-----------+
                          |
                    SHARED API
                   Next.js Routes
                          |
             +------------+------------+
             |            |            |
         AUTHENTICATION  BUSINESS    VALIDATION
                        LOGIC
             |            |            |
             +------------+------------+
                          |
                       MONGODB
                          |
              +-----------+-----------+
              |           |           |
           PAYMENTS   NOTIFICATIONS  STORAGE
           Razorpay   Expo/Web Push  ImageKit
```

### Main Architecture Principles

- One shared API for web and mobile clients.
- Centralized server-side business logic.
- Role-based access control.
- Resource ownership validation.
- Server-side payment verification.
- Transaction-backed booking and payment workflows.
- External integrations through server-side services.

---

# 📁 Project Structure

The API is implemented using Next.js Route Handlers.

| Directory | Responsibility |
|---|---|
| `src/app/api/` | API route handlers. |
| `src/models/` | MongoDB and Mongoose models. |
| `src/lib/` | Shared server-side business logic and integrations. |
| `src/app/api/auth/` | Authentication endpoints. |
| `src/app/api/customer/` | Customer endpoints. |
| `src/app/api/professional/` | Professional endpoints. |
| `src/app/api/admin/` | Administrator endpoints. |
| `src/app/api/cron/` | Scheduled operations. |
| `src/app/api/webhooks/` | External provider webhooks. |
| `styler-mobile/` | Expo React Native application. |

---

# 🧪 Testing and Verification

Before deploying API changes, run the relevant checks from the repository root.

```bash
npm run typecheck
npm test
npm run test:integration
npm run build
```

### Mobile Application Checks

From the `styler-mobile/` directory:

```bash
npm run typecheck
npm run check:expo
npm run doctor
npm run preflight
```

### Integration Testing Recommendations

Test the following workflows in a staging environment:

- Customer registration and email verification.
- Professional onboarding and administrator approval.
- Professional service creation and availability.
- Booking request creation and offer matching.
- Offer acceptance and quote handling.
- Payment order creation and payment verification.
- Booking cancellation and refund handling.
- Professional booking completion and payout reconciliation.
- In-app and mobile notification delivery.
- Booking conversations.
- Administrator operations and audit logging.

Provider-backed workflows require valid staging credentials.

---

# 📝 Documentation Maintenance

This reference represents the supplied API route-handler inventory.

To keep the documentation accurate:

1. Update this reference whenever an endpoint is added or removed.
2. Document every supported HTTP method.
3. Specify the correct authorization requirements.
4. Update endpoint descriptions when behaviour changes.
5. Update API statistics after route changes.
6. Review affected web and mobile integrations.
7. Document new external integrations and required environment variables.
8. Verify important workflows through appropriate tests.

For route-level implementation details, refer to the actual handlers under `src/app/api/`.

---

# ⚠️ Important Production Considerations

Before treating Styler as production-ready, verify the following:

- [ ] Initial administrator provisioning is completed securely.
- [ ] Production environment variables are configured.
- [ ] MongoDB transactions work in the production database.
- [ ] Razorpay checkout and webhook workflows are tested.
- [ ] Refund and payout processes are verified.
- [ ] Professional payout ownership verification procedures are established.
- [ ] Email delivery is tested.
- [ ] Expo push notifications are configured.
- [ ] ImageKit uploads are tested.
- [ ] Cron jobs are scheduled and authenticated.
- [ ] Monitoring and error reporting are configured.
- [ ] Backup and recovery procedures are established.
- [ ] Privacy and security checks are completed.

---

# 🔗 Related Resources

| Resource | Link |
|---|---|
| 🌍 Styler Web Application | [Open Website](https://styler-web.vercel.app) |
| ⚡ Styler API Base URL | [Open API](https://styler-web.vercel.app/api) |
| 📘 Main Project Documentation | [README.md](./README.md) |
| 📖 API Reference | [API.md](./API.md) |
| ⚙️ Web Environment Example | [`.env.example`](./.env.example) |
| 📱 Mobile Application | [`styler-mobile/`](./styler-mobile/) |

---

<div align="center">

# ✨ Styler API

### Powering the Styler Marketplace Ecosystem

A unified backend connecting customers, fashion professionals, and administrators through one platform.

**Discover. Match. Book. Style.**

[🌍 Website](https://styler-web.vercel.app) · [⚡ API](https://styler-web.vercel.app/api)

Built with ❤️ using Next.js, TypeScript, MongoDB, and Expo.

</div>