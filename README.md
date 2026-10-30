# Styler — Full-Stack Service Booking Marketplace (V1)

Styler is a service-booking marketplace: customers request fashion, beauty, wellness, home, and repair services; up to 10 suitable approved professionals receive an offer; and the first valid acceptance wins. For quote-required services, the professional submits a price that must fit the customer's budget before checkout. The customer completes payment before the booking is confirmed. One Next.js application powers the public website, Customer portal, Professional portal, Admin portal, and API backend.

## Included

- Public home, professional discovery/profile, service category pages for fashion, beauty, wellness, home and repairs, Terms and Privacy pages.
- Customer registration/login, email OTP verification, password reset, dashboard, profile, saved addresses, booking requests, booking/payment flows, accepted-booking chat, reviews and notifications.
- Professional onboarding, profile/photo/portfolio uploads, private verification document uploads, service listings, weekly availability, incoming offer dialog, request acceptance, accepted-booking chat, notifications, bookings, earnings and settings.
- Admin dashboard, application review/approval/rejection/correction requests, customer/professional user management, contact inbox, booking-request monitoring/cancellation, bookings, payments/refunds, payouts, commission overrides, platform rules, reports and audit logs.
- Light and dark themes, responsive desktop/mobile layouts, shared UI components, browser Web Push opt-in, ZeptoMail SMTP, Razorpay and ImageKit integration points.
- MongoDB/Mongoose models, API Route Handlers, core business logic, shared TypeScript types and a one-time admin bootstrap script.
- No product shopping, cart, inventory, shipping, or product-vendor marketplace in this release.

## Tech stack

- Next.js App Router + TypeScript + Tailwind CSS utilities
- MongoDB Atlas + Mongoose
- Email/password authentication with 6-digit email OTP (phone is stored uniquely but is not verified or used for login yet)
- ZeptoMail SMTP for transactional email (Nodemailer transport)
- Razorpay Checkout for customer payments
- ImageKit for profile, portfolio, service and private verification uploads
- In-app notifications, queued email delivery and optional browser Web Push (VAPID); an authenticated cron worker sends external notifications asynchronously with bounded concurrency, leases and retry backoff.
- Optional customer GPS/address lookup via a rate-limited server proxy to OpenStreetMap Nominatim; precise customer address details are withheld from professionals until a request is accepted.
- React Native can later use the same API contract. Mobile client code is not included in this web project.

## Requirements

- Node.js 20.9 or later
- MongoDB Atlas or another MongoDB replica set; multi-document transaction flows need replica-set support
- ZeptoMail transactional email credentials and a verified sender
- Razorpay test/live credentials and configured webhook
- ImageKit account and API keys
- VAPID keys if browser push is enabled

## Local setup

1. Extract the ZIP and open the project directory in a terminal.
2. Copy `.env.example` to `.env.local`.
3. Fill in the required environment variables. Never commit `.env.local` or expose server secrets in browser code.
4. Install dependencies and start the app:

   ```bash
   npm install
   npm run typecheck
   npm run dev
   ```

5. Open `http://localhost:3000`. API endpoints are under `/api`; `GET /api/health` checks application/database connectivity.
6. Bootstrap the first admin from a controlled terminal:

   ```bash
   npm run create-admin
   ```

   Set `STYLER_ADMIN_NAME`, `STYLER_ADMIN_EMAIL`, `STYLER_ADMIN_PHONE`, and `STYLER_ADMIN_PASSWORD` in the environment for that one-time command. Remove the one-time password from the environment after setup. Admin is not available from public signup.
7. Run the unit suite with `npm test`. Run the database integration suite (needs a MongoDB **replica set**, because bookings/payments use transactions) with:

   ```bash
   MONGODB_URI="mongodb://127.0.0.1:27017/?replicaSet=rs0" npm run test:integration
   ```

   It uses a throw-away database and covers indexes, webhook idempotency, refund/payout/ledger flows, the payout-vs-refund race guard, public listing and login timing.

## Environment variables

See `.env.example` for the full list. For production, set **both** `APP_URL` and `NEXT_PUBLIC_APP_URL` to your canonical HTTPS origin (for example, `https://styler.com`, without a trailing slash). `NEXT_PUBLIC_APP_URL` is embedded during the Next.js build, so set it in the hosting build environment before running `npm run build`. Local development should use `http://localhost:3000`.

