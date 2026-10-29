import Service from "@/models/Service";
import { serviceSchema, parseOrThrow } from "@/lib/validation";
import { currentUser, readJson, withApi } from "@/lib/api-utils";
import { professionalProfileForUser } from "@/lib/api-domain";
import { AppError } from "@/types";
export const GET = withApi(async (request) => { const auth = await currentUser(request, ["professional"]); const profile = await professionalProfileForUser(auth.userId); const url = new URL(request.url); const filter: Record<string, unknown> = { professionalId: profile._id }; if (url.searchParams.get("includeInactive") !== "true") filter.isActive = true; return Service.find(filter).sort({ createdAt: -1 }).lean(); });
export const POST = withApi(async (request) => { const auth = await currentUser(request, ["professional"]); const profile = await professionalProfileForUser(auth.userId); if (["rejected", "suspended"].includes(profile.applicationStatus)) throw new AppError("Your application cannot add services in its current status.", 403, "APPLICATION_NOT_ACTIVE"); const body = parseOrThrow(serviceSchema, await readJson(request)); const service = await Service.create({ ...body, professionalId: profile._id, isActive: true }); return { service }; });
