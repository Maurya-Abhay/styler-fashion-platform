export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type ReverseGeocodedAddress = {
  line1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
};

type NominatimResult = {
  address?: {
    house_number?: string;
    road?: string;
    pedestrian?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
};

export function normalizeNominatimAddress(
  result: NominatimResult,
  coordinates: Coordinates,
): ReverseGeocodedAddress | null {
  const address = result.address;
  const locality = address?.city
    || address?.town
    || address?.village
    || address?.municipality
    || address?.suburb
    || "";
  const street = [address?.house_number, address?.road || address?.pedestrian]
    .filter(Boolean)
    .join(" ");

  if (!address || !locality || !address.state || !address.postcode) {
    return null;
  }

  return {
    line1: street || address.neighbourhood || address.suburb || locality,
    city: locality,
    state: address.state,
    postalCode: address.postcode,
    country: address.country || "India",
    ...coordinates,
  };
}

export function getCurrentCoordinates(): Promise<Coordinates> {
  if (!navigator.geolocation) {
    return Promise.reject(new Error("Location services are not available in this browser."));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({
        latitude: coords.latitude,
        longitude: coords.longitude,
      }),
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? "Location permission was denied. Enter your address manually or allow location access."
          : error.code === error.POSITION_UNAVAILABLE
            ? "Your location could not be determined. Try again or enter your address manually."
            : "Location lookup timed out. Try again or enter your address manually.";
        reject(new Error(message));
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  });
}

export async function reverseGeocode(
  coordinates: Coordinates,
): Promise<ReverseGeocodedAddress> {
  const response = await fetch("/api/location/reverse-geocode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(coordinates),
  });
  const payload = await response.json() as {
    success?: boolean;
    data?: ReverseGeocodedAddress;
    error?: { message?: string };
  };
  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.error?.message || "Address lookup is temporarily unavailable. Enter your address manually.");
  }
  return payload.data;
}

export function distanceInKilometres(from: Coordinates, to: Coordinates) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const rawValue = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(from.latitude))
    * Math.cos(radians(to.latitude))
    * Math.sin(longitudeDelta / 2) ** 2;
  const value = Math.min(1, Math.max(0, rawValue));

  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function isWithinSearchRadius(
  customer: Coordinates,
  professional: Coordinates | null | undefined,
  radiusKm: number,
) {
  if (
    !professional
    || !Number.isFinite(radiusKm)
    || radiusKm < 1
    || radiusKm > 200
  ) {
    return false;
  }
  return distanceInKilometres(customer, professional) <= radiusKm;
}
