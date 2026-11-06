import { loadEnvConfig } from "@next/env";
import { connectDB, disconnectDB } from "../src/lib/db";
import ServiceCategory from "../src/models/ServiceCategory";

loadEnvConfig(process.cwd());

const initialCategories = [
  ["hair_styling", "Hair Styling", "Professional hair cutting, styling and colouring.", 0],
  ["makeup", "Makeup", "Bridal, party and photoshoot makeup.", 1],
  ["skincare", "Skincare", "Facials, cleanups and skin treatments.", 2],
  ["nails", "Nail Art", "Manicure, pedicure and nail art.", 3],
  ["massage", "Massage Therapy", "Relaxing and therapeutic massage.", 4],
  ["home_cleaning", "Home Cleaning", "Deep cleaning and regular home cleaning.", 5],
  ["plumbing", "Plumbing", "Leak repair, installation and quick fixes.", 6],
  ["fitness_wellness", "Fitness & Wellness", "Personal trainers, yoga and wellness.", 7],
  ["lehenga_stitching", "Bridal & Lehenga", "Bespoke bridal and lehenga stitching.", 8],
  ["custom_clothing", "Custom Clothing", "Tailor-made outfits to your measurements.", 9],
  ["alterations", "Alterations", "Perfect-fit alterations for every outfit.", 10],
  ["personal_styling", "Personal Styling", "Wardrobe and occasion styling.", 11],
  ["fashion_consulting", "Fashion Consulting", "One-to-one fashion consulting.", 12],
  ["special_occasion_wear", "Occasion Wear", "Special-occasion outfits designed for you.", 13],
  ["other", "Other Services", "Tell us what you have in mind.", 14],
] as const;

async function seed() {
  await connectDB();
  for (const [slug, name, description, displayOrder] of initialCategories) {
    const existing = await ServiceCategory.findOne({ slug }).lean() as
      | { name?: string; label?: string; description?: string; displayOrder?: number; sortOrder?: number; image?: string; isActive?: boolean }
      | null;
    await ServiceCategory.updateOne(
      { slug },
      {
        $set: {
          name: existing?.name || existing?.label || name,
          description: existing?.description || description,
          displayOrder: existing?.displayOrder ?? existing?.sortOrder ?? displayOrder,
          image: existing?.image || "",
          isActive: existing?.isActive ?? true,
        },
        $setOnInsert: { slug },
        $unset: { label: "", group: "", sortOrder: "" },
      },
      { upsert: true },
    );
  }
  console.log(`Seeded ${initialCategories.length} initial service categories (existing rows preserved).`);
}

seed()
  .catch((error) => {
    console.error("Could not seed service categories.", error);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB());
