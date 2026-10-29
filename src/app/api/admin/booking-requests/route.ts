import BookingRequest from "@/models/BookingRequest";
import { currentUser, paginationFromRequest, withApi } from "@/lib/api-utils";

export const GET = withApi(async (request) => {
  await currentUser(request, ["admin"]);
  const url = new URL(request.url);
  const { page, limit, skip } = paginationFromRequest(request);
  const filter: Record<string, unknown> = {};
  const status = url.searchParams.get("status");
  if (status) filter.status = status;

  const [requests, total] = await Promise.all([
    BookingRequest.find(filter)
      .select("customerId serviceCategory requirements preferredStartAt preferredEndAt requestedDurationMinutes budgetMinPaise budgetMaxPaise searchRadiusKm status offersSentCount offerDeadlineAt noMatchReason createdAt addressSnapshot.city addressSnapshot.state")
      .populate({ path: "customerId", select: "name email" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    BookingRequest.countDocuments(filter),
  ]);

  return {
    items: requests.map((item: any) => ({
      ...item,
      customer: item.customerId,
      customerId: item.customerId?._id ?? item.customerId,
      city: item.addressSnapshot?.city,
      state: item.addressSnapshot?.state,
      addressSnapshot: undefined,
    })),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
});
