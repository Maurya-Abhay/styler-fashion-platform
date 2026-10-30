import { z } from "zod";
import ProfessionalProfile from "@/models/ProfessionalProfile";
import { currentUser, readJson, withApi, writeAudit } from "@/lib/api-utils";
import { httpUrlSchema } from "@/lib/validation";
import { AppError } from "@/types";

const schema = z.object({
  displayName: z.string().trim().min(2).max(120).optional(),
  bio: z.string().trim().max(3000).optional(),
  profilePhoto: z.object({
    fileId: z.string().max(300).optional(),
    url: httpUrlSchema,
  }).optional(),
}).refine((value) => Object.keys(value).length > 0, "At least one profile field is required.");

export const PATCH = withApi(async (request) => {
  const auth = await currentUser(request, ["professional"]);
  const body = schema.parse(await readJson(request));
  const profile = await ProfessionalProfile.findOne({ userId: auth.userId });
  if (!profile) throw new AppError("Professional profile not found.", 404, "PROFILE_NOT_FOUND");
  if (profile.applicationStatus === "suspended") {
    throw new AppError("A suspended profile cannot be edited.", 403, "PROFILE_SUSPENDED");
  }
  if (profile.applicationStatus === "pending_review") {
    throw new AppError("Profile changes are unavailable while your application is under review.", 409, "APPLICATION_UNDER_REVIEW");
  }

  const before = {
    displayName: profile.displayName,
    bio: profile.bio,
    profilePhoto: profile.profilePhoto?.toObject?.() ?? profile.profilePhoto,
  };
  if (body.displayName !== undefined) profile.displayName = body.displayName;
  if (body.bio !== undefined) profile.bio = body.bio;
  if (body.profilePhoto !== undefined) profile.profilePhoto = body.profilePhoto;
  await profile.save();

  await writeAudit({
    actorUserId: auth.userId,
    actorRole: "professional",
    action: "professional.public_profile_updated",
    targetType: "ProfessionalProfile",
    targetId: String(profile._id),
    before,
    after: {
      displayName: profile.displayName,
      bio: profile.bio,
      profilePhoto: profile.profilePhoto?.toObject?.() ?? profile.profilePhoto,
    },
    request,
  });

  return {
    displayName: profile.displayName,
    bio: profile.bio,
    profilePhoto: profile.profilePhoto,
    applicationStatus: profile.applicationStatus,
  };
});
