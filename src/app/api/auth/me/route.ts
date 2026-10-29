import { currentUser, withApi } from "@/lib/api-utils";
import { getCurrentUserSafe } from "@/lib/auth";
import ProfessionalProfile from "@/models/ProfessionalProfile";

export const GET = withApi(async (request) => {
  const auth = await currentUser(request);
  const user = await getCurrentUserSafe(auth.userId);
  let professionalStatus: string | undefined;
  if (auth.role === "professional") professionalStatus = (await ProfessionalProfile.findOne({ userId: auth.userId }).select("applicationStatus").lean())?.applicationStatus;
  return { user, professionalStatus, authMethod: auth.authMethod };
});
