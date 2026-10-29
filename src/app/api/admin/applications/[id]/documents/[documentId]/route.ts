import { createHmac } from "node:crypto";
import ProfessionalProfile from "@/models/ProfessionalProfile";
import { currentUser, routeParams, requireId, withApi } from "@/lib/api-utils";
import { AppError } from "@/types";

/** Returns a short-lived ImageKit signed URL to an authorized admin only. */
export const GET = withApi(async (request, context) => {
  await currentUser(request, ["admin"]);
  const { id, documentId } = await routeParams(context);
  requireId(id, "profileId");
  requireId(documentId, "documentId");

  const profile = await ProfessionalProfile.findById(id).select("documents").lean();
  if (!profile) throw new AppError("Application not found.", 404, "APPLICATION_NOT_FOUND");
  const document = (profile.documents ?? []).find((item: any) => String(item._id) === documentId);
  if (!document) throw new AppError("Verification document not found.", 404, "DOCUMENT_NOT_FOUND");

  const filePath = String(document.storageKey ?? "").replace(/^\/+/, "");
  if (!filePath.startsWith("styler/private-documents/")) {
    throw new AppError("This document does not have a reviewable private ImageKit path. Ask the professional to upload it again.", 409, "DOCUMENT_PATH_UNAVAILABLE");
  }
  const endpoint = process.env.IMAGEKIT_URL_ENDPOINT?.replace(/\/+$/, "");
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!endpoint || !privateKey) throw new AppError("Private document viewing is not configured.", 503, "IMAGEKIT_NOT_CONFIGURED");

  const expiresAt = Math.floor(Date.now() / 1000) + 180;
  const signature = createHmac("sha1", privateKey).update(`${filePath}${expiresAt}`).digest("hex").toLowerCase();
  const url = `${endpoint}/${filePath}?ik-t=${expiresAt}&ik-s=${signature}`;
  return { url, expiresAt: new Date(expiresAt * 1000).toISOString(), fileName: document.originalFileName ?? "Verification document" };
});
