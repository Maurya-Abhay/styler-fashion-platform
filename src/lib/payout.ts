import mongoose from "mongoose";
import { createHash } from "node:crypto";
import Booking from "@/models/Booking";
import Payment from "@/models/Payment";
import Payout from "@/models/Payout";
import ProfessionalProfile from "@/models/ProfessionalProfile";
import FinancialLedger from "@/models/FinancialLedger";
import { AppError } from "@/types";
import { createRouteTransferFromPayment, fetchRazorpayPayment, issueRazorpayRefund, reverseRazorpayRouteTransfer } from "@/lib/razorpay";
import { notifyUser } from "@/lib/notifications";

export async function createPayoutForCompletedBooking(bookingId: string) {
  const booking = await Booking.findOne({ _id: bookingId, status: "completed" }).lean();
  if (!booking) throw new AppError("Only completed bookings can create a professional payout.", 409, "BOOKING_NOT_COMPLETED");
  const existing = await Payout.findOne({ bookingId: booking._id });
  if (existing) return existing;
  const profile = await ProfessionalProfile.findById(booking.professionalId).select("userId payoutAccount").lean();
  if (!profile) throw new AppError("Professional profile not found.", 404, "PROFESSIONAL_NOT_FOUND");
  const amountPaise = Number(booking.priceSnapshot.professionalPayoutPaise);
  const accountProvider = profile.payoutAccount?.provider === "razorpay_route"
    || (!profile.payoutAccount?.upiId && profile.payoutAccount?.providerAccountId)
    ? "razorpay_route"
    : "manual_upi";
  const canPay = profile.payoutAccount?.status === "verified" && (
    accountProvider === "manual_upi"
      ? Boolean(profile.payoutAccount?.upiId && profile.payoutAccount?.accountHolderName)
      : Boolean(profile.payoutAccount?.providerAccountId)
  );
  const payout = await Payout.create({
    bookingId: booking._id,
    professionalId: booking.professionalId,
    provider: accountProvider,
    providerAccountId: accountProvider === "razorpay_route" ? profile.payoutAccount?.providerAccountId : undefined,
    payoutRecipient: canPay ? {
      provider: accountProvider,
      accountHolderName: accountProvider === "manual_upi" ? profile.payoutAccount?.accountHolderName : undefined,
      upiId: accountProvider === "manual_upi" ? profile.payoutAccount?.upiId : undefined,
      providerAccountId: accountProvider === "razorpay_route" ? profile.payoutAccount?.providerAccountId : undefined,
    } : undefined,
    grossAmountPaise: booking.priceSnapshot.servicePricePaise - booking.priceSnapshot.discountPaise,
    commissionPaise: booking.priceSnapshot.commissionPaise,
    amountPaise,
    currency: "INR",
    status: canPay && amountPaise >= (accountProvider === "manual_upi" ? 1 : 100) ? "pending" : "on_hold",
    availableAt: new Date(),
    failureReason: !canPay ? "Professional payout account is not verified." : amountPaise < (accountProvider === "manual_upi" ? 1 : 100) ? "Payout amount is below the provider minimum." : undefined,
  }).catch(async (error: unknown) => {
    if ((error as { code?: number })?.code === 11000) {
      const found = await Payout.findOne({ bookingId: booking._id });
      if (found) return found;
    }
    throw error;
  });
  await notifyUser({
    recipientUserId: String(profile.userId), type: "payout_status", title: "Payout status updated",
    message: payout.status === "pending" ? "Your booking payout is ready for processing." : "Your payout is on hold until the payout account or amount requirement is resolved.",
    channels: ["in_app", "email"], data: { payoutId: String(payout._id), bookingId }, dedupeKey: `payout-created:${String(payout._id)}`,
  }).catch((error) => console.error("Unable to send payout-created notification", error));
  return payout;
}



/**
 * Idempotently backfill missing payouts for completed bookings. This protects
 * against a database/provider outage during the synchronous completion request.
 * It also releases account-verification holds once a professional finishes onboarding.
 */
