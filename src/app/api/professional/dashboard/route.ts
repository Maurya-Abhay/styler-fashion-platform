import Booking from "@/models/Booking";
import BookingOffer from "@/models/BookingOffer";
import BookingRequest from "@/models/BookingRequest";
import Availability from "@/models/Availability";
import Payout from "@/models/Payout";
import ProfessionalProfile from "@/models/ProfessionalProfile";
import Review from "@/models/Review";
import Service from "@/models/Service";
import User from "@/models/User";
import { currentUser, withApi } from "@/lib/api-utils";
import { AppError } from "@/types";

function istDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export const GET = withApi(async (request) => {
  const auth = await currentUser(request, ["professional"]);
  const profile = await ProfessionalProfile.findOne({ userId: auth.userId })
    .select("_id displayName applicationStatus profilePhoto baseLocation city state categories")
    .lean();
  if (!profile) throw new AppError("Professional profile not found.", 404, "PROFILE_NOT_FOUND");
  const now = new Date();
  const weekStart = new Date(`${istDateKey(now)}T00:00:00+05:30`);
  weekStart.setDate(weekStart.getDate() - 6);
  const statuses = ["confirmed", "in_progress"];
  const offerFilter = { professionalId: profile._id, status: "sent", expiresAt: { $gt: now } };
  const [user, offerTotal, offers, bookingTotal, upcomingBookings, payoutStats, payoutTrend, reviewStats, activeServiceCount, availability] = await Promise.all([
    User.findById(auth.userId).select("name profileImageUrl").lean(),
    BookingOffer.countDocuments(offerFilter),
    BookingOffer.find(offerFilter)
      .populate({ path: "serviceId", select: "title pricingType pricePaise" })
      .sort({ sentAt: -1 })
      .limit(5)
      .lean(),
    Booking.countDocuments({ professionalId: profile._id }),
    Booking.find({
      professionalId: profile._id,
      status: { $in: statuses },
      $or: [{ status: "in_progress" }, { startAt: { $gte: now } }],
    }).sort({ startAt: 1 }).limit(5).lean(),
    Payout.aggregate([
      { $match: { professionalId: profile._id } },
      {
        $group: {
          _id: null,
          paidPaise: { $sum: { $cond: [{ $eq: ["$status", "transferred"] }, "$amountPaise", 0] } },
          pendingPaise: { $sum: { $cond: [{ $in: ["$status", ["pending", "on_hold", "processing", "failed"]] }, "$amountPaise", 0] } },
          transferredCount: { $sum: { $cond: [{ $eq: ["$status", "transferred"] }, 1, 0] } },
          pendingCount: { $sum: { $cond: [{ $in: ["$status", ["pending", "on_hold", "processing", "failed"]] }, 1, 0] } },
        },
      },
    ]),
    Payout.aggregate([
      { $match: { professionalId: profile._id, status: "transferred", transferredAt: { $gte: weekStart } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$transferredAt", timezone: "Asia/Kolkata" } },
          amountPaise: { $sum: "$amountPaise" },
        },
      },
    ]),
    Review.aggregate([
      { $match: { professionalId: profile._id, status: "published" } },
      { $group: { _id: null, averageRating: { $avg: "$rating" }, reviewCount: { $sum: 1 } } },
    ]),
    Service.countDocuments({ professionalId: profile._id, isActive: true }),
    Availability.findOne({ professionalId: profile._id }).select("acceptingRequests weeklySchedule").lean(),
  ]);

  const requestRecords = await BookingRequest.find({
    _id: { $in: offers.map((offer: any) => offer.bookingRequestId) },
  })
    .select("serviceCategory requirements preferredStartAt preferredEndAt requestedDurationMinutes budgetMinPaise budgetMaxPaise searchRadiusKm addressSnapshot referenceImages status offerDeadlineAt")
    .lean();
  const mappedOffers = offers.map((offer: any) => {
    const requestRecord: any = requestRecords.find((item: any) =>
      String(item._id) === String(offer.bookingRequestId),
    );
    return {
      ...offer,
      service: offer.serviceId && typeof offer.serviceId === "object" ? offer.serviceId : null,
      request: requestRecord ? {
        id: String(requestRecord._id),
        serviceCategory: requestRecord.serviceCategory,
        requirements: requestRecord.requirements,
        preferredStartAt: requestRecord.preferredStartAt,
        preferredEndAt: requestRecord.preferredEndAt,
        requestedDurationMinutes: requestRecord.requestedDurationMinutes,
        budgetMinPaise: requestRecord.budgetMinPaise,
        budgetMaxPaise: requestRecord.budgetMaxPaise,
        searchRadiusKm: requestRecord.searchRadiusKm ?? 25,
        city: requestRecord.addressSnapshot?.city,
        state: requestRecord.addressSnapshot?.state,
        postalCode: requestRecord.addressSnapshot?.postalCode,
        referenceImages: requestRecord.referenceImages,
        offerDeadlineAt: requestRecord.offerDeadlineAt,
      } : null,
    };
  });
  const trendByDay = new Map(payoutTrend.map((item: any) => [item._id, Number(item.amountPaise)]));
  const chartDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (6 - index));
    date.setHours(12, 0, 0, 0);
    return { date, amount: trendByDay.get(istDateKey(date)) ?? 0 };
  });
  const payoutSummary = payoutStats[0] ?? { paidPaise: 0, pendingPaise: 0, transferredCount: 0, pendingCount: 0 };
  const reviewSummary = reviewStats[0] ?? { averageRating: null, reviewCount: 0 };
  return {
    user,
    profile: {
      ...profile,
      rating: reviewSummary.averageRating,
      reviewCount: reviewSummary.reviewCount,
    },
    offers: mappedOffers,
    requestTotal: offerTotal,
    bookings: upcomingBookings,
    bookingTotal,
    earnings: {
      summary: {
        paidPaise: payoutSummary.paidPaise,
        pendingPaise: payoutSummary.pendingPaise,
        transferredCount: payoutSummary.transferredCount,
        pendingCount: payoutSummary.pendingCount,
      },
    },
    chartDays,
    accepting: Boolean(availability?.acceptingRequests),
    readiness: {
      hasServiceLocation: profile.baseLocation?.latitude != null && profile.baseLocation?.longitude != null,
      activeServiceCount,
      hasAvailabilitySchedule: Boolean(availability?.weeklySchedule?.length),
      acceptingRequests: Boolean(availability?.acceptingRequests),
    },
  };
});
