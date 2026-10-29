import assert from "node:assert/strict";
import test from "node:test";
import { CATEGORIES, SERVICE_CATEGORY_IDS } from "../src/lib/categories";
import { bookingRequestSchema, serviceCategorySchema, serviceSchema } from "../src/lib/validation";
import { validateQuotePrice } from "../src/lib/booking";

const request = {
  serviceCategory: "lehenga_stitching",
  requirements: "Please stitch a bridal lehenga for my wedding.",
  addressSnapshot: {
    recipientName: "Test User",
    phone: "+919876543210",
    line1: "10 Main Road",
    city: "Gurugram",
    state: "Haryana",
    postalCode: "122001",
    country: "India",
  },
  preferredStartAt: new Date(Date.now() + 60 * 60 * 1000),
  preferredEndAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
};

test("all shared marketplace service categories are request-valid and discoverable", () => {
  assert.equal(new Set(SERVICE_CATEGORY_IDS).size, SERVICE_CATEGORY_IDS.length);
  assert.deepEqual(CATEGORIES.map((category) => category.slug).sort(), [...SERVICE_CATEGORY_IDS].sort());
  for (const category of SERVICE_CATEGORY_IDS) {
    assert.equal(serviceCategorySchema.safeParse(category).success, true);
  }
});

test("booking request defaults to a bounded radius and rejects partial GPS coordinates", () => {
  const parsed = bookingRequestSchema.parse(request);
  assert.equal(parsed.searchRadiusKm, 25);

  const partialCoordinates = bookingRequestSchema.safeParse({
    ...request,
    addressSnapshot: { ...request.addressSnapshot, latitude: 28.45 },
  });
  assert.equal(partialCoordinates.success, false);

  assert.equal(bookingRequestSchema.safeParse({
    ...request,
    searchRadiusKm: 201,
  }).success, false);
});

test("quote-required services accept no fixed price and professional quotes obey customer budgets", () => {
  const service = {
    slug: "bridal-lehenga",
    category: "lehenga_stitching",
    title: "Bridal Lehenga",
    description: "Custom bridal lehenga tailoring.",
    pricingType: "quote_required",
    durationMinutes: 120,
  };
  assert.equal(serviceSchema.safeParse(service).success, true);
  assert.equal(serviceSchema.safeParse({ ...service, pricingType: "fixed" }).success, false);
  assert.equal(validateQuotePrice(500_000, 100_000, 600_000), 500_000);
  assert.throws(() => validateQuotePrice(50, 0, 100_000), { code: "INVALID_QUOTE" });
  assert.throws(() => validateQuotePrice(700_000, 100_000, 600_000), { code: "QUOTE_OUTSIDE_BUDGET" });
  assert.throws(() => validateQuotePrice(Number.MAX_SAFE_INTEGER + 1), { code: "INVALID_QUOTE" });
});
