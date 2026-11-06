import { withApi } from "@/lib/api-utils";
import { listServiceCategories } from "@/lib/service-categories";

export const GET = withApi(async () => ({
  items: await listServiceCategories(),
}));
