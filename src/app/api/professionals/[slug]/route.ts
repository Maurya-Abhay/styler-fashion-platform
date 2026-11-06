import mongoose from "mongoose";
import ProfessionalProfile from "@/models/ProfessionalProfile";
import Service from "@/models/Service";
import ServiceCategory from "@/models/ServiceCategory";
import Review from "@/models/Review";
import { withApi, routeParams } from "@/lib/api-utils";
import { toPublicProfessional } from "@/lib/api-domain";
import { AppError } from "@/types";

export const GET = withApi(async (_request, context) => {
  const { slug } = await routeParams(context);
  const lookup = mongoose.isValidObjectId(slug) ? { _id: slug, applicationStatus: "approved" } : { slug: slug.toLowerCase(), applicationStatus: "approved" };
  const profile = await ProfessionalProfile.findOne(lookup).populate({ path: "userId", select: "name profileImageUrl" }).lean();
  if (!profile) throw new AppError("Professional not found.", 404, "PROFESSIONAL_NOT_FOUND");
  const activeCategories = await ServiceCategory.find({ isActive: true }).select("slug name label").lean();
  const activeCategorySlugs = activeCategories.map((item: any) => String(item.slug));
  const categoryLabels = new Map(activeCategories.map((item: any) => [String(item.slug), String(item.name || item.label || "")]));
  const [services, reviews, reviewStats] = await Promise.all([
    Service.find({ professionalId: profile._id, isActive: true, category: { $in: activeCategorySlugs } }).select("slug category title description pricingType pricePaise durationMinutes travelBufferMinutes images").sort({ createdAt: -1 }).lean(),
    Review.find({ professionalId: profile._id, status: "published" }).select("rating comment createdAt customerId").sort({ createdAt: -1 }).limit(20).populate({ path: "customerId", select: "name" }).lean(),
    Review.aggregate([{ $match: { professionalId: profile._id, status: "published" } }, { $group: { _id: null, averageRating: { $avg: "$rating" }, total: { $sum: 1 } } }]),
  ]);
  return {
    professional: {
      ...toPublicProfessional(profile),
      categories: (profile.categories || []).filter((category: string) => categoryLabels.has(category)),
      categoryLabels: (profile.categories || []).map((category: string) => categoryLabels.get(category)).filter(Boolean),
    },
    services: services.map((service: any) => ({
      ...service,
      categoryLabel: categoryLabels.get(service.category) || null,
    })),
    reviews,
    rating: reviewStats[0] ?? { averageRating: null, total: 0 },
  };
});
