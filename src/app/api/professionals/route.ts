import ProfessionalProfile from "@/models/ProfessionalProfile";
import Service from "@/models/Service";
import ServiceCategory from "@/models/ServiceCategory";
import { withApi, paginationFromRequest, safeRegexText } from "@/lib/api-utils";
import { toPublicProfessional } from "@/lib/api-domain";

export const GET = withApi(async (request) => {
  const url = new URL(request.url); const { page, limit, skip } = paginationFromRequest(request);
  const filter: Record<string, any> = { applicationStatus: "approved" };
  const activeCategories = await ServiceCategory.find({ isActive: true }).select("slug name label").lean();
  const activeCategorySlugs = activeCategories.map((item: any) => String(item.slug));
  const categoryLabels = new Map(activeCategories.map((item: any) => [String(item.slug), String(item.name || item.label || "")]));
  const city = url.searchParams.get("city")?.trim().slice(0, 100); const state = url.searchParams.get("state")?.trim().slice(0, 100);
  const category = url.searchParams.get("category")?.trim(); const q = url.searchParams.get("q")?.trim().slice(0, 100);
  if (city) filter.city = new RegExp(safeRegexText(city), "i");
  if (state) filter.state = new RegExp(`^${safeRegexText(state)}$`, "i");
  if (category) {
    filter.categories = activeCategorySlugs.includes(category) ? category : { $in: [] };
  } else {
    filter.categories = { $in: activeCategorySlugs };
  }
  if (q) {
    const searchPattern = new RegExp(safeRegexText(q), "i");
    const categoryPattern = new RegExp(safeRegexText(q.replace(/\s+/g, "_")), "i");
    const matchingServiceIds = await Service.distinct("professionalId", {
      isActive: true,
      category: { $in: activeCategorySlugs },
      $or: [{ title: searchPattern }, { category: categoryPattern }],
    });
    filter.$or = [
      { displayName: searchPattern },
      { bio: searchPattern },
      { city: searchPattern },
      { categories: categoryPattern },
      ...(matchingServiceIds.length ? [{ _id: { $in: matchingServiceIds } }] : []),
    ];
  }
  const [profiles, total] = await Promise.all([
    ProfessionalProfile.find(filter).select("slug displayName bio profilePhoto portfolioImages experienceYears categories city state serviceAreas applicationStatus createdAt userId").populate({ path: "userId", select: "name profileImageUrl" }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ProfessionalProfile.countDocuments(filter),
  ]);
  const ids = profiles.map((p: any) => p._id);
  const services = ids.length ? await Service.find({ professionalId: { $in: ids }, isActive: true, category: { $in: activeCategorySlugs } }).select("professionalId title category pricingType pricePaise durationMinutes images slug").lean() : [];
  const servicesByProfessional = new Map<string, any[]>();
  for (const service of services as any[]) {
    const key = String(service.professionalId);
    const current = servicesByProfessional.get(key);
    if (current) current.push(service); else servicesByProfessional.set(key, [service]);
  }
  return {
    items: profiles.map((p: any) => ({
      ...toPublicProfessional(p),
      categories: (p.categories || []).filter((slug: string) => categoryLabels.has(slug)),
      categoryLabels: (p.categories || []).map((slug: string) => categoryLabels.get(slug)).filter(Boolean),
      services: (servicesByProfessional.get(String(p._id)) ?? []).map((service) => ({
        ...service,
        categoryLabel: categoryLabels.get(service.category) || null,
      })),
    })),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
});
