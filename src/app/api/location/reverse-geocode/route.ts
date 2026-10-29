import { z } from "zod";
import { currentUser, readJson, withApi } from "@/lib/api-utils";
import { enforceRateLimit } from "@/lib/rate-limit";
import { normalizeNominatimAddress } from "@/lib/location";
import { SITE_URL } from "@/lib/site-url";
import { AppError } from "@/types";

const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const POST = withApi(async (request) => {
  const user = await currentUser(request, ["customer", "professional"]);
  await enforceRateLimit({
    key: `reverse-geocode:user:${user.userId}`,
    limit: 10,
    windowMs: 60_000,
  });
  await enforceRateLimit({
    key: "reverse-geocode:nominatim:global",
    limit: 1,
    windowMs: 1_000,
  });

  const coordinates = coordinatesSchema.parse(await readJson(request));
  const params = new URLSearchParams({
    format: "jsonv2",
    addressdetails: "1",
    zoom: "18",
    lat: String(coordinates.latitude),
    lon: String(coordinates.longitude),
  });
  let response: Response;
  try {
    response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": `Styler/1.0 (${SITE_URL})`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (cause) {
    console.error("OpenStreetMap reverse-geocoding request failed", {
      error: cause instanceof Error ? cause.message : "Unknown error",
    });
    throw new AppError("Address lookup is temporarily unavailable. Enter your address manually.", 503, "GEOCODING_UNAVAILABLE");
  }

  if (!response.ok) {
    throw new AppError("Address lookup is temporarily unavailable. Enter your address manually.", 503, "GEOCODING_UNAVAILABLE");
  }

  const result = await response.json() as Parameters<typeof normalizeNominatimAddress>[0];
  const address = normalizeNominatimAddress(result, coordinates);
  if (!address) {
    throw new AppError("Could not identify a complete address at this location. Please enter it manually.", 422, "ADDRESS_NOT_FOUND");
  }
  return address;
});
