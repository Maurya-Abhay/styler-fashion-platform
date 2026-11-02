Styler API Reference
A 10-Minute Fashion Professional Matching and Booking Platform

Styler API is the centralized backend interface powering the Styler web platform and companion Expo mobile application.

It manages authentication, professional discovery, booking requests, matching, payments, customer and professional operations, notifications, and marketplace administration.

<div align="center">

![API](https://img.shields.io/badge/API-REST-blue) ![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript) ![Database](https://img.shields.io/badge/Database-MongoDB-47A248?logo=mongodb)

</div>

📌 API Overview
Property	Details
API Name	Styler REST API
Product	Styler
API Type	RESTful JSON API
Backend Framework	Next.js 15 Route Handlers
Language	TypeScript
Database	MongoDB
Authentication	Session-based authentication
Payment Integration	Razorpay
API Base URL	https://styler-web.vercel.app/api
Frontend URL	https://styler-web.vercel.app
API Documentation	This document
🌐 Live Platform
Web Application: https://styler-web.vercel.app
API Base URL: https://styler-web.vercel.app/api

The web application and API are hosted under the same origin.

📊 API Statistics

The following statistics are based on the supplied implementation inventory.

Metric	Count
Unique API Endpoint Paths	95
Total HTTP Method Operations	120
GET Requests	53
POST Requests	41
PATCH Requests	19
PUT Requests	1
DELETE Requests	6

Counting convention: Each unique route path is counted once. When a route supports multiple HTTP methods, each method is counted as a separate operation. Repeated documentation entries for the reviews and cron endpoints are not counted twice.

📈 HTTP Method Distribution
HTTP Method	Operations	Percentage
GET	53	44.17%
POST	41	34.17%
PATCH	19	15.83%
PUT	1	0.83%
DELETE	6	5.00%
Total	120	100%
📚 Table of Contents
Getting Started
API Conventions
Authentication and Access Control
HTTP Response Format
Health and Public APIs
Authentication APIs
Customer APIs
Professional APIs
Notification and Upload APIs
Administrator APIs
Scheduled Jobs
Payment Webhooks
Booking Communication APIs
Security and Operational Notes
🚀 Getting Started
Base URL

All API requests should use the following base URL:

text
https://styler-web.vercel.app/api

Example API Request

Retrieve the public professional directory:

http
GET https://styler-web.vercel.app/api/professionals


Example using JavaScript:

javascript
const response = await fetch(
  "https://styler-web.vercel.app/api/professionals"
);

const result = await response.json();

if (result.success) {
  console.log(result.data);
}


For authenticated endpoints, provide the appropriate session credentials using the authentication mechanism supported by the client.

📖 API Conventions
HTTP Methods
Method	Usage
GET	Retrieve information or resources.
POST	Create resources or perform actions.
PATCH	Partially update existing resources.
PUT	Replace a resource or configuration.
DELETE	Remove or deactivate resources.
Request and Response Format

The API uses JSON for structured request and response data.

Set the following header when sending JSON request bodies:

http
Content-Type: application/json

Pagination

Paginated list endpoints generally support:

Parameter	Description	Default
page	Page number, starting from 1	1
limit	Number of records per page	Endpoint-dependent, maximum 100

Additional filters depend on the individual endpoint.

Common examples include:

status
category
city
search
professionalId
unreadOnly

Only use parameters supported by the relevant endpoint.

🔐 Authentication and Access Control

Styler uses role-aware authentication and authorization to protect user-specific and administrative operations.

Supported Roles
Role	Description
Public	No authentication required.
Authenticated	Any signed-in user.
Customer	Customer account only.
Professional	Professional account only.
Admin	Administrator account only.
Owner-scoped	Access depends on resource ownership and handler authorization.
Cron	Requires the configured scheduled-job secret.
Razorpay	Requires valid provider signature verification.
Authentication Mechanisms

Web Application

Web authentication uses secure HTTP-only session cookies.

Mobile Application

The Expo mobile application uses its supported session mechanism, with session credentials stored through Expo SecureStore.

Important: Do not store session tokens in ordinary browser storage or expose authentication credentials in client-side logs.

Role-Based Access
Public registration supports customers and professionals.
Administrator accounts cannot be created through public registration.
Customer endpoints are restricted to customer accounts where specified.
Professional endpoints are restricted to professional accounts where specified.
Admin endpoints require administrator authorization.
Owner-scoped endpoints validate access to the associated resource.
Cron endpoints require the configured CRON_SECRET.
📦 HTTP Response Format

Styler API responses follow a consistent JSON envelope.

Successful Response
json
{
  "success": true,
  "data": {},
  "requestId": "request-id"
}

Error Response
json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "A description of the error",
    "details": {}
  },
  "requestId": "request-id"
}

