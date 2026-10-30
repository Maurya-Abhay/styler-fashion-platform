import assert from "node:assert/strict";
import test from "node:test";
import { CATEGORIES, SERVICE_CATEGORY_IDS } from "../src/lib/categories";
import {
  bookingRequestSchema,
  professionalPayoutAccountSchema,
  reviewSchema,
  savedAddressSchema,
  serviceCategorySchema,
  serviceSchema,
} from "../src/lib/validation";
import { getCancellationRefundDecision, validateQuotePrice } from "../src/lib/booking";

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
  assert.equal(parsed.paymentPreference, "when_accepted");

  const partialCoordinates = bookingRequestSchema.safeParse({
    ...request,
    addressSnapshot: { ...request.addressSnapshot, latitude: 28.45 },
  });
  assert.equal(partialCoordinates.success, false);
  assert.equal(bookingRequestSchema.safeParse({
    ...request,
    paymentPreference: "later",
    addressSnapshot: {
      recipientName: "Test User",
      phone: "+919876543210",
      line1: "Main Road",
      city: "Gurugram",
      state: "Haryana",
      country: "India",
    },
  }).success, true);

  assert.equal(bookingRequestSchema.safeParse({
    ...request,
    searchRadiusKm: 201,
  }).success, false);
});

test("saved addresses accept optional PIN codes but require GPS coordinates as a pair", () => {
  const savedAddress = {
    recipientName: "Priya Sharma",
    phone: "+919876543210",
    line1: "Main Road",
    city: "Gurugram",
    state: "Haryana",
    country: "India",
  };
  assert.equal(savedAddressSchema.safeParse(savedAddress).success, true);
  assert.equal(savedAddressSchema.safeParse({
    ...savedAddress,
    latitude: 28.45,
  }).success, false);
});

test("professional payout details require a valid UPI ID and normalize it", () => {
  assert.deepEqual(professionalPayoutAccountSchema.parse({
    accountHolderName: "Test",
    upiId: "test@hdfc",
  }), {
    accountHolderName: "Test",
    upiId: "test@hdfc",
  });
  assert.deepEqual(professionalPayoutAccountSchema.parse({
    accountHolderName: "  Priya Sharma ",
    upiId: "Priya.Sharma@OKAXIS",
  }), {
    accountHolderName: "Priya Sharma",
    upiId: "priya.sharma@okaxis",
  });
  assert.equal(professionalPayoutAccountSchema.safeParse({
    accountHolderName: "P",
    upiId: "not-a-vpa",
  }).success, false);
  assert.equal(professionalPayoutAccountSchema.safeParse({
    accountHolderName: "Priya Sharma",
    upiId: "priya @bank",
  }).success, false);
});

test("booking reviews require a rating from 1 to 5 and allow an optional comment", () => {
  const review = {
    bookingId: "507f1f77bcf86cd799439011",
    rating: 5,
  };
  assert.deepEqual(reviewSchema.parse(review), { ...review, comment: "" });
  assert.equal(reviewSchema.safeParse({ ...review, rating: 0 }).success, false);
  assert.equal(reviewSchema.safeParse({ ...review, rating: 6 }).success, false);
  assert.equal(reviewSchema.safeParse({ ...review, rating: 3.5 }).success, false);
});

test("cancellation refunds follow the configured cutoff and review policy", () => {
  assert.deepEqual(getCancellationRefundDecision({
    paymentStatus: "captured",
    freeCancellation: true,
    refundMode: "full_before_cutoff",
  }), { refundRequired: true, refundReviewRequired: false });
  assert.deepEqual(getCancellationRefundDecision({
    paymentStatus: "partially_refunded",
    freeCancellation: true,
    refundMode: "full_before_cutoff",
  }), { refundRequired: true, refundReviewRequired: false });
  assert.deepEqual(getCancellationRefundDecision({
    paymentStatus: "captured",
    freeCancellation: false,
    refundMode: "full_before_cutoff",
  }), { refundRequired: false, refundReviewRequired: false });
  assert.deepEqual(getCancellationRefundDecision({
    paymentStatus: "captured",
    freeCancellation: true,
    refundMode: "manual_review",
  }), { refundRequired: false, refundReviewRequired: true });
  assert.deepEqual(getCancellationRefundDecision({
    paymentStatus: "refund_pending",
    hasPendingRefund: true,
    freeCancellation: true,
    refundMode: "manual_review",
  }), { refundRequired: false, refundReviewRequired: false });
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