export async function reconcileCompletedBookingPayouts(limit = 100) {
  const safeLimit = Math.max(1, Math.min(250, Math.floor(limit)));
  // Only select bookings that have no payout record. Including all on-hold payouts
  // in this query would let old, ineligible holds starve later missing payouts.
  const bookings = await Booking.aggregate([
    { $match: { status: "completed", completedAt: { $ne: null } } },
    { $sort: { completedAt: 1 } },
    { $lookup: { from: "payouts", localField: "_id", foreignField: "bookingId", as: "payoutRecords" } },
    { $match: { payoutRecords: { $eq: [] } } },
    { $limit: safeLimit },
    { $project: { _id: 1, professionalId: 1, completedAt: 1 } },
  ]);

  let createdOrReconciled = 0;
  let failed = 0;
  for (const booking of bookings) {
    try {
      await createPayoutForCompletedBooking(String(booking._id));
      createdOrReconciled++;
    } catch (error) {
      failed++;
      console.error("Completed booking payout creation failed", {
        bookingId: String(booking._id),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Separately select only holds that can now be released. Ineligible holds are
  // excluded at the database so they do not starve eligible payouts in later runs.
  const eligibleHolds = await Payout.aggregate([
    { $match: { status: "on_hold", amountPaise: { $gte: 1 } } },
    { $lookup: { from: "professional_profiles", localField: "professionalId", foreignField: "_id", as: "professional" } },
    { $unwind: "$professional" },
    { $match: {
      "professional.payoutAccount.status": "verified",
      $or: [
        {
          provider: "manual_upi",
          "professional.payoutAccount.upiId": { $exists: true, $ne: "" },
          "professional.payoutAccount.accountHolderName": { $exists: true, $ne: "" },
          amountPaise: { $gte: 1 },
        },
        {
          provider: "razorpay_route",
          "professional.payoutAccount.providerAccountId": { $exists: true, $ne: "" },
          amountPaise: { $gte: 100 },
        },
      ],
    } },
    { $sort: { createdAt: 1 } },
    { $limit: safeLimit },
    { $project: {
      _id: 1,
      bookingId: 1,
      professionalId: 1,
      providerAccountId: "$professional.payoutAccount.providerAccountId",
      provider: "$provider",
      payoutAccount: "$professional.payoutAccount",
      professionalUserId: "$professional.userId",
    } },
  ]);
  for (const held of eligibleHolds) {
    try {
      const resumed = await Payout.findOneAndUpdate(
        { _id: held._id, status: "on_hold", amountPaise: { $gte: held.provider === "manual_upi" ? 1 : 100 } },
        {
          $set: {
            status: "pending",
            providerAccountId: held.provider === "razorpay_route" ? held.providerAccountId : undefined,
            payoutRecipient: held.provider === "manual_upi"
              ? {
                  provider: "manual_upi",
                  accountHolderName: held.payoutAccount.accountHolderName,
                  upiId: held.payoutAccount.upiId,
                }
              : { provider: "razorpay_route", providerAccountId: held.providerAccountId },
            availableAt: new Date(),
          },
          $unset: { failureReason: 1 },
        },
        { new: true },
      );
      if (!resumed) continue;
      createdOrReconciled++;
      if (held.professionalUserId) {
        await notifyUser({
          recipientUserId: String(held.professionalUserId),
          type: "payout_status",
          title: "Payout ready for processing",
          message: "Your payout details are verified. Your eligible Styler payout is now ready for processing.",
          channels: ["in_app", "email"],
          data: { payoutId: String(resumed._id), bookingId: String(held.bookingId) },
          dedupeKey: `payout-ready:${String(resumed._id)}`,
        }).catch(() => undefined);
      }
    } catch (error) {
      failed++;
      console.error("Held payout reconciliation failed", {
        payoutId: String(held._id),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return { completedBookingsScanned: bookings.length, eligibleHoldsScanned: eligibleHolds.length, createdOrReconciled, failed };
}

export async function releaseVerifiedPayoutHolds(profileId: string, payoutId?: string) {
  const profile = await ProfessionalProfile.findById(profileId).select("userId payoutAccount").lean();
  if (!profile || profile.payoutAccount?.status !== "verified") return 0;
  const provider = profile.payoutAccount.provider === "razorpay_route"
    || (!profile.payoutAccount.upiId && profile.payoutAccount.providerAccountId)
    ? "razorpay_route"
    : "manual_upi";
  const isManualUpi = provider === "manual_upi"
    && Boolean(profile.payoutAccount.upiId && profile.payoutAccount.accountHolderName);
  const isRoute = provider === "razorpay_route" && Boolean(profile.payoutAccount.providerAccountId);
  if (!isManualUpi && !isRoute) return 0;
  const minAmount = isManualUpi ? 1 : 100;
  const legacyUnsentRoutePayout = isManualUpi
    ? {
        provider: { $in: ["razorpay_route", null] },
        providerTransferId: { $in: [null, ""] },
        manualTransactionReference: { $in: [null, ""] },
      }
    : { provider: "razorpay_route" };
  const heldPayouts = await Payout.find({
    professionalId: profile._id,
    ...(payoutId ? { _id: payoutId } : {}),
    status: "on_hold",
    amountPaise: { $gte: minAmount },
    ...(isManualUpi
      ? {
          $or: [
            {
              provider: "manual_upi",
              providerTransferId: { $in: [null, ""] },
              manualTransactionReference: { $in: [null, ""] },
            },
            legacyUnsentRoutePayout,
          ],
        }
      : { provider }),
  }).select("_id bookingId").limit(250).lean();
  let released = 0;
  for (const held of heldPayouts) {
    const switchingLegacyRoute = isManualUpi && held.provider !== "manual_upi";
    const updated = await Payout.findOneAndUpdate(
      {
        _id: held._id,
        status: "on_hold",
        provider: held.provider === "manual_upi"
          ? "manual_upi"
          : { $in: ["razorpay_route", null] },
        amountPaise: { $gte: minAmount },
        ...(isManualUpi
          ? {
              providerTransferId: { $in: [null, ""] },
              manualTransactionReference: { $in: [null, ""] },
            }
          : {}),
      },
      {
        $set: {
          status: "pending",
          availableAt: new Date(),
          ...(isManualUpi ? { provider: "manual_upi" } : {}),
          payoutRecipient: isManualUpi
            ? {
                provider: "manual_upi",
                accountHolderName: profile.payoutAccount.accountHolderName,
                upiId: profile.payoutAccount.upiId,
              }
            : {
                provider: "razorpay_route",
                providerAccountId: profile.payoutAccount.providerAccountId,
              },
          ...(isRoute ? { providerAccountId: profile.payoutAccount.providerAccountId } : {}),
        },
        $unset: {
          failureReason: 1,
          ...(switchingLegacyRoute ? { providerAccountId: 1 } : {}),
        },
      },
      { new: true },
    );
    if (!updated) continue;
    released++;
    await notifyUser({
      recipientUserId: String(profile.userId),
      type: "payout_status",
      title: "Payout ready for processing",
      message: "Your payout details are verified. Your eligible Styler payout is now ready for processing.",
      channels: ["in_app", "email"],
      data: { payoutId: String(updated._id), bookingId: String(held.bookingId) },
      dedupeKey: `payout-ready:${String(updated._id)}`,
    }).catch((error) => console.error("Unable to send payout-ready notification", error));
  }
  return released;
}

export async function prepareManualUpiPayout(payoutId: string, adminUserId: string) {
  let payout = await Payout.findById(payoutId);
  if (!payout) throw new AppError("Payout not found.", 404, "PAYOUT_NOT_FOUND");
  if (
    payout.status === "on_hold" &&
    (payout.provider === "razorpay_route" || !payout.provider) &&
    !payout.providerTransferId &&
    !payout.manualTransactionReference
  ) {
    const profile = await ProfessionalProfile.findById(payout.professionalId)
      .select("payoutAccount")
      .lean();
    if (
      profile?.payoutAccount?.provider === "manual_upi" &&
      profile.payoutAccount.status === "verified" &&
      profile.payoutAccount.upiId &&
      profile.payoutAccount.accountHolderName
    ) {
      await releaseVerifiedPayoutHolds(String(payout.professionalId), payoutId);
      payout = await Payout.findById(payoutId);
      if (!payout) throw new AppError("Payout not found.", 404, "PAYOUT_NOT_FOUND");
    }
  }
  if (payout.provider !== "manual_upi") throw new AppError("This payout is not configured for manual UPI.", 409, "PAYOUT_PROVIDER_MISMATCH");
  if (payout.providerTransferId || payout.manualTransactionReference) {
    throw new AppError("This payout already has a transfer reference and cannot be prepared again.", 409, "PAYOUT_ALREADY_TRANSFERRED");
  }
  if (payout.status === "processing" && payout.manualPreparedAt) return payout;
  if (!["pending", "on_hold", "failed"].includes(payout.status)) {
    throw new AppError("Payout is not ready to be prepared.", 409, "PAYOUT_NOT_READY");
  }
  if (payout.amountPaise < 1) throw new AppError("Payout amount must be greater than zero.", 409, "INVALID_PAYOUT_AMOUNT");
  const booking = await Booking.findOne({ _id: payout.bookingId, status: "completed" }).lean();
  if (!booking) throw new AppError("Only completed bookings can be paid out.", 409, "BOOKING_NOT_COMPLETED");
  const profile = await ProfessionalProfile.findById(payout.professionalId).select("userId payoutAccount").lean();
  if (
    !profile ||
    profile.payoutAccount?.provider !== "manual_upi" ||
    profile.payoutAccount.status !== "verified" ||
    !profile.payoutAccount.upiId ||
    !profile.payoutAccount.accountHolderName
  ) {
    throw new AppError("The professional's UPI payee details are not verified.", 409, "PAYOUT_ACCOUNT_NOT_READY");
  }
  const payment = await Payment.findOne({ bookingId: payout.bookingId, status: "captured" }).lean();
  if (!payment?.razorpayPaymentId) {
    throw new AppError("A captured customer payment is required before preparing this payout.", 409, "CAPTURED_PAYMENT_REQUIRED");
  }
  const providerPayment = await fetchRazorpayPayment(payment.razorpayPaymentId);
  if (providerPayment.status !== "captured" && providerPayment.captured !== true) {
    throw new AppError("Razorpay has not confirmed that the customer payment is captured.", 409, "PAYMENT_NOT_CAPTURED");
  }

  const nextAttempt = payout.attempts.length + 1;
  const claimed = await Payout.findOneAndUpdate(
    { _id: payout._id, provider: "manual_upi", status: { $in: ["pending", "on_hold", "failed"] } },
    {
      $set: {
        status: "processing",
        payoutRecipient: {
          provider: "manual_upi",
          accountHolderName: profile.payoutAccount.accountHolderName,
          upiId: profile.payoutAccount.upiId,
        },
        manualPreparedBy: adminUserId,
        manualPreparedAt: new Date(),
      },
      $unset: { failureReason: 1 },
      $push: { attempts: { attemptNumber: nextAttempt, attemptedAt: new Date(), status: "processing" } },
    },
    { new: true },
  );
  if (!claimed) throw new AppError("Payout was claimed by another administrator.", 409, "PAYOUT_ALREADY_CLAIMED");

  const paymentGuard = await Payment.findOneAndUpdate(
    { _id: payment._id, status: "captured" },
    { $inc: { payoutProcessingVersion: 1 } },
    { new: true },
  );
  if (!paymentGuard) {
    await Payout.updateOne(
      { _id: payout._id, status: "processing", manualPreparedBy: adminUserId },
      {
        $set: { status: payout.status },
        $unset: { manualPreparedBy: 1, manualPreparedAt: 1, payoutRecipient: 1 },
        $pull: { attempts: { attemptNumber: nextAttempt } },
      },
    );
    throw new AppError("The customer payment is being refunded or is no longer captured; do not send this payout.", 409, "PAYMENT_NOT_CAPTURED");
  }
  return claimed;
}

export async function cancelManualUpiPayoutPreparation(payoutId: string) {
  const payout = await Payout.findOne({
    _id: payoutId,
    provider: "manual_upi",
    status: "processing",
    manualPreparedAt: { $ne: null },
    manualTransactionReference: { $in: [null, ""] },
  });
  if (!payout) throw new AppError("No cancellable manual UPI payout preparation was found.", 409, "PAYOUT_NOT_PREPARED");
  const payment = await Payment.findOne({ bookingId: payout.bookingId }).lean();
  const pendingProviderRefund = payment?.refunds?.some(
    (refund: any) => refund.status === "pending" && Boolean(refund.razorpayRefundId),
  );
  if (pendingProviderRefund) {
    throw new AppError("A customer refund is already with Razorpay; payout preparation cannot be cancelled yet.", 409, "REFUND_PROCESSING");
  }
  const lastAttempt = payout.attempts[payout.attempts.length - 1];
  const cancelled = await Payout.findOneAndUpdate(
    {
      _id: payout._id,
      status: "processing",
      manualPreparedAt: payout.manualPreparedAt,
      manualTransactionReference: { $in: [null, ""] },
    },
    {
      $set: { status: "pending" },
      $unset: { manualPreparedAt: 1, manualPreparedBy: 1, failureReason: 1 },
      $pull: { attempts: { attemptNumber: lastAttempt?.attemptNumber } },
    },
    { new: true },
  );
  if (!cancelled) throw new AppError("Payout preparation changed; refresh and try again.", 409, "PAYOUT_STATE_CHANGED");
  return cancelled;
}

export async function recordManualUpiPayout(payoutId: string, adminUserId: string, transactionReference: string) {
  const normalizedReference = transactionReference.trim();
  if (normalizedReference.length < 3 || normalizedReference.length > 200) {
    throw new AppError("Enter a transaction reference between 3 and 200 characters.", 400, "INVALID_PAYOUT_REFERENCE");
  }
  const payout = await Payout.findById(payoutId);
  if (!payout) throw new AppError("Payout not found.", 404, "PAYOUT_NOT_FOUND");
  if (payout.status === "transferred" && payout.manualTransactionReference === normalizedReference) {
    const payment = await Payment.findOne({ bookingId: payout.bookingId }).select("_id").lean();
    if (payment) await writePayoutLedger(payout, payment._id);
    return payout;
  }
  if (
    payout.provider !== "manual_upi" ||
    payout.status !== "processing" ||
    !payout.manualPreparedAt ||
    !payout.payoutRecipient?.upiId
  ) {
    throw new AppError("Prepare this payout before recording an external UPI transfer.", 409, "PAYOUT_NOT_PREPARED");
  }
  const payment = await Payment.findOne({ bookingId: payout.bookingId });
  if (!payment) throw new AppError("Payment record not found for this payout.", 404, "PAYMENT_NOT_FOUND");
  const duplicateReference = await Payout.exists({
    manualTransactionReference: normalizedReference,
    _id: { $ne: payout._id },
  });
  if (duplicateReference) {
    throw new AppError("This UPI transaction reference is already recorded for another payout.", 409, "DUPLICATE_PAYOUT_REFERENCE");
  }

  let updated;
  try {
    updated = await Payout.findOneAndUpdate(
      { _id: payout._id, provider: "manual_upi", status: "processing", manualPreparedAt: payout.manualPreparedAt },
      {
        $set: {
          status: "transferred",
          manualTransactionReference: normalizedReference,
          manualPaidBy: adminUserId,
          manualPaidAt: new Date(),
          transferredAt: new Date(),
          "attempts.$[attempt].transactionReference": normalizedReference,
          "attempts.$[attempt].status": "transferred",
        },
        $unset: { failureReason: 1 },
      },
      {
        new: true,
        arrayFilters: [{ "attempt.attemptNumber": payout.attempts[payout.attempts.length - 1]?.attemptNumber }],
      },
    );
  } catch (error) {
    if ((error as { code?: number })?.code === 11000) {
      throw new AppError("This UPI transaction reference is already recorded for another payout.", 409, "DUPLICATE_PAYOUT_REFERENCE");
    }
    throw error;
  }
  if (!updated) throw new AppError("Payout state changed; refresh before recording the transfer.", 409, "PAYOUT_STATE_CHANGED");
  await writePayoutLedger(updated, payment._id);
  const profile = await ProfessionalProfile.findById(payout.professionalId).select("userId").lean();
  if (profile) {
    await notifyUser({
      recipientUserId: String(profile.userId),
      type: "payout_status",
      title: "Payout marked as transferred",
      message: "Styler has recorded your UPI payout. Check your bank or UPI app for the transfer; your payout receipt is available in Earnings.",
      channels: ["in_app", "email"],
      data: {
        payoutId: String(updated._id),
        bookingId: String(updated.bookingId),
        receiptPath: `/api/receipts/payout/${String(updated._id)}`,
      },
      dedupeKey: `payout-transferred:${String(updated._id)}`,
    }).catch((error) => console.error("Unable to send manual payout notification", error));
  } else {
    console.error("Manual payout was recorded but its professional profile could not be found", { payoutId: String(updated._id) });
  }
  return updated;
}

export async function processRazorpayRoutePayout(payoutId: string, options: { onHoldUntil?: Date } = {}) {
  const payout = await Payout.findById(payoutId);
  if (!payout) throw new AppError("Payout not found.", 404, "PAYOUT_NOT_FOUND");
  if (payout.status === "transferred") return payout;
  if (!["pending", "on_hold", "failed"].includes(payout.status)) throw new AppError("Payout is already being processed or is not payable.", 409, "PAYOUT_NOT_READY");
  if (payout.provider !== "razorpay_route") throw new AppError("This payout must be processed as a manual UPI payout.", 409, "PAYOUT_PROVIDER_MISMATCH");
  if (payout.amountPaise < 100) throw new AppError("Payout below ₹1.00 needs manual handling.", 409, "PAYOUT_BELOW_PROVIDER_MINIMUM");
  const profile = await ProfessionalProfile.findById(payout.professionalId).select("userId payoutAccount").lean();
  if (!profile || profile.payoutAccount?.status !== "verified" || !profile.payoutAccount.providerAccountId) {
    throw new AppError("Professional's Razorpay Route linked account is not verified.", 409, "PAYOUT_ACCOUNT_NOT_READY");
  }
  const payment = await Payment.findOne({ bookingId: payout.bookingId, status: "captured" }).lean();
  if (!payment?.razorpayPaymentId) throw new AppError("A captured Razorpay payment is required before transferring funds.", 409, "CAPTURED_PAYMENT_REQUIRED");
  const providerPayment = await fetchRazorpayPayment(payment.razorpayPaymentId);
  if (providerPayment.status !== "captured" && providerPayment.captured !== true) {
    throw new AppError("Razorpay has not confirmed that the customer payment is captured.", 409, "PAYMENT_NOT_CAPTURED");
  }

  const nextAttempt = payout.attempts.length + 1;
  const claimed = await Payout.findOneAndUpdate(
    { _id: payout._id, status: { $in: ["pending", "on_hold", "failed"] } },
    { $set: { status: "processing", providerAccountId: profile.payoutAccount.providerAccountId }, $unset: { failureReason: 1 }, $push: { attempts: { attemptNumber: nextAttempt, attemptedAt: new Date(), status: "processing" } } },
    { new: true },
  );
  if (!claimed) throw new AppError("Payout was claimed by another worker.", 409, "PAYOUT_ALREADY_CLAIMED");

  // Serialize with refunds: the payment must STILL be "captured" at the moment money is about to
  // move. A refund reserved after the earlier read would otherwise let both the customer refund
  // and the professional transfer go through. Once this guard succeeds, a later refund request
  // sees the payout in "processing" and stops for review instead of double-spending.
  const guard = await Payment.findOneAndUpdate(
    { _id: payment._id, status: "captured" },
    { $inc: { payoutProcessingVersion: 1 } },
    { new: true },
  );
  if (!guard) {
    await Payout.updateOne(
      { _id: payout._id, status: "processing" },
      { $set: { status: payout.status }, $pull: { attempts: { attemptNumber: nextAttempt } } },
    );
    throw new AppError("The payment is being refunded or is no longer captured; the payout was not sent.", 409, "PAYMENT_NOT_CAPTURED");
  }

  try {
    const transfer = await createRouteTransferFromPayment({
      paymentId: payment.razorpayPaymentId,
      linkedAccountId: profile.payoutAccount.providerAccountId,
      amountPaise: payout.amountPaise,
      payoutId: String(payout._id),
      onHold: Boolean(options.onHoldUntil),
      onHoldUntil: options.onHoldUntil,
      notes: { styler_booking_id: String(payout.bookingId) },
    });
    const state = transfer.transfer_status;
    const mapped = state === "processed" ? "transferred" : state === "failed" ? "failed" : state === "reversed" || state === "partially_reversed" ? "reversed" : "processing";
    const updated = await Payout.findById(payout._id);
    if (!updated) throw new Error("Payout disappeared after provider transfer.");
    updated.providerTransferId = transfer.id;
    updated.status = mapped;
    updated.transferredAt = mapped === "transferred" ? new Date() : updated.transferredAt;
    updated.failureReason = mapped === "failed" ? "Razorpay reported transfer failure." : undefined;
    const lastAttempt = updated.attempts[updated.attempts.length - 1];
    if (lastAttempt) {
      lastAttempt.providerTransferId = transfer.id;
      lastAttempt.status = mapped === "transferred" ? "transferred" : mapped === "reversed" ? "reversed" : mapped === "failed" ? "failed" : "processing";
      lastAttempt.failureReason = updated.failureReason;
    }
    await updated.save();

    if (mapped === "transferred") {
      await writePayoutLedger(updated, payment._id);
      await notifyUser({ recipientUserId: String(profile.userId), type: "payout_status", title: "Payout transferred", message: "Razorpay has processed the transfer for your completed booking. Settlement timing depends on the provider; your payout receipt is available in Earnings.", channels: ["in_app", "email"], data: { payoutId: String(updated._id), bookingId: String(updated.bookingId), receiptPath: `/api/receipts/payout/${String(updated._id)}` }, dedupeKey: `payout-transferred:${String(updated._id)}` });
    } else if (mapped === "reversed") {
      await writePayoutReversalLedger(updated, payment._id);
    }
    return updated;
  } catch (error) {
    await Payout.updateOne(
      { _id: payout._id, status: "processing" },
      {
        $set: {
          status: "failed",
          failureReason: (error instanceof Error ? error.message : "Provider transfer failed").slice(0, 1000),
          "attempts.$[attempt].status": "failed",
          "attempts.$[attempt].failureReason": (error instanceof Error ? error.message : "Provider transfer failed").slice(0, 1000),
        },
      },
      { arrayFilters: [{ "attempt.attemptNumber": nextAttempt }] },
    ).catch(async () => {
      await Payout.updateOne({ _id: payout._id, status: "processing" }, { $set: { status: "failed", failureReason: (error instanceof Error ? error.message : "Provider transfer failed").slice(0, 1000) } });
    });
    throw error;
  }
}

async function writePayoutLedger(payout: any, paymentId: unknown) {
  const amount = Number(payout.amountPaise);
  if (amount <= 0) return;
  const group = `payout:${String(payout._id)}`;
  const existing = await FinancialLedger.findOne({ transactionGroupId: group }).lean();
  if (existing) return;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await FinancialLedger.create([
        { transactionGroupId: group, accountCode: "professional_payable", entrySide: "debit", entryType: "professional_payout", amountPaise: amount, bookingId: payout.bookingId, paymentId, payoutId: payout._id, idempotencyKey: `${group}:payable-debit`, description: "Professional payout paid from payable balance." },
        { transactionGroupId: group, accountCode: "cash_clearing", entrySide: "credit", entryType: "professional_payout", amountPaise: amount, bookingId: payout.bookingId, paymentId, payoutId: payout._id, externalReference: payout.manualTransactionReference || payout.providerTransferId, idempotencyKey: `${group}:cash-credit`, description: payout.provider === "manual_upi" ? "Funds transferred to professional via manually recorded UPI payment." : "Funds transferred to professional via Razorpay Route." },
      ], { session, ordered: true });
    });
  } finally { await session.endSession(); }
}

export async function refundBookingPayment(input: {
  bookingId: string; paymentId?: string; amountPaise?: number; reason: string; requestedBy: string; idempotencyKey: string;
}) {
  const booking = await Booking.findById(input.bookingId).lean();
  if (!booking) throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");
  const initialPayout = await Payout.findOne({ bookingId: booking._id });
  if (initialPayout?.provider === "manual_upi" && initialPayout.status === "transferred") {
    throw new AppError(
      "This professional was already paid outside Styler. An administrator must reconcile recovery of that payout before a customer refund can be issued.",
      409,
      "MANUAL_PAYOUT_REFUND_REQUIRES_REVIEW",
    );
  }
  if (initialPayout?.status === "processing") {
    throw new AppError(
      "A professional payout is being prepared or processed. Retry the refund after its payout status is reconciled.",
      409,
      "PAYOUT_PROCESSING_REQUIRES_REVIEW",
    );
  }
  const REFUNDABLE_STATUSES = ["captured", "partially_refunded", "refund_pending"];
  // "refunded" is included in the lookup so that a retry with the SAME idempotency key (lost response,
  // double click) gets the original result instead of a confusing "not refundable" error.
  let payment: any = input.paymentId
    ? await Payment.findOne({ _id: input.paymentId, bookingId: booking._id })
    : await Payment.findOne({ bookingId: booking._id, razorpayPaymentId: { $exists: true, $ne: null }, status: { $in: [...REFUNDABLE_STATUSES, "refunded"] } }).sort({ createdAt: -1 });

  // Scope caller keys to this payment before persisting or sending them to the provider.
  // This prevents the same client key on two different payments from colliding globally.
  const callerKey = input.idempotencyKey.trim();
  if (!callerKey || callerKey.length > 200) throw new AppError("A valid refund idempotency key is required.", 400, "INVALID_IDEMPOTENCY_KEY");
  const idempotencyKey = payment ? `refund:${String(payment._id)}:${createHash("sha256").update(callerKey).digest("hex")}` : "";
  const isRetryOfKnownRefund = Boolean(payment?.refunds?.some((item: any) => item.idempotencyKey === idempotencyKey));
  if (!payment || !payment.razorpayPaymentId || (!isRetryOfKnownRefund && !REFUNDABLE_STATUSES.includes(payment.status))) {
    throw new AppError("A captured payment is required before a refund.", 409, "PAYMENT_NOT_REFUNDABLE");
  }
  let refundRecord: any = payment.refunds.find((item: any) => item.idempotencyKey === idempotencyKey);
  if (refundRecord?.status === "processed") return { payment, refund: refundRecord };

  if (!refundRecord) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const current = await Payment.findOne({ _id: payment._id, bookingId: booking._id }).session(session);
        if (!current || !current.razorpayPaymentId || !["captured", "partially_refunded", "refund_pending"].includes(current.status)) {
          throw new AppError("The payment is no longer refundable.", 409, "PAYMENT_NOT_REFUNDABLE");
        }
        const duplicate = current.refunds.find((item: any) => item.idempotencyKey === idempotencyKey);
        if (duplicate) {
          payment = current;
          refundRecord = duplicate;
          return;
        }
        const reservedRefunds = current.refunds
          .filter((item: any) => ["pending", "processed"].includes(item.status))
          .reduce((sum: number, item: any) => sum + Number(item.amountPaise), 0);
        const remaining = Number(current.amountPaise) - reservedRefunds;
        const amountPaise = input.amountPaise ?? remaining;
        if (!Number.isSafeInteger(amountPaise) || amountPaise < 1 || amountPaise > remaining) {
          throw new AppError("Refund amount exceeds the remaining refundable amount.", 409, "INVALID_REFUND_AMOUNT");
        }
        if (initialPayout?.status === "transferred" && (amountPaise !== Number(current.amountPaise) || reservedRefunds > 0)) {
          throw new AppError("Partial refunds after a professional payout need manual reconciliation in V1.", 409, "PARTIAL_REFUND_AFTER_PAYOUT_REQUIRES_REVIEW");
        }
        current.refunds.push({
          idempotencyKey,
          amountPaise,
          reason: input.reason.slice(0, 1000),
          status: "pending",
          requestedBy: input.requestedBy,
          createdAt: new Date(),
        });
        current.status = "refund_pending";
        await current.save({ session });
        payment = current;
        refundRecord = current.refunds.find((item: any) => item.idempotencyKey === idempotencyKey);
      });
    } finally {
      await session.endSession();
    }
    // Re-read after the transaction to avoid working with stale refund arrays.
    payment = await Payment.findById(payment._id);
    refundRecord = payment?.refunds.find((item: any) => item.idempotencyKey === idempotencyKey);
  }
  if (!payment || !refundRecord) throw new AppError("Refund request could not be reserved.", 500, "REFUND_RESERVATION_FAILED");
  if (refundRecord.status === "processed") return { payment, refund: refundRecord };

  // When a payout has already transferred, reverse it before issuing the customer's
  // full refund. Claim the payout row first so two refund requests cannot both reverse it.
  let payout = await Payout.findOne({ bookingId: booking._id });
  if (payout?.status === "transferred") {
    const otherRefunds = payment.refunds
      .filter((item: any) => item.idempotencyKey !== idempotencyKey && ["pending", "processed"].includes(item.status))
      .reduce((sum: number, item: any) => sum + Number(item.amountPaise), 0);
    if (Number(refundRecord.amountPaise) !== Number(payment.amountPaise) || otherRefunds > 0) {
      throw new AppError("Partial refunds after a professional payout need manual reconciliation in V1.", 409, "PARTIAL_REFUND_AFTER_PAYOUT_REQUIRES_REVIEW");
    }
    if (!payout.providerTransferId) throw new AppError("The payout transfer ID is missing; manual reconciliation is required.", 409, "PAYOUT_TRANSFER_ID_MISSING");
    const claimedPayout = await Payout.findOneAndUpdate(
      { _id: payout._id, status: "transferred" },
      { $set: { status: "processing" } },
      { new: true },
    );
    if (claimedPayout) {
      try {
        await reverseRazorpayRouteTransfer({
          transferId: claimedPayout.providerTransferId,
          idempotencyKey: `${idempotencyKey}:reverse`,
          notes: { styler_booking_id: String(booking._id), reason: "Full customer refund" },
        });
        claimedPayout.status = "reversed";
        claimedPayout.attempts.push({ attemptNumber: claimedPayout.attempts.length + 1, attemptedAt: new Date(), providerTransferId: claimedPayout.providerTransferId, status: "reversed" });
        await claimedPayout.save();
        await writePayoutReversalLedger(claimedPayout, payment._id);
        payout = claimedPayout;
      } catch (error) {
        // Don't release the processing claim after an uncertain provider outcome;
        // retrying blindly could reverse the same transfer twice. Admin reconciliation is required.
        console.error("Razorpay payout reversal requires reconciliation", {
          payoutId: String(claimedPayout._id),
          error: error instanceof Error ? error.message : "Unknown error",
        });
        throw new AppError("The payout reversal outcome needs reconciliation before this refund can continue.", 409, "PAYOUT_REVERSAL_REQUIRES_REVIEW");
      }
    } else {
      const latestPayout = await Payout.findById(payout._id).lean();
      if (latestPayout?.status !== "reversed") {
        throw new AppError("Payout reversal is already being processed. Retry after its status is reconciled.", 409, "PAYOUT_REVERSAL_IN_PROGRESS");
      }
      payout = latestPayout;
    }
  } else if (payout?.status === "processing") {
    throw new AppError("Payout is currently processing; refund needs reconciliation before continuing.", 409, "PAYOUT_PROCESSING_REQUIRES_REVIEW");
  }

  try {
    const providerRefund = await issueRazorpayRefund({
      paymentId: payment.razorpayPaymentId,
      amountPaise: Number(refundRecord.amountPaise),
      reason: input.reason,
      idempotencyKey,
      notes: { styler_booking_id: String(booking._id), styler_refund_key: idempotencyKey },
    });
    const mappedStatus = providerRefund.status === "processed" ? "processed" : providerRefund.status === "failed" ? "failed" : "pending";
    const set: Record<string, unknown> = {
      "refunds.$[refund].razorpayRefundId": providerRefund.id,
      "refunds.$[refund].status": mappedStatus,
    };
    const unset: Record<string, 1> = {};
    if (mappedStatus === "processed") set["refunds.$[refund].processedAt"] = new Date();
    if (mappedStatus === "failed") set["refunds.$[refund].failureReason"] = "Razorpay marked this refund as failed.";
    else unset["refunds.$[refund].failureReason"] = 1;
    await Payment.updateOne(
      { _id: payment._id, "refunds.idempotencyKey": idempotencyKey },
      { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
      { arrayFilters: [{ "refund.idempotencyKey": idempotencyKey }] },
    );

    // Update only the summary status after atomically changing the individual refund,
    // so concurrent refund requests don't overwrite one another's embedded records.
    const refreshed = await Payment.findById(payment._id);
    if (!refreshed) throw new AppError("Payment disappeared while reconciling the refund.", 500, "PAYMENT_RECONCILIATION_FAILED");
    const stored = refreshed.refunds.find((item: any) => item.idempotencyKey === idempotencyKey);
    const totalRefundedOrPending = refreshed.refunds.reduce((sum: number, item: any) => sum + (["pending", "processed"].includes(item.status) ? Number(item.amountPaise) : 0), 0);
    const summaryStatus = refreshed.refunds.some((item: any) => item.status === "pending")
      ? "refund_pending"
      : totalRefundedOrPending >= refreshed.amountPaise
        ? "refunded"
        : totalRefundedOrPending > 0
          ? "partially_refunded"
          : "captured";
    await Payment.updateOne({ _id: refreshed._id }, { $set: { status: summaryStatus } });
    const finalPayment = await Payment.findById(refreshed._id);
    const finalRefund = finalPayment?.refunds.find((item: any) => item.idempotencyKey === idempotencyKey);
    // Fully refunded booking: the professional must not later be paid for it. Payouts that
    // were never transferred are cancelled (transferred ones were reversed above).
    if (finalRefund && finalRefund.status !== "failed" && totalRefundedOrPending >= Number(refreshed.amountPaise)) {
      await Payout.updateOne(
        { bookingId: booking._id, status: { $in: ["pending", "on_hold", "failed"] } },
        { $set: { status: "cancelled", failureReason: "Customer payment was fully refunded." } },
      );
    }
    if (finalPayment && finalRefund?.status === "processed") await writeRefundLedger(finalPayment, booking, finalRefund);
    await notifyUser({
      recipientUserId: String(booking.customerId),
      type: "refund_updated",
      title: "Refund status updated",
      message: `Your refund status is ${finalRefund?.status ?? providerRefund.status}.`,
      channels: ["in_app", "email"],
      data: { bookingId: String(booking._id), paymentId: String(payment._id), refundId: providerRefund.id },
      dedupeKey: `refund-updated:${providerRefund.id}`,
    }).catch(() => undefined);
    return { payment: finalPayment ?? refreshed, refund: finalRefund ?? providerRefund };
  } catch (error) {
    // Keep the reserved refund when provider outcome is uncertain. The same scoped
    // idempotency key returns the same provider operation on a retry.
    console.error("Razorpay refund request did not complete", error instanceof Error ? error.message : "unknown error");
    throw error;
  }
}

async function writePayoutReversalLedger(payout: any, paymentId: unknown) {
  const amount = Number(payout.amountPaise);
  if (amount <= 0) return;
  const group = `payout-reversal:${String(payout._id)}`;
  if (await FinancialLedger.findOne({ transactionGroupId: group }).lean()) return;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await FinancialLedger.create([
        { transactionGroupId: group, accountCode: "cash_clearing", entrySide: "debit", entryType: "payout_reversed", amountPaise: amount, bookingId: payout.bookingId, paymentId, payoutId: payout._id, idempotencyKey: `${group}:cash-debit`, description: "Razorpay Route transfer was reversed." },
        { transactionGroupId: group, accountCode: "professional_payable", entrySide: "credit", entryType: "payout_reversed", amountPaise: amount, bookingId: payout.bookingId, paymentId, payoutId: payout._id, idempotencyKey: `${group}:payable-credit`, description: "Professional payable restored after transfer reversal." },
      ], { session, ordered: true });
    });
  } finally { await session.endSession(); }
}

