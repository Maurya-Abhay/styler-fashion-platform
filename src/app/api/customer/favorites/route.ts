import ProfessionalProfile from "@/models/ProfessionalProfile";
import Review from "@/models/Review";
import User from "@/models/User";
import { currentUser, readJson, requireId, withApi } from "@/lib/api-utils";
import { toPublicProfessional } from "@/lib/api-domain";
import { AppError } from "@/types";
import { z } from "zod";

const favoriteSchema = z.object({
  professionalId: z.string().min(1),
});

export const GET = withApi(async (request) => {
  const auth = await currentUser(request, ["customer"]);
  const user = await User.findById(auth.userId).select("favoriteProfessionalIds").lean();
  if (!user) throw new AppError("User not found.", 404, "USER_NOT_FOUND");

  const ids = user.favoriteProfessionalIds ?? [];
  const profiles = ids.length
    ? await ProfessionalProfile.find({
        _id: { $in: ids },
        applicationStatus: "approved",
      })
        .select("slug displayName bio profilePhoto experienceYears categories city state serviceAreas applicationStatus createdAt userId")
        .populate({ path: "userId", select: "name profileImageUrl" })
        .lean()
    : [];
  const reviews = profiles.length
    ? await Review.aggregate([
        {
          $match: {
            professionalId: { $in: profiles.map((profile: any) => profile._id) },
            status: "published",
          },
        },
        {
          $group: {
            _id: "$professionalId",
            averageRating: { $avg: "$rating" },
            reviewCount: { $sum: 1 },
          },
        },
      ])
    : [];
  const ratingsById = new Map<string, any>(
    reviews.map((review: any) => [String(review._id), review]),
  );
  const profilesById = new Map<string, any>(
    profiles.map((profile: any) => [String(profile._id), profile]),
  );

  return {
    items: ids.flatMap((id: unknown) => {
      const profile = profilesById.get(String(id));
      if (!profile) return [];
      const rating = ratingsById.get(String(profile._id));
      return [{
        id: String(profile._id),
        professional: {
          ...toPublicProfessional(profile),
          ratingAverage: rating?.averageRating ?? null,
          ratingCount: rating?.reviewCount ?? 0,
        },
      }];
    }),
  };
});

export const POST = withApi(async (request) => {
  const auth = await currentUser(request, ["customer"]);
  const body = favoriteSchema.parse(await readJson(request));
  const professionalId = requireId(body.professionalId, "professionalId");
  const profile = await ProfessionalProfile.findOne({
    _id: professionalId,
    applicationStatus: "approved",
  }).select("_id").lean();
  if (!profile) throw new AppError("Approved professional not found.", 404, "PROFESSIONAL_NOT_FOUND");

  const user = await User.findByIdAndUpdate(
    auth.userId,
    { $addToSet: { favoriteProfessionalIds: profile._id } },
    { new: true },
  ).select("_id").lean();
  if (!user) throw new AppError("User not found.", 404, "USER_NOT_FOUND");

  return { professionalId: String(profile._id), isFavorite: true };
});
