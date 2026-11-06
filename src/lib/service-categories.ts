import { connectDB } from "@/lib/db";
import ServiceCategory from "@/models/ServiceCategory";

type ServiceCategoryRecord = {
  slug: string;
  name?: string;
  label?: string;
  description?: string;
  displayOrder?: number;
  sortOrder?: number;
  image?: string;
  isActive?: boolean;
  updatedAt?: Date;
  [key: string]: unknown;
};

export async function listServiceCategories(includeInactive = false) {
  await connectDB();
  const filter = includeInactive ? {} : { isActive: true };
  const categories = await ServiceCategory.find(filter)
    .sort({ displayOrder: 1, sortOrder: 1, name: 1, _id: 1 })
    .lean<ServiceCategoryRecord[]>();
  return categories
    .map((category) => {
      return {
        ...category,
        name: category.name || category.label || "",
        displayOrder: category.displayOrder ?? category.sortOrder ?? 0,
        image: category.image || "",
      };
    })
    .sort((left, right) => left.displayOrder - right.displayOrder || left.name.localeCompare(right.name));
}

export async function getActiveServiceCategory(slug: string) {
  await connectDB();
  const category = await ServiceCategory.findOne({ slug, isActive: true })
    .select("slug name label description image").lean() as
      | { slug: string; name?: string; label?: string; description?: string; image?: string }
      | null;
  return category
    ? {
        slug: category.slug,
        name: category.name || category.label || "",
        description: category.description || "",
        image: category.image || "",
      }
    : null;
}

export async function activeServiceCategoryExists(slug: string) {
  await connectDB();
  return Boolean(await ServiceCategory.exists({ slug, isActive: true }));
}
