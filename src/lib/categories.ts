export type CategoryGroup = "beauty" | "home" | "wellness" | "repairs" | "fashion";

export const SERVICE_CATEGORY_IDS = [
  "hair_styling",
  "makeup",
  "skincare",
  "nails",
  "massage",
  "home_cleaning",
  "plumbing",
  "fitness_wellness",
  "lehenga_stitching",
  "custom_clothing",
  "alterations",
  "personal_styling",
  "fashion_consulting",
  "special_occasion_wear",
  "other",
] as const;

export type ServiceCategoryId = typeof SERVICE_CATEGORY_IDS[number];

export interface CategoryMeta {
  slug: ServiceCategoryId;
  label: string;
  group: CategoryGroup;
  blurb: string;
  fromPrice: number; // INR
}

export const CATEGORIES: CategoryMeta[] = [
  { slug: "hair_styling", label: "Hair Styling", group: "beauty", blurb: "Professional hair cutting, styling & colouring at home.", fromPrice: 499 },
  { slug: "makeup", label: "Makeup", group: "beauty", blurb: "Bridal, party & photoshoot makeup by verified artists.", fromPrice: 999 },
  { slug: "skincare", label: "Skincare", group: "beauty", blurb: "Facials, cleanup and skin treatments at your doorstep.", fromPrice: 799 },
  { slug: "nails", label: "Nail Art", group: "beauty", blurb: "Manicure, pedicure and nail art done hygienically.", fromPrice: 499 },
  { slug: "massage", label: "Massage Therapy", group: "wellness", blurb: "Relaxing & therapeutic massage by trained therapists.", fromPrice: 799 },
  { slug: "fitness_wellness", label: "Fitness & Wellness", group: "wellness", blurb: "Personal trainers, yoga and wellness coaches.", fromPrice: 599 },
  { slug: "home_cleaning", label: "Home Cleaning", group: "home", blurb: "Deep cleaning and regular home cleaning services.", fromPrice: 599 },
  { slug: "plumbing", label: "Plumbing", group: "repairs", blurb: "Leak repair, installation and quick fixes.", fromPrice: 299 },
  { slug: "personal_styling", label: "Personal Styling", group: "fashion", blurb: "Wardrobe and occasion styling with a fashion expert.", fromPrice: 999 },
  { slug: "custom_clothing", label: "Custom Clothing", group: "fashion", blurb: "Tailor-made outfits stitched to your measurements.", fromPrice: 1499 },
  { slug: "alterations", label: "Alterations", group: "fashion", blurb: "Perfect fit alterations for every outfit.", fromPrice: 199 },
  { slug: "lehenga_stitching", label: "Bridal & Lehenga", group: "fashion", blurb: "Bespoke bridal and lehenga stitching.", fromPrice: 4999 },
  { slug: "fashion_consulting", label: "Fashion Consulting", group: "fashion", blurb: "One-to-one fashion consulting sessions.", fromPrice: 799 },
  { slug: "special_occasion_wear", label: "Occasion Wear", group: "fashion", blurb: "Special-occasion outfits designed for you.", fromPrice: 1999 },
  { slug: "other", label: "Other Services", group: "fashion", blurb: "Tell us what you need and find the right professional.", fromPrice: 499 },
];

export const FEATURED_GROUPS: { key: CategoryGroup; label: string }[] = [
  { key: "beauty", label: "Beauty & Salon" },
  { key: "home", label: "Home Services" },
  { key: "wellness", label: "Fitness & Wellness" },
  { key: "repairs", label: "Repairs" },
  { key: "fashion", label: "Fashion" },
];

export function categoryLabel(slug?: string) {
  return CATEGORIES.find((c) => c.slug === slug)?.label || (slug ? slug.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()) : "Service");
}
