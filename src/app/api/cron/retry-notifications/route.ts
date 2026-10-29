export const maxDuration = 60;
import { withApi, assertCronSecret } from "@/lib/api-utils";
import { processQueuedNotificationDeliveries } from "@/lib/notifications";

export const GET = withApi(async (request) => {
  assertCronSecret(request);
  return processQueuedNotificationDeliveries({ limit: 100, concurrency: 5 });
});

export const POST = GET;
