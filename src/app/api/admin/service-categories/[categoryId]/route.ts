import { z } from "zod";
import { AppError } from "@/types";
import { currentUser, readJson, routeParams, withApi, writeAudit } from "@/lib/api-utils";
import { connectDB } from "@/lib/db";
import Booking from "@/models/Booking";
import BookingRequest from "@/models/BookingRequest";
import ProfessionalProfile from "@/models/ProfessionalProfile";
import Service from "@/models/Service";
import ServiceCategory from "@/models/ServiceCategory";

const categoryIdSchema = z.string().regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/).max(120);
const patchSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/).max(120).optional(),
  description: z.string().trim().max(500).optional(),
  displayOrder: z.number().int().min(0).max(100000).optional(),
  image: z.string().trim().max(2048).refine((value) => !value || /^https?:\/\//i.test(value), "Image must be an http(s) URL.").optional(),
  isActive: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, "At least one field is required.");

export const PATCH = withApi(async (request, context) => {
  const admin = await currentUser(request, ["admin"]);
  const { categoryId } = await routeParams(context);
  const slug = categoryIdSchema.parse(categoryId);
  const body = patchSchema.parse(await readJson(request));
  await connectDB();
  const before = await ServiceCategory.findOne({ slug }).lean();
  if (!before) throw new AppError("Service category not found.", 404, "CATEGORY_NOT_FOUND");
  if (body.slug && body.slug !== slug) {
    const [services, professionals, requests, bookings, duplicate] = await Promise.all([
      Service.exists({ category: slug }),
      ProfessionalProfile.exists({ categories: slug }),
      BookingRequest.exists({ serviceCategory: slug }),
      Booking.exists({ "serviceSnapshot.category": slug }),
      ServiceCategory.exists({ slug: body.slug }),
    ]);
    if (duplicate) throw new AppError("A category with this URL already exists.", 409, "CATEGORY_URL_EXISTS");
    if (services || professionals || requests || bookings) {
      throw new AppError(
        "This category URL is already in use. Its URL cannot be changed after it is referenced by marketplace records.",
        409,
        "CATEGORY_URL_IN_USE",
      );
    }
  }
  const category = await ServiceCategory.findOneAndUpdate(
    { slug },
    {
      $set: {
        ...body,
        ...(body.name ? { label: body.name } : {}),
      },
    },
    { new: true, runValidators: true },
  );
  await writeAudit({
    actorUserId: admin.userId,
    actorRole: "admin",
    action: "service_category.updated",
    targetType: "ServiceCategory",
    targetId: slug,
    before,
    after: category?.toObject(),
    request,
  });
  return category;
});

export const DELETE = withApi(async (request, context) => {
  const admin = await currentUser(request, ["admin"]);
  const { categoryId } = await routeParams(context);
  const slug = categoryIdSchema.parse(categoryId);
  await connectDB();
  const category = await ServiceCategory.findOne({ slug }).lean();
  if (!category) throw new AppError("Service category not found.", 404, "CATEGORY_NOT_FOUND");
  const [services, professionals, requests, bookings] = await Promise.all([
    Service.exists({ category: slug }),
    ProfessionalProfile.exists({ categories: slug }),
    BookingRequest.exists({ serviceCategory: slug }),
    Booking.exists({ "serviceSnapshot.category": slug }),
  ]);
  if (services || professionals || requests || bookings) {
    throw new AppError(
      "This category is in use. Deactivate it instead to preserve existing services and booking history.",
      409,
      "CATEGORY_IN_USE",
    );
  }
  await ServiceCategory.deleteOne({ slug });
  await writeAudit({
    actorUserId: admin.userId,
    actorRole: "admin",
    action: "service_category.deleted",
    targetType: "ServiceCategory",
    targetId: slug,
    before: category,
    request,
  });
  return { deleted: true, slug };
});
