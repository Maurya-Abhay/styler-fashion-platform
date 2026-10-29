import BookingRequest from "@/models/BookingRequest";
import BookingOffer from "@/models/BookingOffer";
import ProfessionalProfile from "@/models/ProfessionalProfile";
import Service from "@/models/Service";
import Availability from "@/models/Availability";
import { findAvailableStartTimes } from "@/lib/availability";
import { calculatePriceBreakdown, getPlatformSettings } from "@/lib/commission";
import { notifyUser } from "@/lib/notifications";
import { distanceInKilometres, isWithinSearchRadius } from "@/lib/location";
import { AppError } from "@/types";

function sameText(a?: string | null, b?: string | null): boolean {
  return Boolean(a && b && a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase());
}

function servesAddress(profile: any, address: any): boolean {
  const primaryCityMatches = sameText(profile.city, address.city) && sameText(profile.state, address.state);
  const serviceAreaMatches = (profile.serviceAreas ?? []).some((area: any) => {
    if (!sameText(area.city, address.city) || !sameText(area.state, address.state)) return false;
    return !area.postalCodes?.length || area.postalCodes.includes(address.postalCode);
  });
  return primaryCityMatches || serviceAreaMatches;
}

export function servesWithinRadius(profile: any, request: any): boolean {
  const address = request.addressSnapshot;
  if (typeof address?.latitude === "number" && typeof address?.longitude === "number") {
    const location = profile.baseLocation;
    if (
      typeof location?.latitude === "number"
      && typeof location?.longitude === "number"
    ) {
      return isWithinSearchRadius(address, location, Number(request.searchRadiusKm ?? 25));
    }
  }
  return servesAddress(profile, address);
}

export interface MatchCandidate {
  profile: any;
  service: any;
  startAt: Date;
  endAt: Date;
  quotePaise: number;
}

