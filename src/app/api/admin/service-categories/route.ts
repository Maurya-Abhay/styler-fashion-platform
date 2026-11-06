import { z } from "zod";
import { AppError } from "@/types";
import { currentUser, readJson, withApi, writeAudit } from "@/lib/api-utils";
import { connectDB } from "@/lib/db";
import { listServiceCategories } from "@/lib/service-categories";
import ServiceCategory from "@/models/ServiceCategory";

const createSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/).max(120).optional(),
  description: z.string().trim().max(500).default(""),
  displayOrder: z.number().int().min(0).max(100000).default(0),
  image: z.string().trim().max(2048).refine((value) => !value || /^https?:\/\//i.test(value), "Image must be an http(s) URL.").default(""),
});

function slugFromLabel(label: string) {
  return label.trim().toLowerCase().normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 120);
}

export const GET = withApi(async (request) => {
  await currentUser(request, ["admin"]);
  return { items: await listServiceCategories(true) };
});

export const POST = withApi(async (request) => {
  const admin = await currentUser(request, ["admin"]);
  const body = createSchema.parse(await readJson(request));
  const { slug: requestedSlug, ...fields } = body;
  const slug = requestedSlug || slugFromLabel(body.name);
  if (!slug) {
    throw new AppError("Category name must contain letters or numbers.", 422, "INVALID_CATEGORY");
  }
  await connectDB();
  if (await ServiceCategory.exists({ slug })) {
    throw new AppError("A category with this name already exists.", 409, "CATEGORY_EXISTS");
  }
  const category = await ServiceCategory.create({
    ...fields,
    slug,
    label: fields.name,
    isActive: true,
  });
  await writeAudit({
    actorUserId: admin.userId,
    actorRole: "admin",
    action: "service_category.created",
    targetType: "ServiceCategory",
    targetId: slug,
    after: category.toObject(),
    request,
  });
  return category;
});