Response Fields
Field	Description
success	Indicates whether the request succeeded.
data	Returned response data on success.
error.code	Application-specific error code.
error.message	Human-readable error description.
error.details	Additional error information, when available.
requestId	Identifier associated with the request.

Refer to individual endpoint responses for their actual data structures and validation requirements.

🌍 Health and Public APIs

These endpoints provide public platform information, professional discovery, service browsing, reviews, and shared functionality.

1. Health and Contact
Method	Endpoint	Access	Description
GET	/health	Public	Check application and database health.
POST	/contact	Public	Submit a contact or support message.

The contact endpoint includes validation and rate limiting.

2. Professional Discovery
Method	Endpoint	Access	Description
GET	/professionals	Public	Search approved professional profiles.
GET	/professionals/[slug]	Public	Retrieve a public professional profile, services, and review information.

Supported discovery filters include category, city, and text search.

3. Service Discovery
Method	Endpoint	Access	Description
GET	/services	Public	List active services offered by approved professionals.
GET	/services/[serviceId]	Public	Retrieve an individual active public service.
4. Reviews
Method	Endpoint	Access	Description
GET	/reviews	Public	List published reviews, optionally filtered by professional.
5. Location Services
Method	Endpoint	Access	Description
POST	/location/reverse-geocode	Customer / Professional	Convert coordinates into a normalized address through the server-side geocoding proxy.
🔑 Authentication APIs

Authentication endpoints manage account registration, login, email verification, password recovery, and user sessions.

Method	Endpoint	Access	Description
POST	/auth/register	Public	Register a customer or professional and begin email verification.
POST	/auth/login	Public	Authenticate an active account and create a web or mobile session.
POST	/auth/logout	Authenticated	Revoke the current session and clear its cookie or token.
GET	/auth/me	Authenticated	Retrieve the current safe user profile and session context.
POST	/auth/refresh	Authenticated	Refresh the current session when permitted by its refresh policy.
POST	/auth/verify-email	Public	Verify an email address using a one-time code.
POST	/auth/resend-otp	Public	Request another email verification code.
POST	/auth/forgot-password	Public	Start password recovery without revealing whether an account exists.
POST	/auth/reset-password	Public	Reset a password using a valid reset code.
Account Management
Method	Endpoint	Access	Description
GET	/account/profile	Customer / Professional	Retrieve safe account information and notification preferences.
PATCH	/account/profile	Customer / Professional	Update permitted account details and notification preferences.
POST	/account/change-password	Customer / Professional	Change the current password after verifying the existing password. Other sessions are revoked.
🛍️ Customer APIs

Customer APIs support service discovery, booking requests, booking management, payments, profile management, saved addresses, favorites, and reviews.

1. Customer Dashboard
Method	Endpoint	Access	Description
GET	/customer/dashboard	Customer	Retrieve customer booking, request, notification, and payment summaries, including a six-month payment trend.
2. Booking Requests
Method	Endpoint	Access	Description
GET	/booking-requests	Customer / Admin	List the customer's requests or all requests for administrators.
POST	/booking-requests	Customer	Validate and create a service request and dispatch matching offers.
GET	/booking-requests/[requestId]	Customer / Professional / Admin	Retrieve a request subject to ownership or offer authorization.
PATCH	/booking-requests/[requestId]	Customer	Cancel an active, unassigned request and close sent offers.

Privacy note: Professional responses to booking requests omit the customer's exact address.

