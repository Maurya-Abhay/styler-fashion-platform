import type { AuthenticatedUser, UserRole } from "@/types";
import ProfessionalProfile from "@/models/ProfessionalProfile";
import { AppError } from "@/types";

export function assertRole(user: AuthenticatedUser, allowedRoles: UserRole[]): void {
  if (!allowedRoles.includes(user.role)) throw new AppError("You do not have permission to perform this action.", 403, "FORBIDDEN");
  if (user.accountStatus !== "active") throw new AppError("This account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
}

export async function assertApprovedProfessional(user: AuthenticatedUser) {
  assertRole(user, ["professional"]);
  const profile = await ProfessionalProfile.findOne({ userId: user.userId }).lean();
  if (!profile || profile.applicationStatus !== "approved") {
    throw new AppError("Your professional application must be approved first.", 403, "PROFESSIONAL_NOT_APPROVED");
  }
  return profile;
}

export function assertOwnerOrAdmin(user: AuthenticatedUser, ownerUserId: string): void {
  if (user.role !== "admin" && user.userId !== ownerUserId) {
    throw new AppError("You cannot access this resource.", 403, "FORBIDDEN");
  }
}
