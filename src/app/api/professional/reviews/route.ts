import Booking from "@/models/Booking";
import ProfessionalProfile, { type ProfessionalProfileDocumentShape } from "@/models/ProfessionalProfile";
import Review from "@/models/Review";
import { currentUser, paginationFromRequest, withApi } from "@/lib/api-utils";
import { AppError } from "@/types";
import { Types } from "mongoose";

export const GET = withApi(async (request) => {
  const auth = await currentUser(request, ["professional"]);
  const profile = await ProfessionalProfile.findOne({ userId: auth.userId })
    .select("_id")
    .lean();
  if (!profile) throw new AppError("Professional profile not found.", 404, "PROFILE_NOT_FOUND");

  const { page, limit, skip } = paginationFromRequest(request);
  const filter = { professionalId: profile._id, status: "published" };
  const [reviews, total, stats] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "customerId", select: "name" })
      .populate({ path: "bookingId", select: "serviceSnapshot" })
      .lean(),
    Review.countDocuments(filter),
    Review.aggregate([
      { $match: filter },
      { $group: { _id: null, averageRating: { $avg: "$rating" }, totalReviews: { $sum: 1 } } },
    ]),
  ]);

  return {
    items: reviews.map((review: any) => ({
      ...review,
      customerName: review.customerId?.name,
      serviceTitle: review.bookingId?.serviceSnapshot?.title,
    })),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    summary: stats[0] ?? { averageRating: null, totalReviews: 0 },
  };
});
