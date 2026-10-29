import { z } from "zod";
import { currentUser, readJson, withApi } from "@/lib/api-utils";
import { savePushSubscription, deactivatePushSubscription } from "@/lib/web-push";
const schema = z.object({ endpoint: z.string().url().max(3000), keys: z.object({ p256dh: z.string().min(1).max(500), auth: z.string().min(1).max(500) }), expirationTime: z.coerce.date().nullable().optional() });
export const GET = withApi(async (request) => { await currentUser(request); const publicKey = process.env.WEB_PUSH_PUBLIC_KEY; if (!publicKey) throw new Error("WEB_PUSH_PUBLIC_KEY is not configured."); return { publicKey }; });
export const POST = withApi(async (request) => { const auth = await currentUser(request); const body = schema.parse(await readJson(request)); return savePushSubscription({ userId: auth.userId, endpoint: body.endpoint, keys: body.keys, userAgent: request.headers.get("user-agent") ?? undefined, expirationTime: body.expirationTime ?? null }); });
export const DELETE = withApi(async (request) => { const auth = await currentUser(request); const body = await readJson(request); const endpoint = z.string().url().max(3000).parse(body.endpoint); return { deactivated: await deactivatePushSubscription({ userId: auth.userId, endpoint }) }; });
