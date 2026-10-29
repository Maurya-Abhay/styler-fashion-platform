import ProfessionalProfile from "@/models/ProfessionalProfile";
import Service from "@/models/Service";
import Payout from "@/models/Payout";
import { currentUser, routeParams, requireId, withApi } from "@/lib/api-utils";
import { AppError } from "@/types";
export const GET = withApi(async (request, context) => { await currentUser(request, ["admin"]); const { id } = await routeParams(context); requireId(id, "profileId"); const profile = await ProfessionalProfile.findById(id).populate({ path: "userId", select: "name email phone accountStatus createdAt" }).lean(); if (!profile) throw new AppError("Professional not found.", 404, "PROFESSIONAL_NOT_FOUND"); const [services, payouts] = await Promise.all([Service.find({ professionalId: profile._id }).lean(), Payout.find({ professionalId: profile._id }).sort({ createdAt: -1 }).limit(20).lean()]); return { profile, services, payouts }; });
