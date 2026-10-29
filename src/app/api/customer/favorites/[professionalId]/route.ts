import User from "@/models/User";
import { currentUser, requireId, routeParams, withApi } from "@/lib/api-utils";
import { AppError } from "@/types";

export const DELETE = withApi(async (request, context) => {
  const auth = await currentUser(request, ["customer"]);
  const { professionalId: rawId } = await routeParams(context);
  const professionalId = requireId(rawId, "professionalId");
  const user = await User.findByIdAndUpdate(
    auth.userId,
    { $pull: { favoriteProfessionalIds: professionalId } },
    { new: true },
  ).select("_id").lean();
  if (!user) throw new AppError("User not found.", 404, "USER_NOT_FOUND");

  return { professionalId, isFavorite: false };
});
