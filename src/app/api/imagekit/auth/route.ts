import { z } from "zod";
import { currentUser, readJson, withApi } from "@/lib/api-utils";
import { generateImageKitUploadAuth, validateImageUpload } from "@/lib/imagekit";
import { AppError } from "@/types";
import { enforceRateLimit } from "@/lib/rate-limit";
const schema = z.object({ purpose: z.enum(["portfolio", "profile", "private_document"]), mimeType: z.string().min(1).max(100), sizeBytes: z.number().int().min(1).max(25 * 1024 * 1024) });
export const POST = withApi(async (request) => { const auth = await currentUser(request, ["professional", "customer"]); await enforceRateLimit({ key: `imagekit-auth:${auth.userId}`, limit: 120, windowMs: 60 * 60_000 }); const body = schema.parse(await readJson(request)); if (auth.role === "customer" && body.purpose === "private_document") throw new AppError("Customers cannot upload professional verification documents.", 403, "FORBIDDEN"); validateImageUpload({ purpose: body.purpose, mimeType: body.mimeType, sizeBytes: body.sizeBytes }); return generateImageKitUploadAuth(); });
