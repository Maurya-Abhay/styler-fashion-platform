import assert from "node:assert/strict";
import test from "node:test";
import { isBookableServiceForCategory, isEligibleProfessional } from "../src/lib/matching";

const request = {
  customerId: "customer-1",
  serviceCategory: "makeup",
};

const profile = {
  userId: "professional-1",
  applicationStatus: "approved",
};

test("matching starts with an active bookable service in the selected category", () => {
  assert.equal(isBookableServiceForCategory({
    category: "makeup",
    isActive: true,
    pricingType: "fixed",
    pricePaise: 250000,
  }, "makeup"), true);

  assert.equal(isBookableServiceForCategory({
    category: "hair_styling",
    isActive: true,
    pricingType: "fixed",
    pricePaise: 250000,
  }, "makeup"), false);

  assert.equal(isBookableServiceForCategory({
    category: "makeup",
    isActive: false,
    pricingType: "quote_required",
  }, "makeup"), false);
});

test("booking offers are only eligible for active professional accounts", () => {
  assert.equal(isEligibleProfessional(profile, {
    _id: "professional-1",
    role: "professional",
    accountStatus: "active",
  }, request), true);

  assert.equal(isEligibleProfessional(profile, {
    _id: "professional-1",
    role: "customer",
    accountStatus: "active",
  }, request), false);

  assert.equal(isEligibleProfessional(profile, {
    _id: "professional-1",
    role: "professional",
    accountStatus: "disabled",
  }, request), false);
});

test("booking offers exclude the requester and defer service-category matching to active listings", () => {
  assert.equal(isEligibleProfessional({
    ...profile,
    userId: "customer-1",
  }, {
    _id: "customer-1",
    role: "customer",
    accountStatus: "active",
  }, request), false);

  assert.equal(isEligibleProfessional({
    ...profile,
  }, {
    _id: "professional-1",
    role: "professional",
    accountStatus: "active",
  }, request), true);
});
