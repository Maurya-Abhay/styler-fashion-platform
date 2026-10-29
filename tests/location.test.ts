import assert from "node:assert/strict";
import test from "node:test";
import {
  distanceInKilometres,
  isWithinSearchRadius,
  normalizeNominatimAddress,
} from "../src/lib/location";
import { servesWithinRadius } from "../src/lib/matching";

test("distance uses great-circle kilometres and respects radius boundaries", () => {
  const customer = { latitude: 28.45, longitude: 77.02 };
  const nearby = { latitude: 28.49, longitude: 77.02 };
  const distant = { latitude: 28.55, longitude: 77.02 };

  assert.ok(distanceInKilometres(customer, nearby) < 5);
  assert.ok(distanceInKilometres(customer, distant) > 10);
  assert.equal(isWithinSearchRadius(customer, nearby, 5), true);
  assert.equal(isWithinSearchRadius(customer, distant, 10), false);
  assert.equal(isWithinSearchRadius(customer, undefined, 25), false);
  assert.equal(isWithinSearchRadius(customer, nearby, 201), false);
});

test("reverse-geocode normalization supports localities and rejects incomplete addresses", () => {
  const coordinates = { latitude: 28.45, longitude: 77.02 };
  const address = normalizeNominatimAddress({
    address: {
      house_number: "10",
      road: "Main Road",
      city: "Gurugram",
      state: "Haryana",
      postcode: "122001",
      country: "India",
    },
  }, coordinates);

  assert.deepEqual(address, {
    line1: "10 Main Road",
    city: "Gurugram",
    state: "Haryana",
    postalCode: "122001",
    country: "India",
    ...coordinates,
  });
  assert.equal(normalizeNominatimAddress({ address: { country: "India" } }, coordinates), null);
});

test("GPS requests still city-match professionals who have not set coordinates", () => {
  const request = {
    searchRadiusKm: 10,
    addressSnapshot: {
      city: "Gurugram",
      state: "Haryana",
      postalCode: "122001",
      latitude: 28.45,
      longitude: 77.02,
    },
  };
  assert.equal(servesWithinRadius({
    city: "Gurugram",
    state: "Haryana",
    baseLocation: {},
  }, request), true);

  assert.equal(servesWithinRadius({
    city: "Gurugram",
    state: "Haryana",
    baseLocation: { latitude: 28.55, longitude: 77.02 },
  }, request), false);

  assert.equal(servesWithinRadius({
    city: "Delhi",
    state: "Delhi",
    baseLocation: {},
  }, request), false);
});
