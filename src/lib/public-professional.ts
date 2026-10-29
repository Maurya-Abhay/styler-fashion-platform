import { cache } from "react";
import mongoose from "mongoose";
import ProfessionalProfile from "@/models/ProfessionalProfile";
import Service from "@/models/Service";
import Review from "@/models/Review";
import { connectDB } from "@/lib/db";
import { toPublicProfessional } from "@/lib/api-domain";

/** Shared server-side profile read for HTML rendering and metadata generation. */
export const getPublicProfessional = cache(async (identifier: string) => {
  await connectDB();
  const normalized = identifier.trim().toLowerCase();
  const lookup = mongoose.isValidObjectId(normalized)
    ? { _id: normalized, applicationStatus: "approved" }
    : { slug: normalized, applicationStatus: "approved" };
  const profile = await ProfessionalProfile.findOne(lookup)
    .populate({ path: "userId", select: "name profileImageUrl" })
    .lean();
  if (!profile) return null;

  const [services, reviews, reviewStats] = await Promise.all([
    Service.find({ professionalId: profile._id, isActive: true })
      .select("slug category title description pricingType pricePaise durationMinutes travelBufferMinutes images")
      .sort({ createdAt: -1 }).lean(),
    Review.find({ professionalId: profile._id, status: "published" })
      .select("rating comment createdAt customerId")
      .sort({ createdAt: -1 }).limit(20)
      .populate({ path: "customerId", select: "name" }).lean(),
    Review.aggregate([
      { $match: { professionalId: profile._id, status: "published" } },
      { $group: { _id: null, averageRating: { $avg: "$rating" }, total: { $sum: 1 } } },
    ]),
  ]);

  // Normalize ObjectIds and Dates for safe transfer to client components and metadata consumers.
  return JSON.parse(JSON.stringify({
    professional: toPublicProfessional(profile),
    services,
    reviews,
    rating: reviewStats[0] ?? { averageRating: null, total: 0 },
  }));
});
