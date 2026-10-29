# Styler API Reference

This reference covers the Next.js Route Handlers under `src/app/api`. The API is same-origin and returns a JSON envelope:

```json
{ "success": true, "data": {}, "requestId": "..." }
```

Errors use `{ "success": false, "error": { "code": "...", "message": "...", "details": {} }, "requestId": "..." }`.
Authenticated web requests use the secure HTTP-only session cookie. Mobile authentication is described in the README; never put session tokens in ordinary browser storage. Paginated list endpoints generally accept `page` (1-based) and `limit` (maximum 100).

**Role legend:** Public = no login; Authenticated = any signed-in role; Customer / Professional / Admin = that role only; Owner-scoped = role and ownership are checked by the handler; Cron = `Authorization: Bearer <CRON_SECRET>`; Razorpay = provider signature verification.

## Health, public discovery, and shared services

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET | `/api/health` | Public | Check application and database health. |
| POST | `/api/contact` | Public | Submit a contact/support message; validated and rate-limited. |
| GET | `/api/professionals` | Public | Search approved professional profiles; supports category, city, and text filters. |
| GET | `/api/professionals/[slug]` | Public | Fetch a public professional profile and its public service/review data. |
| GET | `/api/services` | Public | List active services offered by approved professionals; supports category/search filters. |
| GET | `/api/services/[serviceId]` | Public | Fetch an active public service. |
| GET | `/api/reviews` | Public | List published reviews; optionally filter by professional. |
| POST | `/api/location/reverse-geocode` | Customer / Professional | Convert coordinates to a normalized address through the server-side geocoding proxy. |

## Scheduled jobs

These endpoints require the configured cron authorization secret. Both GET and POST are supported for scheduler compatibility.

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET, POST | `/api/cron/expire-offers` | Cron | Expire outstanding offers and requests past their deadlines. |
| GET, POST | `/api/cron/expire-payment-holds` | Cron | Expire unpaid booking holds and reconcile their booking state. |
| GET, POST | `/api/cron/retry-matching-requests` | Cron | Retry offer dispatch for requests still in matching state. |
| GET, POST | `/api/cron/retry-notifications` | Cron | Lease and deliver queued email/web-push notifications with bounded concurrency and exponential retry. |
| GET, POST | `/api/cron/reconcile-payouts` | Cron | Reconcile payouts missing after completed bookings and release account-verification holds when eligible. |

## Authentication

| Method | Route | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register a customer or professional and begin email verification. Public registration cannot create admins. |
| POST | `/api/auth/login` | Public | Authenticate an active account and create a web or mobile session. |
| POST | `/api/auth/logout` | Authenticated | Revoke the current session and clear its cookie/token. |
| GET | `/api/auth/me` | Authenticated | Return the current safe user profile and session context. |
| POST | `/api/auth/refresh` | Authenticated | Refresh the current session when its refresh policy permits. |
| POST | `/api/auth/verify-email` | Public | Verify an email address using its one-time code. |
| POST | `/api/auth/resend-otp` | Public | Request another email-verification code; rate-limited. |
| POST | `/api/auth/forgot-password` | Public | Start a password-reset flow without exposing whether an account exists. |
| POST | `/api/auth/reset-password` | Public | Reset a password using a valid reset code. |

## Customer requests, bookings, and payments

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET | `/api/booking-requests` | Customer / Admin | List the signed-in customer's requests, or all requests for admins; optional status filter. |
| POST | `/api/booking-requests` | Customer | Validate and create a service request, then dispatch matching offers. |
| GET | `/api/booking-requests/[requestId]` | Customer / Professional / Admin | Read a request subject to owner/offer authorization; professional responses omit the exact address. |
| PATCH | `/api/booking-requests/[requestId]` | Customer | Cancel the customer's active, unassigned request and close sent offers. |
| GET | `/api/booking-offers` | Professional | List offers addressed to the approved professional; optional status filter. |
| POST | `/api/booking-offers/[offerId]/accept` | Professional | Accept an eligible offer; quote-required services include a validated quote. |
| POST | `/api/booking-offers/[offerId]/reject` | Professional | Reject an offer addressed to the professional. |
| GET | `/api/bookings` | Customer / Professional / Admin | List bookings scoped to the signed-in customer/professional, or all bookings for admins; optional status filter. |
| GET | `/api/bookings/[bookingId]` | Owner-scoped / Admin | Fetch booking details. |
| POST | `/api/bookings/[bookingId]/cancel` | Customer / Professional / Admin | Cancel an eligible booking according to platform cancellation/refund policy. |
| POST | `/api/bookings/[bookingId]/start` | Professional | Mark the professional's confirmed booking as in progress. |
| POST | `/api/bookings/[bookingId]/complete` | Professional | Complete an in-progress booking and create payout bookkeeping. |
| POST | `/api/payments/order` | Customer | Create a payment order for the customer's eligible booking. |
| POST | `/api/payments/verify` | Customer | Verify checkout payment details and reconcile booking/payment state. |
| GET | `/api/customer/payments` | Customer | List the customer's payments and payment summary. |
| POST | `/api/reviews` | Customer | Review the customer's completed booking. |
| GET | `/api/reviews` | Public | List published reviews; optional professional filter. |