export async function findMatchingProfessionals(requestId: string): Promise<MatchCandidate[]> {
  const request = await BookingRequest.findById(requestId).lean();
  if (!request) throw new AppError("Booking request not found.", 404, "REQUEST_NOT_FOUND");
  const profiles = await ProfessionalProfile.find({
    applicationStatus: "approved",
    categories: request.serviceCategory,
  }).select("_id userId categories city state postalCode serviceAreas baseLocation updatedAt").sort({ updatedAt: -1 }).lean();
  if (!profiles.length) return [];
  const locationMatches = profiles.filter((profile: any) => servesWithinRadius(profile, request));
  if (!locationMatches.length) return [];
  const requestCoordinates = request.addressSnapshot?.latitude != null
    && request.addressSnapshot?.longitude != null
    ? request.addressSnapshot
    : null;
  if (requestCoordinates) {
    locationMatches.sort((a: any, b: any) => {
      const aHasCoordinates = Number.isFinite(a.baseLocation?.latitude)
        && Number.isFinite(a.baseLocation?.longitude);
      const bHasCoordinates = Number.isFinite(b.baseLocation?.latitude)
        && Number.isFinite(b.baseLocation?.longitude);
      if (aHasCoordinates !== bHasCoordinates) return aHasCoordinates ? -1 : 1;
      if (!aHasCoordinates || !bHasCoordinates) return 0;
      return distanceInKilometres(requestCoordinates, a.baseLocation)
        - distanceInKilometres(requestCoordinates, b.baseLocation);
    });
  }
  const profilePriority = new Map<string, number>(
    locationMatches.map((profile: any, index: number): [string, number] => [
      String(profile._id),
      index,
    ]),
  );
  const profileIds = locationMatches.map((profile: any) => profile._id);
  const [services, availabilityDocs, settings] = await Promise.all([
    Service.find({
      professionalId: { $in: profileIds },
      category: request.serviceCategory,
      isActive: true,
      $or: [
        { pricingType: { $in: ["fixed", "starting_from"] }, pricePaise: { $gte: 1 } },
        { pricingType: "quote_required" },
      ],
    }).sort({ createdAt: -1 }).lean(),
    Availability.find({ professionalId: { $in: profileIds }, acceptingRequests: true }).lean(),
    getPlatformSettings(),
  ]);
  if (requestCoordinates) {
    services.sort((a: any, b: any) =>
      (profilePriority.get(String(a.professionalId)) ?? Number.MAX_SAFE_INTEGER)
      - (profilePriority.get(String(b.professionalId)) ?? Number.MAX_SAFE_INTEGER),
    );
  }
  const profileMap = new Map(locationMatches.map((profile: any) => [String(profile._id), profile]));
  const availabilityByProfessional = new Map<string, any>(
    availabilityDocs.map((item: any) => [String(item.professionalId), item]),
  );

  // One request creates at most one offer per professional. A pro may have
  // several active listings in the same category, so try listings in order
  // until one has an available slot rather than letting the newest blocked
  // listing hide another valid service.
  const serviceOptionsByProfessional = new Map<string, any[]>();
  for (const service of services) {
    const professionalId = String(service.professionalId);
    if (!availabilityByProfessional.has(professionalId)) continue;
    const needsQuote = service.pricingType === "quote_required";
    const price = needsQuote ? 0 : Number(service.pricePaise);
    if (!needsQuote && request.budgetMinPaise != null && price < request.budgetMinPaise) continue;
    if (!needsQuote && request.budgetMaxPaise != null && price > request.budgetMaxPaise) continue;
    const options = serviceOptionsByProfessional.get(professionalId) ?? [];
    // Limit duplicate listings from a single pro so malformed/overloaded catalogues
    // cannot consume unlimited scheduling queries for a single incoming request.
    if (options.length < 8) options.push(service);
    serviceOptionsByProfessional.set(professionalId, options);
  }

  const eligibleProfessionalIds = [...serviceOptionsByProfessional.keys()].sort((a, b) => {
    const priorityDifference = (profilePriority.get(a) ?? Number.MAX_SAFE_INTEGER)
      - (profilePriority.get(b) ?? Number.MAX_SAFE_INTEGER);
    if (priorityDifference !== 0) return priorityDifference;
    return a.localeCompare(b);
  });
  const candidates: MatchCandidate[] = [];
  const maxCandidates = Math.min(10, Math.max(1, Number(settings.maxOffersPerRequest) || 10), Math.max(1, Number(request.maxOffers) || 10));
  const batchSize = 10;

  // Check a bounded batch of professionals concurrently. Each professional's
  // listings are checked in order and the first available listing is selected.
  // Preloaded availability documents eliminate an extra query per professional.
  for (let offset = 0; offset < eligibleProfessionalIds.length && candidates.length < maxCandidates; offset += batchSize) {
    const batch = eligibleProfessionalIds.slice(offset, offset + batchSize);
    const checked = await Promise.all(batch.map(async (professionalId) => {
      const profile = profileMap.get(professionalId);
      const availability = availabilityByProfessional.get(professionalId);
      const options = serviceOptionsByProfessional.get(professionalId) ?? [];
      if (!profile || !availability) return null;
      for (const service of options) {
        const starts = await findAvailableStartTimes({
          professionalId,
          availabilityRecord: availability,
          windowStart: new Date(request.preferredStartAt),
          windowEnd: new Date(request.preferredEndAt),
          durationMinutes: Number(service.durationMinutes),
          bufferMinutes: Number(service.travelBufferMinutes ?? settings.defaultTravelBufferMinutes),
          maxResults: 1,
        });
        if (!starts.length) continue;
        return {
          profile,
          service,
          startAt: starts[0],
          endAt: new Date(starts[0].getTime() + Number(service.durationMinutes) * 60_000),
          quotePaise: service.pricingType === "quote_required" ? 0 : Number(service.pricePaise),
        } satisfies MatchCandidate;
      }
      return null;
    }));
    for (const candidate of checked) {
      if (!candidate) continue;
      candidates.push(candidate);
      if (candidates.length >= maxCandidates) break;
    }
  }
  return candidates;
}

