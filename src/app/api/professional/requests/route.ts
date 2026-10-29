import ProfessionalProfile from "@/models/ProfessionalProfile";
import BookingOffer from "@/models/BookingOffer";
import BookingRequest from "@/models/BookingRequest";
import Availability from "@/models/Availability";
import Service from "@/models/Service";
import { currentUser, paginationFromRequest, withApi } from "@/lib/api-utils";
import { AppError } from "@/types";
export const GET = withApi(async (request) => {
  const auth = await currentUser(request, ["professional"]);
  const profile = await ProfessionalProfile.findOne({
    userId: auth.userId,
    applicationStatus: "approved",
  }).select("_id baseLocation city state categories").lean();
  if (!profile) {
    throw new AppError("Your professional application must be approved first.", 403, "PROFESSIONAL_NOT_APPROVED");
  }
  const { page, limit, skip } = paginationFromRequest(request);
  const filter = { professionalId: profile._id, status: "sent", expiresAt: { $gt: new Date() } };
  const [offers, total, availability, activeServiceCount] = await Promise.all([
    BookingOffer.find(filter)
      .populate({ path: "serviceId", select: "title pricingType pricePaise" })
      .sort({ sentAt: -1 }).skip(skip).limit(limit).lean(),
    BookingOffer.countDocuments(filter),
    Availability.findOne({ professionalId: profile._id }).select("acceptingRequests weeklySchedule").lean(),
    Service.countDocuments({ professionalId: profile._id, isActive: true }),
  ]);
  const requests = await BookingRequest.find({
    _id: { $in: offers.map((offer: any) => offer.bookingRequestId) },
  }).select("serviceCategory requirements preferredStartAt preferredEndAt requestedDurationMinutes budgetMinPaise budgetMaxPaise searchRadiusKm addressSnapshot referenceImages status offerDeadlineAt").lean();

  return {
    items: offers.map((offer: any) => {
      const req: any = requests.find((item: any) =>
        String(item._id) === String(offer.bookingRequestId));
      return {
        ...offer,
        service: offer.serviceId && typeof offer.serviceId === "object" ? offer.serviceId : null,
        request: req ? {
          id: String(req._id),
          serviceCategory: req.serviceCategory,
          requirements: req.requirements,
          preferredStartAt: req.preferredStartAt,
          preferredEndAt: req.preferredEndAt,
          requestedDurationMinutes: req.requestedDurationMinutes,
          budgetMinPaise: req.budgetMinPaise,
          budgetMaxPaise: req.budgetMaxPaise,
          searchRadiusKm: req.searchRadiusKm ?? 25,
          city: req.addressSnapshot?.city,
          state: req.addressSnapshot?.state,
          postalCode: req.addressSnapshot?.postalCode,
          referenceImages: req.referenceImages,
          offerDeadlineAt: req.offerDeadlineAt,
        } : null,
      };
    }),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    readiness: {
      acceptingRequests: Boolean(availability?.acceptingRequests),
      hasServiceLocation: Boolean(profile.baseLocation?.latitude != null && profile.baseLocation?.longitude != null),
      hasCityAndState: Boolean(profile.city && profile.state),
      activeServiceCount,
      hasAvailabilitySchedule: Boolean(availability?.weeklySchedule?.length),
      categories: profile.categories,
    },
  };
});