## Customer profile and saved data

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET | `/api/customer/profile` | Customer | Read the customer's safe profile and saved-account settings. |
| PATCH | `/api/customer/profile` | Customer | Update permitted customer profile fields. |
| GET | `/api/customer/addresses` | Customer | List saved customer addresses. |
| POST | `/api/customer/addresses` | Customer | Add a saved address. |
| PATCH | `/api/customer/addresses/[addressId]` | Customer | Update an address owned by the customer. |
| DELETE | `/api/customer/addresses/[addressId]` | Customer | Delete an address owned by the customer. |
| GET | `/api/customer/favorites` | Customer | List the customer's saved professionals. |
| POST | `/api/customer/favorites` | Customer | Add a professional to favorites. |
| DELETE | `/api/customer/favorites/[professionalId]` | Customer | Remove a professional from favorites. |

## Professional portal

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET | `/api/professional/application` | Professional | Read the professional application/profile state. |
| PATCH | `/api/professional/application` | Professional | Update onboarding/profile data and submit application changes. |
| GET | `/api/professional/services` | Professional | List the professional's services. |
| POST | `/api/professional/services` | Professional | Create a service listing, including fixed, starting-from, or quote-required pricing. |
| PATCH | `/api/professional/services/[serviceId]` | Professional | Update a service owned by the professional. |
| DELETE | `/api/professional/services/[serviceId]` | Professional | Deactivate/delete a service owned by the professional. |
| GET | `/api/professional/availability` | Professional | Read weekly schedule, exceptions, and request-acceptance settings. |
| PUT | `/api/professional/availability` | Professional | Replace availability schedule and request-acceptance settings. |
| PATCH | `/api/professional/accepting-requests` | Professional | Toggle whether the professional is accepting new requests. |
| PATCH | `/api/professional/location` | Professional | Update the professional's service-area location and coordinates. |
| GET | `/api/professional/requests` | Professional | List active matching offers/request details without customer street address. |
| GET | `/api/professional/bookings` | Professional | List bookings assigned to the professional. |
| GET | `/api/professional/bookings/[bookingId]` | Professional / Owner-scoped | Read details for a booking assigned to the professional. |
| GET | `/api/professional/earnings` | Professional | Read earnings, commissions, and payout summary. |
| GET | `/api/professional/payout-account` | Professional | Read payout-account onboarding state. |
| PATCH | `/api/professional/payout-account` | Professional | Submit or update payout-account onboarding details. |
| GET | `/api/professional/reviews` | Professional | List reviews for the professional. |

## Notifications and uploads

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET | `/api/notifications` | Authenticated | List the current user's notifications; supports pagination and `unreadOnly=true`. |
| PATCH | `/api/notifications/[notificationId]/read` | Authenticated / Owner-scoped | Mark the current user's notification as read. |
| GET | `/api/notifications/push-subscriptions` | Authenticated | Return the configured Web Push public key. |
| POST | `/api/notifications/push-subscriptions` | Authenticated | Save/update a Web Push subscription for the current user. |
| DELETE | `/api/notifications/push-subscriptions` | Authenticated | Deactivate the current user's Web Push subscription endpoint. |
| POST | `/api/imagekit/auth` | Customer / Professional | Create a constrained ImageKit upload signature for an allowed upload purpose. |

