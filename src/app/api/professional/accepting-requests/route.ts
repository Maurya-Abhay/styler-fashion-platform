import { z } from "zod";
import { currentUser, readJson, withApi } from "@/lib/api-utils";
import { professionalProfileForUser } from "@/lib/api-domain";
import { setAcceptingRequests } from "@/lib/availability";
import { parseOrThrow } from "@/lib/validation";
const schema = z.object({ acceptingRequests: z.boolean() });
export const PATCH = withApi(async (request) => { const auth = await currentUser(request, ["professional"]); const profile = await professionalProfileForUser(auth.userId); const body = parseOrThrow(schema, await readJson(request)); return setAcceptingRequests(String(profile._id), body.acceptingRequests); });