async function explainNoMatch(request: any): Promise<string> {
  const categoryProfiles = await ProfessionalProfile.find({
    applicationStatus: "approved",
    categories: request.serviceCategory,
  }).select("_id city state serviceAreas baseLocation").lean();
  if (!categoryProfiles.length) {
    return "No approved professional currently offers this service category. Try again later or choose another category.";
  }

  const localProfiles = categoryProfiles.filter((profile: any) =>
    servesWithinRadius(profile, request));
  if (!localProfiles.length) {
    const hasCoordinates = typeof request.addressSnapshot?.latitude === "number"
      && typeof request.addressSnapshot?.longitude === "number";
    return hasCoordinates
      ? `No professional with a matching service category is within ${Number(request.searchRadiusKm ?? 25)} km of the selected location. Try a wider radius or another service area.`
      : "No professional with a matching service category serves the selected city and postal code. Try another location.";
  }

  const profileIds = localProfiles.map((profile: any) => profile._id);
  const activeServices = await Service.find({
    professionalId: { $in: profileIds },
    category: request.serviceCategory,
    isActive: true,
    $or: [
      { pricingType: { $in: ["fixed", "starting_from"] }, pricePaise: { $gte: 1 } },
      { pricingType: "quote_required" },
    ],
  }).select("professionalId pricingType pricePaise").lean();
  if (!activeServices.length) {
    return "Nearby approved professionals do not have an active listing for this service category yet.";
  }

  const availability = await Availability.find({
    professionalId: { $in: profileIds },
    acceptingRequests: true,
  }).select("professionalId").lean();
  const acceptingIds = new Set(availability.map((item: any) => String(item.professionalId)));
  const acceptingServices = activeServices.filter((service: any) =>
    acceptingIds.has(String(service.professionalId)));
  if (!acceptingServices.length) {
    return "Nearby professionals have matching services, but none are currently accepting new requests.";
  }

  const withinBudget = acceptingServices.filter((service: any) => {
    if (service.pricingType === "quote_required") return true;
    const price = Number(service.pricePaise);
    return (request.budgetMinPaise == null || price >= request.budgetMinPaise)
      && (request.budgetMaxPaise == null || price <= request.budgetMaxPaise);
  });
  if (!withinBudget.length) {
    return "Nearby active services are outside the budget range you selected. Adjust your budget and try again.";
  }
  return "No professional has an available time slot in the selected time window. Try a different date or time.";
}

