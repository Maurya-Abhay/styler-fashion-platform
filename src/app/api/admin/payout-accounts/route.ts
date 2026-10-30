import ProfessionalProfile from "@/models/ProfessionalProfile";
import { currentUser, paginationFromRequest, withApi } from "@/lib/api-utils";

export const GET = withApi(async (request) => {
  await currentUser(request, ["admin"]);
  const url = new URL(request.url);
  const { page, limit, skip } = paginationFromRequest(request);
  const status = url.searchParams.get("status") || "pending";
  const filter: Record<string, unknown> = {};
  if (status !== "all") filter["payoutAccount.status"] = status;

  const [items, total] = await Promise.all([
    ProfessionalProfile.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("displayName city payoutAccount updatedAt")
      .populate({ path: "userId", select: "name email phone" })
      .lean(),
    ProfessionalProfile.countDocuments(filter),
  ]);
  return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
});
