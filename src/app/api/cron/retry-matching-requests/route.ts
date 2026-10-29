export const maxDuration = 60;
import { withApi, assertCronSecret } from "@/lib/api-utils";
import BookingRequest from "@/models/BookingRequest";
import { dispatchOffersForRequest } from "@/lib/matching";

export const GET = withApi(async (request) => {
  assertCronSecret(request);
  const pending = await BookingRequest.find({ status: "matching" })
    .sort({ createdAt: 1 })
    .limit(50)
    .select("_id")
    .lean();

  // Keep global matching load bounded; each request itself checks professionals
  // in small concurrent batches, so don't dispatch 50 requests simultaneously.
  let retried = 0;
  let failed = 0;
  const batchSize = 5;
  for (let offset = 0; offset < pending.length; offset += batchSize) {
    const batch = pending.slice(offset, offset + batchSize);
    const results = await Promise.allSettled(
      batch.map((item: any) => dispatchOffersForRequest(String(item._id))),
    );
    retried += results.filter((result) => result.status === "fulfilled").length;
    failed += results.filter((result) => result.status === "rejected").length;
  }
  return { scanned: pending.length, retried, failed };
});

export const POST = GET;
