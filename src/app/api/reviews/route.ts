import Review from "@/models/Review";
import Booking from "@/models/Booking";
import { currentUser, readJson, paginationFromRequest, withApi, requireId } from "@/lib/api-utils";
import { reviewSchema } from "@/lib/validation";
import { AppError } from "@/types";
export const GET = withApi(async (request) => { const url = new URL(request.url); const professionalId = url.searchParams.get("professionalId"); const { page, limit, skip } = paginationFromRequest(request); const filter: Record<string, any> = { status: "published" }; if (professionalId) { requireId(professionalId, "professionalId"); filter.professionalId = professionalId; } const [items, total] = await Promise.all([Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate({ path: "customerId", select: "name profileImageUrl" }).lean(), Review.countDocuments(filter)]); return { items, page, limit, total, totalPages: Math.ceil(total / limit) }; });
export const POST = withApi(async (request) => {
  const auth = await currentUser(request, ["customer"]);
  const body = reviewSchema.parse(await readJson(request));
  const booking = await Booking.findOne({
    _id: body.bookingId,
    customerId: auth.userId,
    status: "completed",
  }).lean();
  if (!booking) throw new AppError("A review is only allowed for your completed booking.", 409, "BOOKING_NOT_REVIEWABLE");

  const existing = await Review.findOne({ bookingId: booking._id, customerId: auth.userId });
  if (existing) return existing;

  let review;
  try {
    review = await Review.create({
      bookingId: booking._id,
      customerId: auth.userId,
      professionalId: booking.professionalId,
      rating: body.rating,
      comment: body.comment,
      status: "published",
    });
  } catch (error) {
    if ((error as { code?: number })?.code !== 11000) throw error;
    const concurrentReview = await Review.findOne({ bookingId: booking._id, customerId: auth.userId });
    if (!concurrentReview) throw error;
    return concurrentReview;
  }
  await Booking.updateOne({ _id: booking._id, reviewId: null }, { $set: { reviewId: review._id } });
  return review;
});
