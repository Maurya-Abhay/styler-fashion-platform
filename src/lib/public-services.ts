import mongoose from "mongoose";
import Service from "@/models/Service";
import { connectDB } from "@/lib/db";
import { requireId, safeRegexText } from "@/lib/api-utils";

type PublicServiceQuery = {
  category?: string | null;
  query?: string | null;
  professionalId?: string | null;
  page?: number;
  limit?: number;
};

export async function listPublicServices({
  category,
  query,
  professionalId,
  page = 1,
  limit = 20,
}: PublicServiceQuery = {}) {
  await connectDB();

  const match: Record<string, any> = { isActive: true };
  if (category) match.category = category;
  if (professionalId) {
    match.professionalId = new mongoose.Types.ObjectId(
      requireId(professionalId, "professionalId"),
    );
  }
  const search = query?.trim().slice(0, 100);
  if (search) {
    const pattern = new RegExp(safeRegexText(search), "i");
    match.$or = [{ title: pattern }, { description: pattern }];
  }

  const skip = (page - 1) * limit;
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
  const items = (result?.items ?? []).map(
    ({ professional, ...service }: any) => ({
      ...service,
      professional: professional?.[0] ?? null,
    }),
  );

  return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
}
