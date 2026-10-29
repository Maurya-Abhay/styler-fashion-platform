import ProfessionalProfile from "@/models/ProfessionalProfile";
import Service from "@/models/Service";
import Availability from "@/models/Availability";
import { currentUser, routeParams, requireId, withApi } from "@/lib/api-utils";
import { AppError } from "@/types";
export const GET = withApi(async (request, context) => { await currentUser(request, ["admin"]); const { id } = await routeParams(context); requireId(id, "profileId"); const profile = await ProfessionalProfile.findById(id).populate({ path: "userId", select: "name email phone accountStatus createdAt" }).lean(); if (!profile) throw new AppError("Application not found.", 404, "APPLICATION_NOT_FOUND"); const [services, availability] = await Promise.all([Service.find({ professionalId: profile._id }).lean(), Availability.findOne({ professionalId: profile._id }).lean()]); return { profile, services, availability }; });