function splitProRata(totalAmount: number, buckets: Array<{ accountCode: "professional_payable" | "platform_revenue" | "tax_payable"; amount: number }>) {
  const baseTotal = buckets.reduce((sum, item) => sum + item.amount, 0);
  if (totalAmount < 1 || baseTotal < 1 || totalAmount > baseTotal) throw new AppError("Cannot allocate refund across booking components.", 400, "REFUND_ALLOCATION_INVALID");
  const pieces = buckets.map((bucket) => {
    const product = BigInt(totalAmount) * BigInt(bucket.amount);
    return { accountCode: bucket.accountCode, amount: Number(product / BigInt(baseTotal)), remainder: product % BigInt(baseTotal) };
  });
  let remaining = totalAmount - pieces.reduce((sum, item) => sum + item.amount, 0);
  const ranking = [...pieces].sort((a, b) => a.remainder === b.remainder ? 0 : a.remainder > b.remainder ? -1 : 1);
  for (let i = 0; remaining > 0; i++, remaining--) ranking[i % ranking.length].amount++;
  return pieces.filter((piece) => piece.amount > 0).map(({ accountCode, amount }) => ({ accountCode, amount }));
}

async function writeRefundLedger(payment: any, booking: any, refund: any) {
  if (refund.status !== "processed") return;
  const group = `refund:${String(refund._id)}`;
  if (await FinancialLedger.findOne({ transactionGroupId: group }).lean()) return;
  const price = booking.priceSnapshot;
  const splits = splitProRata(Number(refund.amountPaise), ([
    { accountCode: "professional_payable", amount: Number(price.professionalPayoutPaise) },
    { accountCode: "platform_revenue", amount: Number(price.commissionPaise) + Number(price.customerPlatformFeePaise) },
    { accountCode: "tax_payable", amount: Number(price.taxPaise) },
  ] as Array<{ accountCode: "professional_payable" | "platform_revenue" | "tax_payable"; amount: number }>).filter((item) => item.amount > 0));
  const entries = [
    ...splits.map((split, index) => ({
      transactionGroupId: group, accountCode: split.accountCode, entrySide: "debit" as const, entryType: "refund_issued" as const,
      amountPaise: split.amount, bookingId: booking._id, paymentId: payment._id, idempotencyKey: `${group}:debit:${index}`,
      description: `Refund component reversal for ${String(refund.razorpayRefundId ?? refund._id)}.`,
    })),
    {
      transactionGroupId: group, accountCode: "cash_clearing" as const, entrySide: "credit" as const, entryType: "refund_issued" as const,
      amountPaise: Number(refund.amountPaise), bookingId: booking._id, paymentId: payment._id, idempotencyKey: `${group}:cash-credit`,
      description: "Customer refund issued through Razorpay.",
    },
  ];
  const debitTotal = entries.filter((entry) => entry.entrySide === "debit").reduce((sum, entry) => sum + entry.amountPaise, 0);
  const creditTotal = entries.filter((entry) => entry.entrySide === "credit").reduce((sum, entry) => sum + entry.amountPaise, 0);
  if (debitTotal !== creditTotal) throw new AppError("Refund ledger entries do not balance.", 500, "LEDGER_UNBALANCED");
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      if (await FinancialLedger.findOne({ transactionGroupId: group }).session(session).lean()) return;
      await FinancialLedger.create(entries.map((entry) => ({ ...entry, currency: "INR", payoutId: undefined, occurredAt: new Date() })), { session, ordered: true });
    });
  } finally { await session.endSession(); }
}

/** Reconcile the ledger after a provider webhook says a previously pending refund completed. */
export async function recordProcessedRefundLedger(input: { paymentId: string; razorpayRefundId: string }) {
  const payment = await Payment.findById(input.paymentId);
  if (!payment) return false;
  const refund = payment.refunds.find((item: any) => item.razorpayRefundId === input.razorpayRefundId);
  if (!refund || refund.status !== "processed") return false;
  const booking = await Booking.findById(payment.bookingId).lean();
  if (!booking) return false;
  await writeRefundLedger(payment, booking, refund);
  return true;
}
