import mongoose from "mongoose";
import Service from "@/models/Service";
import { withApi, paginationFromRequest, safeRegexText, requireId } from "@/lib/api-utils";

const MAX_QUERY_LENGTH = 100;

export const GET = withApi(async (request) => {
  const url = new URL(request.url);
  const { page, limit, skip } = paginationFromRequest(request);
  const match: Record<string, any> = { isActive: true };
  const category = url.searchParams.get("category");
  const q = url.searchParams.get("q")?.trim().slice(0, MAX_QUERY_LENGTH);
  const professionalId = url.searchParams.get("professionalId");
  if (category) match.category = category;
  if (professionalId) match.professionalId = new mongoose.Types.ObjectId(requireId(professionalId, "professionalId"));
  if (q) {
    const pattern = new RegExp(safeRegexText(q), "i");
    match.$or = [{ title: pattern }, { description: pattern }];
  }

  // One aggregation instead of loading every approved professional id into memory:
  // only services belonging to approved professionals are listed.
  const [result] = await Service.aggregate([
    { $match: match },
    {
      $lookup: {
        from: "professional_profiles",
        localField: "professionalId",
        foreignField: "_id",
        as: "professional",
        pipeline: [
          { $match: { applicationStatus: "approved" } },
          { $project: { slug: 1, displayName: 1, city: 1, state: 1, profilePhoto: 1 } },
        ],
      },
    },
    { $match: { "professional.0": { $exists: true } } },
    { $sort: { createdAt: -1, _id: -1 } },
    { $facet: { items: [{ $skip: skip }, { $limit: limit }], total: [{ $count: "n" }] } },
  ]);

  const total = Number(result?.total?.[0]?.n ?? 0);
  const items = (result?.items ?? []).map(({ professional, ...service }: any) => ({ ...service, professional: professional?.[0] ?? null }));
  return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
});