3. Booking Offers
Method	Endpoint	Access	Description
GET	/booking-offers	Professional	List offers addressed to the approved professional.
POST	/booking-offers/[offerId]/accept	Professional	Accept an eligible booking offer and submit a validated quote when required.
POST	/booking-offers/[offerId]/reject	Professional	Reject an offer addressed to the professional.
4. Bookings
Method	Endpoint	Access	Description
GET	/bookings	Customer / Professional / Admin	List bookings according to the signed-in user's role.
GET	/bookings/[bookingId]	Owner-scoped / Admin	Retrieve booking details.
POST	/bookings/[bookingId]/cancel	Customer / Professional / Admin	Cancel an eligible booking according to the platform cancellation and refund policy.
POST	/bookings/[bookingId]/start	Professional	Mark a confirmed professional booking as in progress.
POST	/bookings/[bookingId]/complete	Professional	Complete an in-progress booking and create payout bookkeeping.

Booking lists support optional status filters.

5. Customer Payments
Method	Endpoint	Access	Description
POST	/payments/order	Customer	Create or reuse a payment order for an accepted booking.
POST	/payments/verify	Customer	Verify checkout payment information and reconcile booking/payment state.
GET	/customer/payments	Customer	Retrieve customer payment records and payment summary.

An accepted booking slot remains reserved until payment or cancellation according to the implemented payment workflow.

6. Customer Reviews
Method	Endpoint	Access	Description
POST	/reviews	Customer	Submit a review for an eligible completed booking.

Published reviews are publicly available through GET /reviews.

7. Customer Profile
Method	Endpoint	Access	Description
GET	/customer/profile	Authenticated	Retrieve the signed-in user's safe profile and saved account settings.
PATCH	/customer/profile	Customer / Professional	Update permitted customer or professional account fields.
POST	/customer/change-password	Customer / Professional	Change the current password after verifying the existing password; revoke other active sessions.

The password-change operation is also available through /account/change-password.

8. Saved Addresses
Method	Endpoint	Access	Description
GET	/customer/addresses	Customer	List saved customer addresses.
POST	/customer/addresses	Customer	Add a saved address.
PATCH	/customer/addresses/[addressId]	Customer	Update an address owned by the customer.
DELETE	/customer/addresses/[addressId]	Customer	Delete an address owned by the customer.
9. Favorite Professionals
Method	Endpoint	Access	Description
GET	/customer/favorites	Customer	List saved professionals.
POST	/customer/favorites	Customer	Add a professional to favorites.
DELETE	/customer/favorites/[professionalId]	Customer	Remove a professional from favorites.
✂️ Professional APIs

Professional APIs support onboarding, profile management, services, availability, booking offers, booking operations, location sharing, earnings, and payouts.

1. Professional Dashboard
Method	Endpoint	Access	Description
GET	/professional/dashboard	Professional	Retrieve profile, offers, bookings, payouts, reviews, services, availability, and weekly payout trends.
2. Professional Onboarding
Method	Endpoint	Access	Description
GET	/professional/application	Professional	Retrieve professional application and profile status.
PATCH	/professional/application	Professional	Update onboarding information, service-location pin, and application details.
PATCH	/professional/public-profile	Professional	Update public studio name, description, and profile photo without changing verification data.

Submitting an application requires a location pin for administrator review.

3. Professional Services
Method	Endpoint	Access	Description
GET	/professional/services	Professional	List the professional's services.
POST	/professional/services	Professional	Create a service listing with fixed, starting-from, or quote-required pricing.
PATCH	/professional/services/[serviceId]	Professional	Update a service owned by the professional.
DELETE	/professional/services/[serviceId]	Professional	Deactivate or delete a service owned by the professional.
4. Availability Management
Method	Endpoint	Access	Description
GET	/professional/availability	Professional	Retrieve weekly schedules, exceptions, and request-acceptance settings.
PUT	/professional/availability	Professional	Replace the availability schedule and request-acceptance settings.
PATCH	/professional/accepting-requests	Professional	Enable or disable acceptance of new booking requests.
5. Professional Location
Method	Endpoint	Access	Description
PATCH	/professional/location	Professional	Update service-area location and coordinates.

City, state, and PIN information may be supplied through reverse geocoding or corrected manually.

6. Matching Requests
Method	Endpoint	Access	Description
GET	/professional/requests	Professional	List active matching offers, approximate GPS distance, and request information.

Professional request responses do not expose the customer's exact location pin or street address.

