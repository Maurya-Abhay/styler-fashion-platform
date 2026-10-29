# Styler Final Audit Report

## Verified (fresh `npm ci`)
- `npm run typecheck`: clean
- `npm test`: 9/9 pass
- `npm run test:integration` (real MongoDB 8 replica set): 9/9 pass
- `npm run build`: compiled successfully, 107/107 pages generated, middleware built

## Fixes
- Payment unique-active-per-booking index was never created (name conflict with plain bookingId index); now explicitly named.
- Capture webhooks can no longer overwrite refunded / partially_refunded / refund_pending; non-captured entities ignored.
- Payout vs refund race closed with an atomic payment-captured guard.
- Refund retry with the same idempotency key returns the original result.
- Full refund cancels un-transferred payouts; payout retry clears failureReason.
- Admin professional suspend/reactivate enforces valid status transitions.
- Push-subscription endpoints restricted to real browser push hosts (SSRF).
- http(s)-only image URLs; login timing equalised; extra per-IP/per-email rate limits; chat and upload-token limits.
- Origin-check middleware for cookie-authenticated writes; security headers; no-store on API.
- /api/services rewritten as one aggregation; search lengths capped; cron maxDuration set.
- zod 4.6, nodemailer 10.3.

## Not verified / remaining
- Real Razorpay, ZeptoMail, ImageKit, web-push flows (need credentials).
- `npm audit`: nested postcss inside Next (build-time only; fix needs Next 16).
- vercel.json per-minute crons need Vercel Pro or an external scheduler.
- On existing databases run `db.payments.getIndexes()` and confirm `uniq_active_payment_per_booking`; otherwise run `Payment.syncIndexes()` once.
- Review business, refund, privacy and tax policies before launch.
