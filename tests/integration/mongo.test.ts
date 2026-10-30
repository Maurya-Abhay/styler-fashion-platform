/**
 * Integration tests against a REAL MongoDB replica set (transactions are required).
 *   MONGODB_URI="mongodb://127.0.0.1:27017/?replicaSet=rs0" npm run test:integration
 * Each run uses its own throw-away database and drops it afterwards.
 */
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

const baseUri = process.env.MONGODB_URI;
if (!baseUri) {
  test("integration tests need MONGODB_URI (replica set)", { skip: true }, () => {});
} else {
  const dbName = `styler_it_${Date.now()}`;
  process.env.MONGODB_URI = baseUri.replace(/\/(\?|$)/, `/${dbName}$1`);
  process.env.SESSION_SECRET ??= "s".repeat(40);
  process.env.OTP_PEPPER ??= "o".repeat(40);
  process.env.RATE_LIMIT_PEPPER ??= "r".repeat(40);
  process.env.BCRYPT_ROUNDS = "10";
  process.env.RAZORPAY_KEY_ID = "rzp_test_x";
  process.env.RAZORPAY_KEY_SECRET = "secret_x";
  process.env.RAZORPAY_WEBHOOK_SECRET = "w".repeat(32);

  let mongoose: typeof import("mongoose").default;
  const M: Record<string, any> = {};
  const oid = () => new mongoose.Types.ObjectId();

  before(async () => {
    const { connectDB } = await import("../../src/lib/db");
    mongoose = (await connectDB()) as any;
    for (const name of ["Payment", "Booking", "Payout", "Service", "ProfessionalProfile", "FinancialLedger", "User", "WebhookEvent"]) {
      M[name] = (await import(`../../src/models/${name}`)).default;
    }
    await Promise.all(Object.values(M).map((model: any) => model.init()));
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    const { disconnectDB } = await import("../../src/lib/db");
    await disconnectDB();
  });

  const seedBooking = async (status = "cancelled") => {
    const customerId = oid();
    const [booking] = await M.Booking.create([{
      bookingRequestId: oid(), bookingOfferId: oid(), customerId, professionalId: oid(), serviceId: oid(),
      addressSnapshot: { recipientName: "A B", phone: "+919876543210", line1: "1 Road", city: "Delhi", state: "DL", postalCode: "110001" },
      serviceSnapshot: { title: "Haircut", category: "hair", durationMinutes: 60 },
      priceSnapshot: { servicePricePaise: 10000, customerPlatformFeePaise: 1000, totalPaise: 11000, commissionPercent: 20, commissionPaise: 2000, professionalPayoutPaise: 8000 },
      startAt: new Date(Date.now() + 86_400_000), endAt: new Date(Date.now() + 90_000_000), status,
    }]);
    return booking;
  };
  const seedPayment = (booking: any, extra: Record<string, unknown> = {}) => M.Payment.create({
    bookingId: booking._id, customerId: booking.customerId, amountPaise: 11000, idempotencyKey: `k-${oid()}`,
    razorpayOrderId: `order_${oid()}`, razorpayPaymentId: `pay_${oid()}`, status: "captured", ...extra,
  });

  test("Payment unique-active-per-booking index really exists and is enforced", async () => {
    const indexes = await M.Payment.collection.indexes();
    const idx = indexes.find((i: any) => i.name === "uniq_active_payment_per_booking");
    assert.ok(idx, "named unique partial index must be created");
    assert.equal(idx.unique, true);
    assert.ok(idx.partialFilterExpression);

    const booking = await seedBooking("pending_payment");
    await seedPayment(booking, { status: "created", razorpayOrderId: undefined, razorpayPaymentId: undefined });
    await assert.rejects(
      seedPayment(booking, { status: "created", razorpayOrderId: undefined, razorpayPaymentId: undefined }),
      (e: any) => e.code === 11000,
    );
    // a failed attempt must not block a new one
    const booking2 = await seedBooking("pending_payment");
    await seedPayment(booking2, { status: "failed", razorpayOrderId: undefined, razorpayPaymentId: undefined });
    await seedPayment(booking2, { status: "created", razorpayOrderId: undefined, razorpayPaymentId: undefined });
  });

  test("upgrade path: a legacy plain bookingId_1 index does not block the unique partial index", async () => {
    const col = mongoose.connection.db!.collection("legacy_payments_probe");
    await col.createIndex({ bookingId: 1 });
    await col.createIndex({ bookingId: 1 }, { name: "uniq_active_payment_per_booking", unique: true, partialFilterExpression: { status: { $in: ["created"] } } });
    const names = (await col.indexes()).map((i: any) => i.name);
    assert.ok(names.includes("bookingId_1") && names.includes("uniq_active_payment_per_booking"));
  });

  test("late/duplicate capture webhook never downgrades a refunded payment", async () => {
    const { processRazorpayWebhook } = await import("../../src/lib/razorpay");
    const booking = await seedBooking("cancelled");
    const payment = await seedPayment(booking, { status: "refunded" });
    const body = JSON.stringify({
      event: "payment.captured",
      payload: { payment: { entity: { id: payment.razorpayPaymentId, order_id: payment.razorpayOrderId, amount: 11000, currency: "INR", status: "captured", captured: true, method: "upi" } } },
    });
    const signature = createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!).update(body).digest("hex");
    const result = await processRazorpayWebhook({ rawBody: body, signature, eventId: `evt_${oid()}` });
    assert.equal(result.processed, true);
    const after = await M.Payment.findById(payment._id).lean();
    assert.equal(after.status, "refunded", "refunded must stay refunded");

    // and an invalid signature is rejected
    await assert.rejects(processRazorpayWebhook({ rawBody: body, signature: "0".repeat(64), eventId: "x" }), (e: any) => e.code === "INVALID_WEBHOOK_SIGNATURE");
  });

  test("webhook with a non-captured payment entity does not confirm anything", async () => {
    const { processRazorpayWebhook } = await import("../../src/lib/razorpay");
    const booking = await seedBooking("pending_payment");
    const payment = await seedPayment(booking, { status: "created", razorpayPaymentId: undefined });
    const body = JSON.stringify({ event: "order.paid", payload: { payment: { entity: { id: `pay_${oid()}`, order_id: payment.razorpayOrderId, amount: 11000, currency: "INR", status: "authorized", captured: false } } } });
    const signature = createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!).update(body).digest("hex");
    await processRazorpayWebhook({ rawBody: body, signature, eventId: `evt_${oid()}` });
    assert.equal((await M.Payment.findById(payment._id).lean()).status, "created");
    assert.equal((await M.Booking.findById(booking._id).lean()).status, "pending_payment");
  });

  test("full refund: reverses nothing untransferred, cancels the pending payout, writes a balanced ledger", async () => {
    const { refundBookingPayment } = await import("../../src/lib/payout");
    const booking = await seedBooking("cancelled");
    const payment = await seedPayment(booking);
    await M.Payout.create({ bookingId: booking._id, professionalId: booking.professionalId, provider: "razorpay_route", grossAmountPaise: 10000, commissionPaise: 2000, amountPaise: 8000, status: "pending" });

    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (url: any) => {
      assert.match(String(url), /\/refund$/);
      return new Response(JSON.stringify({ id: "rfnd_test1", entity: "refund", amount: 11000, status: "processed", payment_id: payment.razorpayPaymentId }), { status: 200 });
    }) as typeof fetch;
    try {
      const result = await refundBookingPayment({ bookingId: String(booking._id), reason: "test", requestedBy: String(oid()), idempotencyKey: "it-key-1" });
      assert.equal(result.payment.status, "refunded");
    } finally { globalThis.fetch = realFetch; }

    assert.equal((await M.Payout.findOne({ bookingId: booking._id }).lean()).status, "cancelled");
    const rows = await M.FinancialLedger.find({ bookingId: booking._id }).lean();
    const sum = (side: string) => rows.filter((r: any) => r.entrySide === side).reduce((n: number, r: any) => n + r.amountPaise, 0);
    assert.ok(rows.length >= 2);
    assert.equal(sum("debit"), sum("credit"));
    assert.equal(sum("credit"), 11000);

    // retrying with the same idempotency key must not refund twice
    globalThis.fetch = (async () => { throw new Error("provider must not be called again"); }) as typeof fetch;
    try {
      const again = await refundBookingPayment({ bookingId: String(booking._id), paymentId: String(payment._id), reason: "test", requestedBy: String(oid()), idempotencyKey: "it-key-1" });
      assert.equal(again.refund.status, "processed");
    } finally { globalThis.fetch = realFetch; }
    assert.equal((await M.Payment.findById(payment._id).lean()).refunds.length, 1);
  });

  test("payout is refused when the payment is no longer captured", async () => {
    const { processRazorpayRoutePayout } = await import("../../src/lib/payout");
    const booking = await seedBooking("completed");
    await seedPayment(booking, { status: "refund_pending" });
    const profile = await M.ProfessionalProfile.collection.insertOne({
      _id: booking.professionalId, userId: oid(), applicationStatus: "approved",
      payoutAccount: { provider: "razorpay_route", providerAccountId: "acc_test", status: "verified" },
    });
    assert.ok(profile.acknowledged);
    const payout = await M.Payout.create({ bookingId: booking._id, professionalId: booking.professionalId, provider: "razorpay_route", grossAmountPaise: 10000, commissionPaise: 2000, amountPaise: 8000, status: "pending" });
    await assert.rejects(processRazorpayRoutePayout(String(payout._id)), (e: any) => e.code === "CAPTURED_PAYMENT_REQUIRED");
    assert.equal((await M.Payout.findById(payout._id).lean()).status, "pending");
  });

  test("payout guard: a refund reserved after the first read stops the transfer and releases the claim", async () => {
    const { processRazorpayRoutePayout } = await import("../../src/lib/payout");
    const booking = await seedBooking("completed");
    const payment = await seedPayment(booking, { status: "captured" });
    await M.ProfessionalProfile.collection.insertOne({
      _id: booking.professionalId, userId: oid(), applicationStatus: "approved",
      payoutAccount: { provider: "razorpay_route", providerAccountId: "acc_test2", status: "verified" },
    });
    const payout = await M.Payout.create({ bookingId: booking._id, professionalId: booking.professionalId, provider: "razorpay_route", grossAmountPaise: 10000, commissionPaise: 2000, amountPaise: 8000, status: "pending" });

    const realFetch = globalThis.fetch;
    let transferCalls = 0;
    globalThis.fetch = (async (url: any, init: any) => {
      const u = String(url);
      if (/\/payments\/[^/]+$/.test(u) && (!init || !init.method || init.method === "GET")) {
        // The provider read happens first; simulate a refund reserving the payment right after it.
        await M.Payment.updateOne({ _id: payment._id }, { $set: { status: "refund_pending" } });
        return new Response(JSON.stringify({ id: payment.razorpayPaymentId, entity: "payment", amount: 11000, currency: "INR", status: "captured", captured: true }), { status: 200 });
      }
      transferCalls++;
      return new Response(JSON.stringify({ items: [] }), { status: 200 });
    }) as typeof fetch;
    try {
      await assert.rejects(processRazorpayRoutePayout(String(payout._id)), (e: any) => e.code === "PAYMENT_NOT_CAPTURED");
    } finally { globalThis.fetch = realFetch; }
    assert.equal(transferCalls, 0, "no transfer may be attempted");
    const after = await M.Payout.findById(payout._id).lean();
    assert.equal(after.status, "pending", "claim must be released");
    assert.equal(after.attempts.length, 0);
  });

  test("manual UPI payouts require preparation, record a unique transfer reference, and block automatic refunds", async () => {
    const { prepareManualUpiPayout, recordManualUpiPayout, refundBookingPayment } = await import("../../src/lib/payout");
    const booking = await seedBooking("completed");
    const payment = await seedPayment(booking);
    await M.ProfessionalProfile.create({
      _id: booking.professionalId,
      userId: oid(),
      applicationStatus: "approved",
      payoutAccount: {
        provider: "manual_upi",
        accountHolderName: "Priya Sharma",
        upiId: "priya@okaxis",
        status: "verified",
      },
    });
    const payout = await M.Payout.create({
      bookingId: booking._id,
      professionalId: booking.professionalId,
      provider: "manual_upi",
      payoutRecipient: { provider: "manual_upi", accountHolderName: "Priya Sharma", upiId: "priya@okaxis" },
      grossAmountPaise: 10000,
      commissionPaise: 2000,
      amountPaise: 8000,
      status: "pending",
    });
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (url: any) => {
      assert.match(String(url), /\/payments\/pay_/);
      return new Response(JSON.stringify({
        id: payment.razorpayPaymentId,
        entity: "payment",
        amount: 11000,
        currency: "INR",
        status: "captured",
        captured: true,
      }), { status: 200 });
    }) as typeof fetch;
    try {
      await assert.rejects(recordManualUpiPayout(String(payout._id), String(oid()), "UTR-2025-0001"), (error: any) => error.code === "PAYOUT_NOT_PREPARED");
      await prepareManualUpiPayout(String(payout._id), String(oid()));
    } finally {
      globalThis.fetch = realFetch;
    }

    await assert.rejects(
      refundBookingPayment({
        bookingId: String(booking._id),
        paymentId: String(payment._id),
        reason: "Refund while payout is prepared",
        requestedBy: String(oid()),
        idempotencyKey: "manual-upi-refund-prepared",
      }),
      (error: any) => error.code === "PAYOUT_PROCESSING_REQUIRES_REVIEW",
    );
    assert.equal((await M.Payment.findById(payment._id).lean()).status, "captured");

    const adminId = String(oid());
    const transferred = await recordManualUpiPayout(String(payout._id), adminId, "UTR-2025-0001");
    assert.equal(transferred.status, "transferred");
    assert.equal(transferred.manualTransactionReference, "UTR-2025-0001");
    assert.equal(transferred.manualPaidBy.toString(), adminId);
    const ledger = await M.FinancialLedger.find({ payoutId: payout._id }).lean();
    assert.equal(ledger.length, 2);
    assert.ok(ledger.every((entry: any) => entry.externalReference === "UTR-2025-0001" || entry.externalReference == null));

    await assert.rejects(
      refundBookingPayment({
        bookingId: String(booking._id),
        paymentId: String(payment._id),
        reason: "Customer refund request",
        requestedBy: String(oid()),
        idempotencyKey: "manual-upi-refund",
      }),
      (error: any) => error.code === "MANUAL_PAYOUT_REFUND_REQUIRES_REVIEW",
    );
    assert.equal((await M.Payment.findById(payment._id).lean()).status, "captured");
  });

  test("completed bookings hold manual UPI payouts until admin verification releases them", async () => {
    const { createPayoutForCompletedBooking, releaseVerifiedPayoutHolds } = await import("../../src/lib/payout");
    const booking = await seedBooking("completed");
    const legacyBooking = await seedBooking("completed");
    const missingProviderBooking = await seedBooking("completed");
    const alreadyTransferredBooking = await seedBooking("completed");
    await Promise.all([
      M.Booking.updateOne({ _id: legacyBooking._id }, { $set: { professionalId: booking.professionalId } }),
      M.Booking.updateOne({ _id: missingProviderBooking._id }, { $set: { professionalId: booking.professionalId } }),
      M.Booking.updateOne({ _id: alreadyTransferredBooking._id }, { $set: { professionalId: booking.professionalId } }),
    ]);
    await M.ProfessionalProfile.create({
      _id: booking.professionalId,
      userId: oid(),
      applicationStatus: "approved",
      payoutAccount: {
        provider: "manual_upi",
        accountHolderName: "Asha Verma",
        upiId: "asha@okaxis",
        status: "pending",
      },
    });

    const held = await createPayoutForCompletedBooking(String(booking._id));
    assert.equal(held.provider, "manual_upi");
    assert.equal(held.status, "on_hold");
    const legacyHeld = await M.Payout.create({
      bookingId: legacyBooking._id,
      professionalId: booking.professionalId,
      provider: "razorpay_route",
      providerAccountId: "acc_old_route",
      grossAmountPaise: 10000,
      commissionPaise: 2000,
      amountPaise: 8000,
      status: "on_hold",
    });
    const providerReferencedHold = await M.Payout.create({
      bookingId: alreadyTransferredBooking._id,
      professionalId: booking.professionalId,
      provider: "razorpay_route",
      providerAccountId: "acc_old_route",
      providerTransferId: `tr_${oid()}`,
      grossAmountPaise: 10000,
      commissionPaise: 2000,
      amountPaise: 8000,
      status: "on_hold",
    });
    await M.Payout.collection.insertOne({
      bookingId: missingProviderBooking._id,
      professionalId: booking.professionalId,
      grossAmountPaise: 10000,
      commissionPaise: 2000,
      amountPaise: 8000,
      status: "on_hold",
    });

    await M.ProfessionalProfile.updateOne(
      { _id: booking.professionalId },
      { $set: { "payoutAccount.status": "verified" } },
    );
    assert.equal(await releaseVerifiedPayoutHolds(String(booking.professionalId)), 3);
    const released = await M.Payout.findById(held._id).lean();
    assert.equal(released.status, "pending");
    assert.equal(released.payoutRecipient.upiId, "asha@okaxis");
    assert.equal(released.payoutRecipient.accountHolderName, "Asha Verma");
    const convertedLegacy = await M.Payout.findById(legacyHeld._id).lean();
    assert.equal(convertedLegacy.provider, "manual_upi");
    assert.equal(convertedLegacy.status, "pending");
    assert.equal(convertedLegacy.providerAccountId, undefined);
    const convertedMissingProvider = await M.Payout.findOne({ bookingId: missingProviderBooking._id }).lean();
    assert.equal(convertedMissingProvider.provider, "manual_upi");
    assert.equal(convertedMissingProvider.status, "pending");
    assert.equal((await M.Payout.findById(providerReferencedHold._id).lean()).status, "on_hold");
  });

  test("/api/services lists only approved professionals' services, paginates, and rejects bad ids", async () => {
    const { GET } = await import("../../src/app/api/services/route");
    const approved = oid(), pending = oid();
    await M.ProfessionalProfile.collection.insertMany([
      { _id: approved, userId: oid(), applicationStatus: "approved", slug: "ok-pro", displayName: "OK Pro", city: "Delhi", state: "DL" },
      { _id: pending, userId: oid(), applicationStatus: "pending_review", slug: "pending-pro", displayName: "Pending", city: "Delhi", state: "DL" },
    ]);
    const mk = (professionalId: any, title: string, n: number) => ({ professionalId, title, category: "hair", isActive: true, createdAt: new Date(2026, 0, n), slug: `${title}-${n}` });
    await M.Service.collection.insertMany([mk(approved, "A1", 1), mk(approved, "A2", 2), mk(approved, "A3", 3), mk(pending, "P1", 4), { ...mk(approved, "Off", 5), isActive: false }]);

    const res = await GET(new Request("http://localhost/api/services?limit=2&page=1"));
    const json: any = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.total, 3);
    assert.equal(json.data.items.length, 2);
    assert.equal(json.data.totalPages, 2);
    assert.deepEqual(json.data.items.map((i: any) => i.title), ["A3", "A2"]);
    assert.equal(json.data.items[0].professional.slug, "ok-pro");

    const q: any = await (await GET(new Request("http://localhost/api/services?q=a1"))).json();
    assert.deepEqual(q.data.items.map((i: any) => i.title), ["A1"]);
    const bad = await GET(new Request("http://localhost/api/services?professionalId=not-an-id"));
    assert.equal(bad.status, 400);
    const huge = await GET(new Request(`http://localhost/api/services?q=${"a".repeat(5000)}`));
    assert.equal(huge.status, 200);
  });

  test("login: unknown email costs the same bcrypt work (no user-enumeration timing leak)", async () => {
    const { registerUser, loginUser } = await import("../../src/lib/auth");
    await registerUser({ name: "Tim Ing", email: "timing@example.com", password: "Password123", role: "customer" });
    await M.User.updateOne({ email: "timing@example.com" }, { $set: { accountStatus: "active" } });

    const ok = await loginUser({ email: "timing@example.com", password: "Password123" });
    assert.equal(ok.user.email, "timing@example.com");
    await assert.rejects(loginUser({ email: "timing@example.com", password: "WrongPass123" }), (e: any) => e.code === "INVALID_CREDENTIALS");

    const t0 = performance.now();
    await assert.rejects(loginUser({ email: "nobody@example.com", password: "WrongPass123" }), (e: any) => e.code === "INVALID_CREDENTIALS");
    const unknownMs = performance.now() - t0;
    assert.ok(unknownMs > 15, `unknown-email login finished in ${unknownMs.toFixed(1)}ms - bcrypt was skipped`);
  });
}