- `MONGODB_URI`: MongoDB connection string.
- `SESSION_SECRET`, `OTP_PEPPER`, `RATE_LIMIT_PEPPER`: different strong random values, 32+ characters.
- `ZEPTOMAIL_SMTP_HOST`, `ZEPTOMAIL_SMTP_PORT`, `ZEPTOMAIL_SMTP_USER`, `ZEPTOMAIL_SMTP_PASSWORD`, `ZEPTOMAIL_FROM_EMAIL`, `ZEPTOMAIL_FROM_NAME`: server-only ZeptoMail SMTP configuration. For port 587, the code requires STARTTLS. `ZEPTOMAIL_CONTACT_TO` is optional and is used by the contact-form mail helper.
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`: server-only payment credentials.
- `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT`: ImageKit upload/signature configuration. Private key remains server-side.
- `WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, `WEB_PUSH_SUBJECT`: optional VAPID/Web Push configuration.
- `CRON_SECRET`: strong secret for scheduler endpoints.
- `STYLER_ADMIN_*`: only needed for the one-time admin bootstrap.

## Main routes

Public: `/`, `/professionals`, `/professionals/[slug]`, `/services/[category]`, `/about`, `/terms`, `/privacy`.

Auth: `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`.

Customer: `/customer/dashboard`, `/customer/profile`, `/customer/addresses`, `/customer/bookings`, `/customer/bookings/new`, `/customer/bookings/[id]`, `/customer/notifications`.

Professional: `/professional/onboarding`, `/professional/onboarding/documents`, `/professional/onboarding/services`, `/professional/onboarding/availability`, `/professional/dashboard`, `/professional/services`, `/professional/availability`, `/professional/requests`, `/professional/notifications`, `/professional/bookings`, `/professional/earnings`, `/professional/settings`.

Admin: `/admin/dashboard`, `/admin/applications`, `/admin/applications/[id]`, `/admin/professionals`, `/admin/users`, `/admin/contact-messages`, `/admin/booking-requests`, `/admin/bookings`, `/admin/payments`, `/admin/payouts`, `/admin/commissions`, `/admin/reports`, `/admin/settings`, `/admin/audit-logs`.

## Core workflow

1. Customer or professional registers with name, unique email, unique phone, password and confirmation. Only email is verified in V1 using a 6-digit OTP. Phone verification and phone-number login are intentionally deferred.
2. Professional completes profile, pins a service location using GPS or the map, adds a portfolio and required verification documents, at least one service, and weekly availability, then submits the application for admin review. Only approved professionals who are accepting requests are eligible for matching.
3. Customer submits a supported service category, details, budget, preferred time window and an address snapshot. If the customer address has GPS coordinates, only professionals with a service pin inside the selected radius are matched; requests without customer coordinates use the entered city/service area. Matching sends up to 10 offers to eligible professionals.
4. A matched professional gets an in-workspace offer alert (and configured email/web-push delivery), with approximate distance and request details. Accepting opens the booking chat; after payment confirms the booking, the professional can explicitly start device-only GPS navigation to the customer's saved pin or open driving directions in Maps. An atomic/transaction-backed accept flow ensures only one professional can win.
5. The booking is confirmed only after server-side Razorpay verification/webhook reconciliation. Service completion, reviews and payout bookkeeping follow the configured policy.
6. Customers pay Styler through Razorpay. After completion, Styler holds the professional's share until the admin verifies their UPI details, then an admin makes the transfer from Styler's business account outside the app and records its UTR/reference. Professionals do not need a Razorpay account for this manual payout flow.
7. Admin controls default and per-professional commission, customer fees, offer/payment timeout policy, approvals and refund/payout workflows. Refunds after an external manual payout require admin reconciliation because Styler cannot reverse that transfer automatically.

The portals refresh active requests/offers periodically; this is near-real-time polling, not an instantaneous push connection. Instant updates require deployment-specific realtime infrastructure and credentials.

## API contract and React Native

Most endpoints return `{ "success": true, "data": ..., "requestId": "..." }`. Errors return a structured `{ "success": false, "error": { "code": "...", "message": "..." } }` response.
See [API.md](./API.md) for the complete Route Handler list, supported methods, purposes, and required roles.

