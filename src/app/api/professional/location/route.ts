import { z } from "zod";
import ProfessionalProfile from "@/models/ProfessionalProfile";
import { currentUser, readJson, withApi } from "@/lib/api-utils";
import { AppError } from "@/types";

const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().min(4).max(12),
});

export const PATCH = withApi(async (request) => {
  const auth = await currentUser(request, ["professional"]);
  const location = locationSchema.parse(await readJson(request));
  const profile = await ProfessionalProfile.findOne({ userId: auth.userId });
  if (!profile) {
    throw new AppError("Professional profile not found.", 404, "PROFILE_NOT_FOUND");
  }
  if (profile.applicationStatus === "suspended") {
    throw new AppError("A suspended profile cannot update its service location.", 403, "PROFILE_SUSPENDED");
  }

  profile.baseLocation = {
    latitude: location.latitude,
    longitude: location.longitude,
  };
  profile.city = location.city;
  profile.state = location.state;
  profile.postalCode = location.postalCode;
  await profile.save();

  return {
    city: profile.city,
    state: profile.state,
    postalCode: profile.postalCode,
    baseLocation: profile.baseLocation,
  };
});
