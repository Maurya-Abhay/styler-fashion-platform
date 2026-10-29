import Availability from "@/models/Availability";
import { availabilitySchema, parseOrThrow } from "@/lib/validation";
import { saveAvailabilitySchedule, setAcceptingRequests } from "@/lib/availability";
import { currentUser, readJson, withApi } from "@/lib/api-utils";
import { professionalProfileForUser } from "@/lib/api-domain";
export const GET = withApi(async (request) => { const auth = await currentUser(request, ["professional"]); const profile = await professionalProfileForUser(auth.userId); return Availability.findOne({ professionalId: profile._id }).lean(); });
export const PUT = withApi(async (request) => { const auth = await currentUser(request, ["professional"]); const profile = await professionalProfileForUser(auth.userId); const body = parseOrThrow(availabilitySchema, await readJson(request)); const availability = await saveAvailabilitySchedule({ professionalUserId: auth.userId, timezone: body.timezone, slotIntervalMinutes: body.slotIntervalMinutes, maxAdvanceBookingDays: body.maxAdvanceBookingDays, weeklySchedule: body.weeklySchedule as any, exceptions: body.exceptions as any }); if (profile.applicationStatus === "approved") return setAcceptingRequests(String(profile._id), Boolean(body.acceptingRequests)); return availability; });