export async function dispatchOffersForRequest(requestId: string) {
  const request = await BookingRequest.findOne({ _id: requestId, status: "matching" });
  if (!request) throw new AppError("Booking request is not in a matching state.", 409, "REQUEST_NOT_MATCHABLE");
  const settings = await getPlatformSettings();
  const candidates = await findMatchingProfessionals(requestId);
  if (!candidates.length) {
    const noMatchReason = await explainNoMatch(request);
    await BookingRequest.updateOne({ _id: request._id, status: "matching" }, {
      $set: { status: "no_match", noMatchReason },
    });
    await notifyUser({
      recipientUserId: String(request.customerId), type: "system_message", title: "No professional available yet",
      message: noMatchReason,
      channels: ["in_app", "email"], dedupeKey: `request-no-match:${requestId}`,
    }).catch((error) => console.error("Unable to queue no-match notification", error instanceof Error ? error.message : "Unknown error"));
    return { requestId, offersCreated: 0, status: "no_match" as const };
  }

  const now = new Date();
  const deadline = new Date(now.getTime() + settings.offerWindowMinutes * 60_000);
  const offerCandidates = candidates.slice(0, Math.min(10, Math.max(1, settings.maxOffersPerRequest), Math.max(1, request.maxOffers)));
  // Price calculation for the (at most 10) winning candidates runs concurrently;
  // this removes another serial round-trip chain from the user-facing request.
  const offers: Array<Record<string, any>> = await Promise.all(offerCandidates.map(async (candidate) => {
    const isQuoteRequired = candidate.service.pricingType === "quote_required";
    const breakdown = isQuoteRequired
      ? null
      : await calculatePriceBreakdown({ servicePricePaise: candidate.quotePaise, professionalProfileId: String(candidate.profile._id) });
    return {
      bookingRequestId: request._id,
      professionalId: candidate.profile._id,
      serviceId: candidate.service._id,
      quotedPricePaise: candidate.quotePaise,
      customerFeePaise: breakdown?.customerPlatformFeePaise ?? 0,
      commissionPercent: breakdown?.commissionPercent ?? 0,
      commissionPaise: breakdown?.commissionPaise ?? 0,
      professionalPayoutPaise: breakdown?.professionalPayoutPaise ?? 0,
      settingsVersion: breakdown?.settingsVersion ?? settings.settingsVersion,
      currency: "INR",
      proposedStartAt: candidate.startAt,
      proposedEndAt: candidate.endAt,
      status: "sent",
      sentAt: now,
      expiresAt: deadline,
    };
  }));

  // Unique index on (bookingRequestId, professionalId) and status compare prevent duplicate dispatch.
  const session = await BookingOffer.startSession();
  let createdOffers: any[] = [];
  try {
    await session.withTransaction(async () => {
      const current = await BookingRequest.findOne({ _id: request._id, status: "matching" }).session(session);
      if (!current) throw new AppError("This request has already been dispatched.", 409, "REQUEST_ALREADY_DISPATCHED");
      createdOffers = await BookingOffer.insertMany(offers, { session, ordered: true });
      current.status = "offers_sent";
      current.offersSentCount = createdOffers.length;
      current.offerDeadlineAt = deadline;
      await current.save({ session });
    });
  } finally {
    await session.endSession();
  }

  const delivery = await Promise.allSettled(createdOffers.map(async (offer) => {
    const profile = candidates.find((candidate) => String(candidate.profile._id) === String(offer.professionalId))?.profile;
    if (!profile) return;
    await notifyUser({
      recipientUserId: String(profile.userId), type: "booking_request_received", title: "New Styler booking request",
      message: `A customer request matches your ${request.serviceCategory.replaceAll("_", " ")} service. Open Styler to review the time and price and accept or reject it.`,
      channels: ["in_app", "email", "web_push"],
      data: { requestId: String(request._id), offerId: String(offer._id), expiresAt: deadline.toISOString() },
      dedupeKey: `booking-offer:${String(offer._id)}`,
    });
  }));
  const notificationFailures = delivery.filter((result) => result.status === "rejected").length;
  return { requestId, offersCreated: createdOffers.length, expiresAt: deadline, notificationFailures, status: "offers_sent" as const };
}

export async function expireOldOffers(now = new Date()): Promise<number> {
  const expiredRequests = await BookingRequest.find({ status: "offers_sent", offerDeadlineAt: { $lte: now } }).select("_id customerId").lean();
  let count = 0;
  for (const request of expiredRequests) {
    const session = await BookingOffer.startSession();
    let changed = false;
    try {
      await session.withTransaction(async () => {
        const updated = await BookingRequest.updateOne({ _id: request._id, status: "offers_sent", offerDeadlineAt: { $lte: now } }, {
          $set: { status: "expired", noMatchReason: "No professional accepted before the request deadline." },
        }, { session });
        if (!updated.modifiedCount) return;
        await BookingOffer.updateMany({ bookingRequestId: request._id, status: "sent" }, { $set: { status: "expired", respondedAt: now, closeReason: "Request deadline passed." } }, { session });
        changed = true;
      });
    } finally { await session.endSession(); }
    if (changed) {
      count++;
      await notifyUser({
        recipientUserId: String(request.customerId), type: "system_message", title: "Request expired",
        message: "No professional accepted within 10 minutes. You can submit a new request with another time.",
        channels: ["in_app", "email"], dedupeKey: `request-expired:${String(request._id)}`,
      }).catch((error) => console.error("Unable to notify request expiry", error));
    }
  }
  return count;
}