7. Professional Bookings
Method	Endpoint	Access	Description
GET	/professional/bookings	Professional	List bookings assigned to the professional.
GET	/professional/bookings/[bookingId]	Professional / Owner-scoped	Retrieve details of an assigned booking.
PATCH	/professional/bookings/[bookingId]/location	Professional	Share current coordinates for a confirmed or in-progress booking.
DELETE	/professional/bookings/[bookingId]/location	Professional	Stop location sharing and remove stored live-location history for that booking.
POST	/professional/bookings/[bookingId]/updates	Professional	Send a booking or arrival update, optionally including an ETA.
8. Professional Earnings
Method	Endpoint	Access	Description
GET	/professional/earnings	Professional	Retrieve earnings, commissions, and payout summary.
9. Professional Payout Account
Method	Endpoint	Access	Description
GET	/professional/payout-account	Professional	Retrieve UPI payout setup and verification status.
PATCH	/professional/payout-account	Professional	Submit or update account-holder name and UPI ID for administrator review.

Changed payout details require re-verification.

10. Professional Reviews
Method	Endpoint	Access	Description
GET	/professional/reviews	Professional	Retrieve reviews associated with the professional.
🔔 Notification and Upload APIs

These endpoints manage notification feeds, read states, browser push subscriptions, native device tokens, media uploads, and receipts.

1. Notification Feed
Method	Endpoint	Access	Description
GET	/notifications	Authenticated	List notifications for the current user with pagination and optional unread filtering.
PATCH	/notifications/[notificationId]/read	Authenticated / Owner-scoped	Mark an owned notification as read.
PATCH	/notifications/read-all	Authenticated	Mark all unread notifications belonging to the current user as read.
2. Web Push Subscriptions
Method	Endpoint	Access	Description
GET	/notifications/push-subscriptions	Authenticated	Retrieve the configured Web Push public key.
POST	/notifications/push-subscriptions	Authenticated	Save or update the current user's Web Push subscription.
DELETE	/notifications/push-subscriptions	Authenticated	Deactivate the current user's Web Push subscription endpoint.
3. Mobile Device Tokens
Method	Endpoint	Access	Description
POST	/notifications/device-tokens	Customer / Professional	Register an Expo push token for an authenticated physical device.
DELETE	/notifications/device-tokens	Customer / Professional	Deactivate the authenticated user's Expo push token.
4. Media Upload Authorization
Method	Endpoint	Access	Description
POST	/imagekit/auth	Customer / Professional	Generate a constrained ImageKit upload signature for an allowed upload purpose.
5. Payment and Payout Receipts
Method	Endpoint	Access	Description
GET	/receipts/[receiptType]/[recordId]	Customer / Professional	Retrieve an owned captured-payment receipt or completed payout receipt.

Supported receipt types:

payment
payout

HTML is returned by default. Payment receipts can return JSON using:

http
GET /api/receipts/payment/RECORD_ID?format=json


An Accept: application/json header can also request JSON for payment receipts.

🛡️ Administrator APIs

Administrator endpoints provide protected tools for managing users, professional applications, bookings, payments, payouts, commissions, reports, settings, and marketplace activity.

All endpoints in this section require Admin access.

1. Admin Dashboard
Method	Endpoint	Access	Description
GET	/admin/dashboard	Admin	Retrieve platform counts, payment/revenue trends, booking trends, payout exposure, booking statuses, and recent bookings.
2. Professional Application Management
Method	Endpoint	Access	Description
GET	/admin/applications	Admin	List professional applications for review.
GET	/admin/applications/[id]	Admin	Retrieve application details and review materials.
POST	/admin/applications/[id]/approve	Admin	Approve a professional application.
POST	/admin/applications/[id]/reject	Admin	Reject an application with a reason.
POST	/admin/applications/[id]/request-changes	Admin	Request corrections from an applicant.
GET	/admin/applications/[id]/documents/[documentId]	Admin	Authorize access to a private application document.
3. User Management
Method	Endpoint	Access	Description
GET	/admin/users	Admin	Search and list customer and professional accounts by role or status.
PATCH	/admin/users/[userId]/suspend	Admin	Suspend or reactivate a customer or professional account with an audit reason.

Administrator accounts are excluded from the user-management listing and cannot be targeted through this suspension endpoint.

