import { z } from "zod";
import {
  cancelManualUpiPayoutPreparation,
  prepareManualUpiPayout,
  processRazorpayRoutePayout,
  recordManualUpiPayout,
  releaseVerifiedPayoutHolds,
} from "@/lib/payout";
import Payout from "@/models/Payout";
import { currentUser, readJson, routeParams, requireId, withApi, writeAudit } from "@/lib/api-utils";
import { AppError } from "@/types";

const schema = z.object({
  action: z.enum(["release_verified_holds", "prepare", "cancel_preparation", "record_transfer", "process_route"]).optional(),
  transactionReference: z.string().trim().min(3).max(200).optional(),
}).superRefine((body, context) => {
  if (body.action === "record_transfer" && !body.transactionReference) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["transactionReference"], message: "A transaction reference is required." });
  }
});

export const POST = withApi(async (request, context) => {
  const admin = await currentUser(request, ["admin"]);
  const { payoutId } = await routeParams(context);
  requireId(payoutId, "payoutId");
  const body = schema.parse(await readJson(request));
  let result;
  let action: string;

  const actionInput = body.action ?? "process_route";
  if (actionInput === "release_verified_holds") {
    const payout = await Payout.findById(payoutId).select("professionalId").lean();
    if (!payout) throw new AppError("Payout not found.", 404, "PAYOUT_NOT_FOUND");
    const released = await releaseVerifiedPayoutHolds(String(payout.professionalId), payoutId);
    const currentPayout = await Payout.findById(payoutId).select("status provider failureReason").lean();
    if (!currentPayout) throw new AppError("Payout not found.", 404, "PAYOUT_NOT_FOUND");
    if (released === 0 && currentPayout?.status === "on_hold") {
      throw new AppError(
        currentPayout.failureReason || "This payout could not be released. Confirm the verified UPI account and payout eligibility.",
        409,
        "PAYOUT_HOLD_NOT_RELEASED",
      );
    }
    result = { ...currentPayout, released };
    action = "payout.verified_holds_released";
  } else if (actionInput === "prepare") {
    result = await prepareManualUpiPayout(payoutId, admin.userId);
    action = "payout.manual_prepared";
  } else if (actionInput === "cancel_preparation") {
    result = await cancelManualUpiPayoutPreparation(payoutId);
    action = "payout.manual_preparation_cancelled";
  } else if (actionInput === "record_transfer") {
    result = await recordManualUpiPayout(payoutId, admin.userId, body.transactionReference ?? "");
    action = "payout.manual_transfer_recorded";
  } else {
    result = await processRazorpayRoutePayout(payoutId);
    action = "payout.processed";
  }

  if (!result) throw new AppError("Payout action did not return a result.", 500, "PAYOUT_ACTION_FAILED");
  await writeAudit({
    actorUserId: admin.userId,
    actorRole: "admin",
    action,
    targetType: "Payout",
    targetId: payoutId,
    after: {
      status: result.status,
      provider: result.provider,
      providerTransferId: result.providerTransferId,
      manualTransactionReference: result.manualTransactionReference,
    },
    request,
  });
  return result;
});
