import User from "@/models/User";
import { currentUser, readJson, withApi } from "@/lib/api-utils";
import { AppError } from "@/types";
import { z } from "zod";
import { httpUrlSchema } from "@/lib/validation";
const profileSchema = z.object({ name: z.string().trim().min(2).max(100).optional(), profileImageUrl: httpUrlSchema.optional().or(z.literal("")) }).refine((v) => Object.keys(v).length > 0, "At least one field is required.");
export const GET = withApi(async (request) => { const auth = await currentUser(request); const user = await User.findById(auth.userId).select("name email phone role emailVerifiedAt profileImageUrl savedAddresses createdAt updatedAt").lean(); if (!user) throw new AppError("User not found.", 404, "USER_NOT_FOUND"); return user; });
export const PATCH = withApi(async (request) => { const auth = await currentUser(request, ["customer"]); const body = profileSchema.parse(await readJson(request)); const update: Record<string, unknown> = {}; if (body.name !== undefined) update.name = body.name; if (body.profileImageUrl !== undefined) update.profileImageUrl = body.profileImageUrl || undefined; const user = await User.findByIdAndUpdate(auth.userId, { $set: update }, { new: true, runValidators: true }).select("name email phone role emailVerifiedAt profileImageUrl savedAddresses updatedAt").lean(); if (!user) throw new AppError("User not found.", 404, "USER_NOT_FOUND"); return user; });