4. Professional Management
Method	Endpoint	Access	Description
GET	/admin/professionals	Admin	List professional profiles and application/account statuses.
GET	/admin/professionals/[id]	Admin	Retrieve professional profile, services, and recent payouts.
POST	/admin/professionals/[id]/suspend	Admin	Suspend or reactivate a professional profile and matching availability.
5. Booking Request Management
Method	Endpoint	Access	Description
GET	/admin/booking-requests	Admin	List and filter marketplace booking requests.
PATCH	/admin/booking-requests/[requestId]	Admin	Cancel an active unassigned request, close offers, and notify the customer.
6. Booking Management
Method	Endpoint	Access	Description
GET	/admin/bookings	Admin	List platform bookings.
7. Payment and Refund Management
Method	Endpoint	Access	Description
GET	/admin/payments	Admin	List and filter platform payment records.
POST	/admin/payments/[paymentId]/refund	Admin	Request an eligible provider refund with an audit trail.
8. Payout Account Management
Method	Endpoint	Access	Description
GET	/admin/payout-accounts	Admin	List professional payout accounts, defaulting to accounts awaiting verification.
PATCH	/admin/payout-accounts/[profileId]/verify	Admin	Verify, reject, or restrict submitted professional payout details.

The default payout account filter is:

text
status=pending


UPI account ownership must be checked outside the application.

9. Payout Management
Method	Endpoint	Access	Description
GET	/admin/payouts	Admin	List payout records.
POST	/admin/payouts/[payoutId]/process	Admin	Prepare a manual UPI payout, cancel an unsent preparation, or record a transaction reference after transfer.

Legacy Razorpay Route payout support remains available.

10. Commission Management
Method	Endpoint	Access	Description
GET	/admin/commissions	Admin	Retrieve commission configuration and overrides.
PATCH	/admin/commissions	Admin	Update platform commission settings and overrides.
11. Reports and Analytics
Method	Endpoint	Access	Description
GET	/admin/reports	Admin	Retrieve booking, payment, and payout reporting summaries.
12. Platform Settings
Method	Endpoint	Access	Description
GET	/admin/settings	Admin	Retrieve platform operational settings.
PATCH	/admin/settings	Admin	Update permitted platform operational settings.
13. Audit Logs
Method	Endpoint	Access	Description
GET	/admin/audit-logs	Admin	Search and retrieve paginated administrative and system audit entries.
14. Contact Message Management
Method	Endpoint	Access	Description
GET	/admin/contact-messages	Admin	List contact-form submissions with optional status filtering.
PATCH	/admin/contact-messages/[messageId]	Admin	Update a contact submission through new, in-progress, or resolved states.
⏱️ Scheduled Jobs

Styler includes scheduled API operations for maintaining booking, matching, payment-hold, notification, and payout workflows.

These routes support both GET and POST for scheduler compatibility.

All scheduled-job requests require:

http
Authorization: Bearer YOUR_CRON_SECRET

Cron Endpoints
Method	Endpoint	Access	Description
GET, POST	/cron/expire-offers	Cron	Expire outstanding offers and requests past their deadlines.
GET, POST	/cron/expire-payment-holds	Cron	Remove legacy payment deadlines while preserving accepted booking slots until payment or cancellation.
GET, POST	/cron/retry-matching-requests	Cron	Retry offer dispatch for requests that remain in matching state.
GET, POST	/cron/retry-notifications	Cron	Retry queued or failed email, browser-push, and native mobile-push deliveries with bounded concurrency.
GET, POST	/cron/reconcile-payouts	Cron	Reconcile missing payouts after completed bookings and release eligible account-verification holds.
Notification Delivery Behaviour

Native push delivery is attempted immediately when a notification is created.

The retry job handles queued or failed deliveries where retry is applicable.

Production Scheduling

An external scheduler must invoke the scheduled-job endpoints with the configured authorization secret.

The checked-in deployment configuration currently schedules five jobs daily at two-minute intervals, beginning at 00:00 UTC.

Verify that the configured cadence meets the operational requirements of the deployed platform.

💳 Payment Webhooks

Styler supports Razorpay webhooks for receiving payment provider events and reconciling payment information.

