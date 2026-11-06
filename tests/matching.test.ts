import assert from "node:assert/strict";
import test from "node:test";
import { isEligibleProfessional } from "../src/lib/matching";

const request = {
  customerId: "customer-1",
  serviceCategory: "makeup",
};

const profile = {
  userId: "professional-1",
  applicationStatus: "approved",
  categories: ["makeup"],
};

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

test("booking offers exclude the requester and require the selected service category", () => {
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
    categories: ["hair_styling"],
  }, {
    _id: "professional-1",
    role: "professional",
    accountStatus: "active",
  }, request), false);
});
