import Payout from "@/models/Payout";
import ProfessionalProfile from "@/models/ProfessionalProfile";
import { currentUser, readJson, withApi } from "@/lib/api-utils";
import { AppError } from "@/types";
import { professionalPayoutAccountSchema } from "@/lib/validation";
import { notifyAdmins } from "@/lib/notifications";

export const GET = withApi(async (request) => {
  const auth = await currentUser(request, ["professional"]);
  const profile = await ProfessionalProfile.findOne({ userId: auth.userId })
    .select("payoutAccount applicationStatus").lean();
  if (!profile) throw new AppError("Professional profile not found.", 404, "PROFILE_NOT_FOUND");
  return {
    applicationStatus: profile.applicationStatus,
    payoutAccount: {
      provider: profile.payoutAccount?.provider ?? "manual_upi",
      status: profile.payoutAccount?.status ?? "not_started",
      accountHolderName: profile.payoutAccount?.accountHolderName ?? "",
      upiId: profile.payoutAccount?.upiId ?? "",
      providerAccountId: profile.payoutAccount?.providerAccountId ?? null,
      verifiedAt: profile.payoutAccount?.verifiedAt ?? null,
      reviewReason: profile.payoutAccount?.reviewReason ?? null,
    },
  };
});

export const PATCH = withApi(async (request) => {
  const auth = await currentUser(request, ["professional"]);
  const body = professionalPayoutAccountSchema.parse(await readJson(request));
  const profile = await ProfessionalProfile.findOne({ userId: auth.userId });
  if (!profile) throw new AppError("Professional profile not found.", 404, "PROFILE_NOT_FOUND");
  if (profile.applicationStatus !== "approved") {
    throw new AppError("Professional approval is required before payout setup.", 403, "PROFESSIONAL_NOT_APPROVED");
  }
  const normalizedUpiId = body.upiId.toLowerCase();
  const current = profile.payoutAccount;
  if (current?.status === "restricted") {
    throw new AppError("Your payout details are restricted. Contact Styler support before changing them.", 403, "PAYOUT_ACCOUNT_RESTRICTED");
  }
  const changed = current?.provider !== "manual_upi"
    || current?.upiId !== normalizedUpiId
    || current?.accountHolderName !== body.accountHolderName;
  if (changed && current?.status === "verified") {
    const activePayout = await Payout.exists({
      professionalId: profile._id,
      status: { $in: ["pending", "processing"] },
    });
    if (activePayout) {
      throw new AppError(
        "A payout is already pending or prepared. Complete or cancel it before changing your verified UPI details.",
        409,
        "PAYOUT_ACCOUNT_IN_USE",
      );
    }
  }
  profile.payoutAccount = {
    provider: "manual_upi",
    accountHolderName: body.accountHolderName,
    upiId: normalizedUpiId,
    status: changed || current?.status === "rejected" ? "pending" : current?.status ?? "pending",
    ...(changed || current?.status === "rejected" ? { verifiedAt: undefined, reviewReason: undefined } : {
      verifiedAt: current?.verifiedAt,
      reviewReason: current?.reviewReason,
    }),
  } as any;
  await profile.save();
  if (changed || current?.status === "rejected") {
    await notifyAdmins({
      type: "system_message",
      title: "Professional payout details need review",
      message: `${profile.displayName || "A professional"} submitted UPI details for verification.`,
      data: { profileId: String(profile._id) },
      dedupeKey: `admin-payout-account-submitted:${String(profile._id)}:${profile.updatedAt.getTime()}`,
    }).catch((error) => console.error("Unable to notify admins about UPI payout details", error));
  }
  return {
    payoutAccount: {
      provider: profile.payoutAccount.provider,
      accountHolderName: profile.payoutAccount.accountHolderName,
      upiId: profile.payoutAccount.upiId,
      status: profile.payoutAccount.status,
    },
    message: "UPI details submitted. Styler admin must verify the payee details before payouts are released.",
  };
});
