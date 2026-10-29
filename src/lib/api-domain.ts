import { AppError } from "@/types";
import ProfessionalProfile from "@/models/ProfessionalProfile";

export async function professionalProfileForUser(userId: string, options: { approved?: boolean } = {}) {
  const query: Record<string, unknown> = { userId };
  if (options.approved) query.applicationStatus = "approved";
  const profile = await ProfessionalProfile.findOne(query);
  if (!profile) throw new AppError("Professional profile not found. Complete onboarding first.", 404, "PROFESSIONAL_PROFILE_NOT_FOUND");
  if (options.approved && profile.applicationStatus !== "approved") throw new AppError("Your professional application must be approved first.", 403, "PROFESSIONAL_NOT_APPROVED");
  return profile;
}

export function toPublicProfessional(profile: any) {
  const user = profile.userId && typeof profile.userId === "object" ? profile.userId : null;
  return {
    id: String(profile._id),
    slug: profile.slug,
    displayName: profile.displayName || user?.name || "Styler Professional",
    profilePhoto: profile.profilePhoto ?? (user?.profileImageUrl ? { url: user.profileImageUrl } : null),
    bio: profile.bio ?? "",
    experienceYears: profile.experienceYears ?? 0,
    categories: profile.categories ?? [],
    city: profile.city,
    state: profile.state,
    serviceAreas: profile.serviceAreas ?? [],
    applicationStatus: profile.applicationStatus,
    ...(profile.userId ? { user: { id: String(user?._id ?? profile.userId), name: user?.name ?? undefined } } : {}),
    createdAt: profile.createdAt,
  };
}

export function safeDocumentSummary(profile: any) {
  return {
    id: String(profile._id),
    displayName: profile.displayName,
    bio: profile.bio,
    profilePhoto: profile.profilePhoto,
    portfolioImages: profile.portfolioImages,
    experienceYears: profile.experienceYears,
    categories: profile.categories,
    city: profile.city,
    state: profile.state,
    postalCode: profile.postalCode,
    baseLocation: profile.baseLocation,
    serviceAreas: profile.serviceAreas,
    documents: (profile.documents ?? []).map((doc: any) => ({ id: String(doc._id), documentType: doc.documentType, originalFileName: doc.originalFileName, mimeType: doc.mimeType, sizeBytes: doc.sizeBytes, status: doc.status, reviewReason: doc.reviewReason })),
    applicationStatus: profile.applicationStatus,
    applicationSubmittedAt: profile.applicationSubmittedAt,
    reviewReason: profile.reviewReason,
    payoutAccount: profile.payoutAccount ? { status: profile.payoutAccount.status } : undefined,
    commissionOverridePercent: profile.commissionOverridePercent,
  };
}
