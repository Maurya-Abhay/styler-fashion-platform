import Service from "@/models/Service";
import ProfessionalProfile from "@/models/ProfessionalProfile";
import { withApi, routeParams, requireId } from "@/lib/api-utils";
import { AppError } from "@/types";

export const GET = withApi(async (_request, context) => {
  const { serviceId } = await routeParams(context); requireId(serviceId, "serviceId");
  const service = await Service.findOne({ _id: serviceId, isActive: true }).lean();
  if (!service) throw new AppError("Service not found.", 404, "SERVICE_NOT_FOUND");
  const professional = await ProfessionalProfile.findOne({ _id: service.professionalId, applicationStatus: "approved" }).select("slug displayName bio profilePhoto city state experienceYears categories").lean();
  if (!professional) throw new AppError("Service not found.", 404, "SERVICE_NOT_FOUND");
  return { ...service, professional };
});