Method	Endpoint	Access	Description
POST	/webhooks/razorpay	Razorpay	Verify the Razorpay webhook signature and reconcile provider events idempotently.
Webhook Security
Configure the correct Razorpay webhook secret.
Verify provider signatures before processing events.
Use the configured webhook URL in the Razorpay dashboard.
Test payment and refund event handling with provider test credentials.
Verify reconciliation behaviour before production launch.

Webhook processing is designed to handle provider events idempotently.

💬 Booking Communication APIs

These endpoints provide messaging between a customer and the professional assigned to an accepted booking.

Access is restricted to the customer and assigned professional participating in the booking.

Method	Endpoint	Access	Description
GET	/bookings/[bookingId]/messages	Booking customer / Assigned professional	Retrieve the latest messages for an accepted booking.
POST	/bookings/[bookingId]/messages	Booking customer / Assigned professional	Send a booking message while the booking is pending payment, confirmed, or in progress.

New messages queue in-app and native push notifications for the other booking participant.

Communication Restrictions
Only the booking customer and assigned professional can access the conversation.
Exact booking participation is required.
Messaging is limited to supported active booking states.
Notification delivery is handled through the platform notification system.
🔒 Security and Operational Notes

The Styler API includes role-based authorization, ownership checks, protected sessions, and provider integration controls.

The following operational details are important for developers integrating with the API.

1. Account and Role Restrictions
Public registration supports customer and professional accounts only.
Administrator accounts cannot be created through public registration.
Admin account provisioning must be performed through a trusted, access-controlled process.
The user-management API cannot suspend administrator accounts.
2. Customer Location Privacy
Professional matching responses do not expose the customer's exact address.
Professional request responses provide approximate GPS distance.
Exact booking access is controlled by the relevant ownership and authorization checks.
3. Session Security
Web sessions use secure HTTP-only cookies.
Mobile session credentials are stored using Expo SecureStore.
Password changes revoke other active sessions.
Protected endpoints require valid authentication and appropriate authorization.
4. Payment and Payout Security
Razorpay webhook signatures must be verified.
Payment and refund operations require valid provider credentials.
Manual payout account ownership must be verified outside Styler.
Administrative payout operations should follow appropriate verification procedures.
5. Notification Delivery
In-app notifications are available through the authenticated notification feed.
Web Push is optional and requires VAPID configuration.
Native push requires an Expo project and appropriate platform credentials.
Professional and customer notifications use the same notification feed and per-user read state.
6. Matching and Updates
Booking offer dispatch is managed by the server-side matching workflow.
Request and offer refresh in the web and mobile portals uses periodic polling.
The portal refresh mechanism is not instantaneous server push.
7. External Integrations

The following operations require valid provider configuration and end-to-end verification:

Payment processing and refunds.
Payout operations.
Email delivery.
Image uploads.
Reverse geocoding.
Browser and native push notifications.
8. Database Requirements

Booking and payment workflows use database transactions.

Use a MongoDB deployment that supports transactions, such as a replica set or compatible managed cluster.

🧩 API Development Notes

The Styler API is implemented using Next.js Route Handlers.

Useful source locations:

Directory	Responsibility
src/app/api/	API route handlers
src/models/	MongoDB and Mongoose models
src/lib/	Shared server-side business logic
src/app/api/auth/	Authentication endpoints
src/app/api/customer/	Customer endpoints
src/app/api/professional/	Professional endpoints
src/app/api/admin/	Administrator endpoints
src/app/api/cron/	Scheduled operations
src/app/api/webhooks/	External provider webhooks
Keeping This Documentation Updated

This API reference represents the supplied route-handler inventory.

Whenever an API route or HTTP method changes:

Update the corresponding endpoint entry.
Verify the access requirements.
Update the endpoint description.
Recalculate the API statistics.
Review any affected web and mobile integrations.
Update this document when request or response behaviour changes.
🔗 Related Resources
Resource	Link
Styler Web Application	https://styler-web.vercel.app
Styler API Base URL	https://styler-web.vercel.app/api
Main Project Documentation	README.md
Web Environment Example	.env.example
Mobile Application	styler-mobile/

<div align="center">

✨ Styler API

Powering the Styler Marketplace Ecosystem

A shared backend connecting customers, fashion professionals, and administrators through one unified platform.

Web Application · API Base URL

Built with Next.js, TypeScript, and MongoDB.

</div>