import { withApi, paginationFromRequest } from "@/lib/api-utils";
import { listPublicServices } from "@/lib/public-services";

export const GET = withApi(async (request) => {
  const url = new URL(request.url);
  const { page, limit } = paginationFromRequest(request);
  return listPublicServices({
    category: url.searchParams.get("category"),
    query: url.searchParams.get("q"),
    professionalId: url.searchParams.get("professionalId"),
    page,
    limit,
  });
});
