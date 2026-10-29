import ContactMessage from "@/models/ContactMessage";
import { currentUser, paginationFromRequest, withApi } from "@/lib/api-utils";

export const GET = withApi(async (request) => {
  await currentUser(request, ["admin"]);
  const url = new URL(request.url);
  const { page, limit, skip } = paginationFromRequest(request);
  const filter: Record<string, unknown> = {};
  const status = url.searchParams.get("status");
  if (["new", "in_progress", "resolved"].includes(status || "")) {
    filter.status = status;
  }

  const [items, total] = await Promise.all([
    ContactMessage.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ContactMessage.countDocuments(filter),
  ]);
  return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
});
