import { z } from "zod";
import ProfessionalProfile from "@/models/ProfessionalProfile";
import { currentUser, readJson, routeParams, requireId, withApi, writeAudit } from "@/lib/api-utils";
import { releaseVerifiedPayoutHolds } from "@/lib/payout";
import { notifyUser } from "@/lib/notifications";
import { AppError } from "@/types";

const schema = z.object({
  status: z.enum(["verified", "restricted", "rejected"]),
  reviewReason: z.string().trim().max(500).optional(),
  providerAccountId: z.string().trim().min(3).max(200).optional(),
});

export const PATCH = withApi(async (request, context) => {
  const admin = await currentUser(request, ["admin"]);
  const { profileId } = await routeParams(context);
  requireId(profileId, "profileId");
  const body = schema.parse(await readJson(request));
  const profile = await ProfessionalProfile.findById(profileId);
  if (!profile) throw new AppError("Professional profile not found.", 404, "PROFESSIONAL_NOT_FOUND");

  const current = profile.payoutAccount;
  const isLegacyRoute = Boolean(body.providerAccountId || current?.provider === "razorpay_route");
  if (body.status === "verified") {
    if (isLegacyRoute && !(body.providerAccountId || current?.providerAccountId)) {
      throw new AppError("A Razorpay Route linked-account ID is required.", 400, "PAYOUT_ACCOUNT_INCOMPLETE");
    }
    if (!isLegacyRoute && !(current?.upiId && current?.accountHolderName)) {
      throw new AppError("Complete UPI ID and account-holder name are required before verification.", 400, "PAYOUT_ACCOUNT_INCOMPLETE");
    }
  }

  const before = {
    provider: current?.provider ?? null,
    status: current?.status ?? "not_started",
  };
  profile.payoutAccount = {
    ...(current?.toObject?.() ?? current ?? {}),
    provider: isLegacyRoute ? "razorpay_route" : "manual_upi",
    ...(isLegacyRoute
      ? { providerAccountId: body.providerAccountId ?? current?.providerAccountId }
      : {}),
    status: body.status,
    verifiedAt: body.status === "verified" ? new Date() : undefined,
    reviewReason: body.status === "rejected" || body.status === "restricted"
      ? body.reviewReason
      : undefined,
  } as any;
  await profile.save();
  if (body.status === "verified") await releaseVerifiedPayoutHolds(profileId);

  await writeAudit({
    actorUserId: admin.userId,
    actorRole: "admin",
    action: "professional.payout_account_status_changed",
    targetType: "ProfessionalProfile",
    targetId: profileId,
    before: { payoutAccount: before },
    after: {
      payoutAccount: {
        provider: profile.payoutAccount.provider,
        status: profile.payoutAccount.status,
        reviewReason: profile.payoutAccount.reviewReason,
      },
    },
    request,
  });
  await notifyUser({
    recipientUserId: String(profile.userId),
    type: "payout_status",
    title: body.status === "verified" ? "UPI payout details verified" : "UPI payout details need attention",
    message: body.status === "verified"
      ? "Your payout details have been verified. Eligible completed-booking payouts can now be processed."
      : body.reviewReason || `Your payout details were ${body.status}. Contact Styler support if you need help.`,
    channels: ["in_app", "email"],
    data: { profileId },
    dedupeKey: `payout-account-review:${profileId}:${profile.updatedAt.getTime()}`,
  }).catch((error) => console.error("Unable to notify professional about payout-account review", error));
  return {
    payoutAccount: {
      provider: profile.payoutAccount.provider,
      status: profile.payoutAccount.status,
      verifiedAt: profile.payoutAccount.verifiedAt,
      reviewReason: profile.payoutAccount.reviewReason,
    },
  };
});
