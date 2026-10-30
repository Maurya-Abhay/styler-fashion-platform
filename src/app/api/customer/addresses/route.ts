import User from "@/models/User";
import { savedAddressSchema, parseOrThrow } from "@/lib/validation";
import { currentUser, readJson, withApi } from "@/lib/api-utils";
import { AppError } from "@/types";
import { z } from "zod";
const schema = z.object({ address: savedAddressSchema, label: z.string().trim().min(1).max(40).default("Home"), isDefault: z.boolean().default(false) });
export const GET = withApi(async (request) => { const auth = await currentUser(request, ["customer"]); const user = await User.findById(auth.userId).select("savedAddresses").lean(); if (!user) throw new AppError("User not found.", 404, "USER_NOT_FOUND"); return user.savedAddresses ?? []; });
export const POST = withApi(async (request) => { const auth = await currentUser(request, ["customer"]); const body = parseOrThrow(schema, await readJson(request)); const user = await User.findById(auth.userId); if (!user) throw new AppError("User not found.", 404, "USER_NOT_FOUND"); if (body.isDefault) user.savedAddresses.forEach((a: any) => { a.isDefault = false; }); user.savedAddresses.push({ ...body.address, label: body.label, isDefault: body.isDefault || user.savedAddresses.length === 0 } as any); const address = user.savedAddresses[user.savedAddresses.length - 1]; await user.save(); return { address }; });