## Admin portal

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET | `/api/admin/dashboard` | Admin | Load dashboard counts and period-based financial metrics. |
| GET | `/api/admin/applications` | Admin | List professional applications for review. |
| GET | `/api/admin/applications/[id]` | Admin | Read application details and review materials. |
| POST | `/api/admin/applications/[id]/approve` | Admin | Approve a professional application. |
| POST | `/api/admin/applications/[id]/reject` | Admin | Reject a professional application with a reason. |
| POST | `/api/admin/applications/[id]/request-changes` | Admin | Request applicant corrections. |
| GET | `/api/admin/applications/[id]/documents/[documentId]` | Admin | Authorize access to a private application document. |
| GET | `/api/admin/users` | Admin | List/search customer and professional accounts; filter by role/status. Admin accounts are excluded. |
| PATCH | `/api/admin/users/[userId]/suspend` | Admin | Suspend/reactivate a customer or professional account with an audit reason; cannot target admins. |
| GET | `/api/admin/professionals` | Admin | List professional profiles and account/application statuses. |
| GET | `/api/admin/professionals/[id]` | Admin | Read a professional profile, services, and recent payouts. |
| POST | `/api/admin/professionals/[id]/suspend` | Admin | Suspend/reactivate a professional profile and matching availability. |
| GET | `/api/admin/booking-requests` | Admin | List and filter marketplace booking requests. |
| PATCH | `/api/admin/booking-requests/[requestId]` | Admin | Cancel an active unassigned request, close offers, and notify the customer. |
| GET | `/api/admin/bookings` | Admin | List platform bookings. |
| GET | `/api/admin/payments` | Admin | List and filter platform payment records. |
| POST | `/api/admin/payments/[paymentId]/refund` | Admin | Request an eligible provider refund with an audit trail. |
| GET | `/api/admin/payouts` | Admin | List payout records. |
| POST | `/api/admin/payouts/[payoutId]/process` | Admin | Process an eligible payout through configured provider integration. |
| PATCH | `/api/admin/payout-accounts/[profileId]/verify` | Admin | Verify/restrict a professional payout account. |
| GET | `/api/admin/commissions` | Admin | Read commission configuration and overrides. |
| PATCH | `/api/admin/commissions` | Admin | Update platform commission settings/overrides. |
| GET | `/api/admin/reports` | Admin | Read booking, payment, and payout reporting summaries. |
| GET | `/api/admin/settings` | Admin | Read platform operational settings. |
| PATCH | `/api/admin/settings` | Admin | Update permitted platform operational settings. |
| GET | `/api/admin/audit-logs` | Admin | Search paginated administrative/system audit entries. |

## Scheduled jobs and payment provider callbacks

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET, POST | `/api/cron/expire-offers` | Cron | Expire offers past their response deadline. |
| GET, POST | `/api/cron/expire-payment-holds` | Cron | Expire unpaid booking/payment holds. |
| GET, POST | `/api/cron/retry-matching-requests` | Cron | Retry persisted requests that remain in matching state. |
| GET, POST | `/api/cron/retry-notifications` | Cron | Retry queued/failed notification deliveries. |
| POST | `/api/webhooks/razorpay` | Razorpay | Verify Razorpay webhook signature and reconcile provider events idempotently. |

## Operational notes

- Admin account suspension is intentionally unavailable through the user-management API; administrators can only moderate customer and professional accounts.
- Professional notifications use the same authenticated notification feed and per-user read state as customer notifications. Web Push is optional and requires VAPID configuration.
- Request/offer refresh in the portals is periodic polling, not instantaneous server push.
- Cron routes require a configured secret and must be invoked by an external scheduler in production.
- Provider-backed payment, refund, payout, email, upload, and geocoding behavior still requires valid staging credentials and end-to-end verification.

## Contact inbox and accepted-booking chat

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET | `/api/admin/contact-messages` | Admin | List public contact-form submissions; optional status filter. |
| PATCH | `/api/admin/contact-messages/[messageId]` | Admin | Move a contact submission through new, in-progress, or resolved states. |
| GET | `/api/bookings/[bookingId]/messages` | Booking customer / assigned professional | Read the latest messages for an accepted booking. Exact booking participation is required. |
| POST | `/api/bookings/[bookingId]/messages` | Booking customer / assigned professional | Send a message while the accepted booking is pending payment, confirmed, or in progress. |