Web uses a secure HTTP-only session cookie. Mobile clients should send `X-Auth-Method: mobile` when logging in, then store the returned session token in the platform's secure storage and send `Authorization: Bearer <sessionToken>` on API calls. Do not save session tokens in normal browser storage.

## Production launch checks — required

This source package is not a substitute for a launch review. Before production:

1. Run `npm ci`, `npm run typecheck`, `npm test`, `npm run test:integration` and `npm run build`. All of these pass on this package (see AUDIT-REPORT.md).
   - **Existing databases:** the `payments` collection should end up with the unique partial index `uniq_active_payment_per_booking`. Check with `db.payments.getIndexes()`; if it is missing, run `Payment.syncIndexes()` once from a maintenance script (it also drops the now-redundant plain `bookingId_1` index).
2. Use sandbox/test credentials and test signup/OTP, session expiry, duplicate email/phone, professional approval, two concurrent offer accepts, slot conflicts, payment failure, duplicate webhooks, refund and cancellation paths.
3. Configure a scheduler that invokes protected offer-expiry, payment-hold, matching-retry, notification-delivery and payout-reconciliation endpoints at the cadence in `vercel.json`. Do not rely on an in-memory timer in a serverless function; the one-minute offer/payment/notification schedule requires a host plan that supports per-minute cron jobs or an authenticated external scheduler.
4. Use HTTPS, secure MongoDB network rules, backup/restore and secret rotation.
5. Test customer payment collection separately from professional payouts. New professional payouts use verified UPI details and require an admin to transfer funds externally and record the UTR; payouts already configured for Razorpay Route remain supported.
6. Confirm ImageKit private-file storage is enabled for verification documents. Admin document review URLs are short-lived. Restrict upload scopes and review file-storage access before accepting real identity documents.
7. Configure email sender/domain records, VAPID keys for Web Push, privacy/retention policy, customer cancellation/refund policy, support contact and applicable tax/legal disclosures.
8. Ensure hosting cron limits support the selected cadence or use an authenticated external scheduler.

Provider credentials and approvals are not included in the ZIP. Those must be configured and provider-backed flows verified before calling the deployment production-ready.

## Changelog (production pass)
- Unified plum design system (light + dark) via CSS tokens in `src/app/globals.css`.
- Single `PortalShell` for Admin / Professional / Customer (sidebar on desktop, scrollable link row on mobile; no hamburger or bottom app bar).
- New public pages: Home, `/services`, About, `/contact` (+ `/api/contact`), 404.
- Build fixes: model typing, Next 15 route handler typing, `@types/nodemailer`.
- Shared service categories across fashion, beauty, wellness, home and repair; quote-required offers; customer radius matching; admin request operations; and focused location/category validation tests.
- Audit fixes: matching reuses preloaded availability and checks professionals in bounded concurrent batches; request dispatch failures preserve the persisted request for matching-worker recovery; payout creation failures no longer turn an already-completed booking into a false HTTP failure.
- Notifications are persisted quickly and delivered by a lease-based queue worker; due retries use backoff and atomic delivery claims to reduce duplicate sends from overlapping cron invocations.
- Added completed-booking payout reconciliation so payout records missed during transient outages can be recreated and eligible account-verification holds can be released.

## Changelog (final hardening pass)
- **Payments:** fixed the `payments` unique-active-payment index, which conflicted with a plain `bookingId` index and was never created; capture webhooks can no longer overwrite `refunded`/`partially_refunded`/`refund_pending`; capture events are ignored unless the payment entity is actually captured; refund retries with the same idempotency key now return the original result; the previously unused payout/refund serialization guard is now enforced; fully refunded bookings cancel their un-transferred payouts.
- **Security:** login timing no longer reveals whether an email exists; per-IP and per-email limits on login, OTP verify/reset, forgot-password and resend; limits on chat and upload-token endpoints; push-subscription endpoints restricted to real browser push services (SSRF); `http(s)`-only image URLs; admin professional suspend/reactivate now enforces valid status transitions (it previously could approve any profile and activate unverified accounts); same-site Origin check middleware for cookie-authenticated writes; security headers, `no-store` on API responses.
- **Scale/robustness:** `/api/services` is one aggregation instead of loading all approved professionals; search inputs are length-capped; cron routes declare `maxDuration`; `failureReason` is now actually cleared on payout retry.
- **Dependencies:** zod 4.6.x, nodemailer 10.3.x.
