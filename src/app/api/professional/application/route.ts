import { z } from "zod";
import { httpUrlSchema } from "@/lib/validation";
import ProfessionalProfile from "@/models/ProfessionalProfile";
import Service from "@/models/Service";
import Availability from "@/models/Availability";
import User from "@/models/User";
import { currentUser, readJson, withApi, writeAudit } from "@/lib/api-utils";
import { safeDocumentSummary } from "@/lib/api-domain";
import { AppError } from "@/types";
import { SERVICE_CATEGORY_IDS } from "@/lib/categories";
import { notifyAdmins } from "@/lib/notifications";

const docSchema = z.object({ documentType: z.enum(["identity_proof", "address_proof", "professional_certificate", "business_registration", "other"]), storageKey: z.string().trim().min(1).max(500).refine((value) => value.replace(/^\/+/, "").startsWith("styler/private-documents/"), "Verification documents must use the private documents folder."), originalFileName: z.string().max(255).optional(), mimeType: z.string().max(100).optional(), sizeBytes: z.number().int().min(1).max(10 * 1024 * 1024).optional() });
const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(120).optional(), bio: z.string().trim().max(3000).optional(),
  experienceYears: z.number().int().min(0).max(80).optional(), categories: z.array(z.enum(SERVICE_CATEGORY_IDS)).max(SERVICE_CATEGORY_IDS.length).optional(),
  city: z.string().trim().max(100).optional(), state: z.string().trim().max(100).optional(), postalCode: z.string().trim().max(12).optional(),
  baseLocation: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).optional(),
  serviceAreas: z.array(z.object({ city: z.string().trim().min(2).max(100), state: z.string().trim().min(2).max(100), postalCodes: z.array(z.string().max(12)).max(100).default([]), radiusKm: z.number().min(1).max(200).optional() })).max(30).optional(),
  profilePhoto: z.object({ fileId: z.string().max(300).optional(), url: httpUrlSchema }).optional(),
  portfolioImages: z.array(z.object({ fileId: z.string().max(300).optional(), url: httpUrlSchema, altText: z.string().max(200).optional(), sortOrder: z.number().int().min(0).optional() })).max(40).optional(),
  documents: z.array(docSchema).max(10).optional(), submit: z.boolean().default(false),
});

export const GET = withApi(async (request) => { const auth = await currentUser(request, ["professional"]); const profile = await ProfessionalProfile.findOne({ userId: auth.userId }).lean(); if (!profile) throw new AppError("Professional profile not found.", 404, "PROFILE_NOT_FOUND"); const summary = safeDocumentSummary(profile); return { ...summary, documents: (profile.documents ?? []).map((doc: any) => ({ id: String(doc._id), documentType: doc.documentType, storageKey: doc.storageKey, originalFileName: doc.originalFileName, mimeType: doc.mimeType, sizeBytes: doc.sizeBytes, status: doc.status, reviewReason: doc.reviewReason })) }; });
export const PATCH = withApi(async (request) => {
  const auth = await currentUser(request, ["professional"]); const body = profileSchema.parse(await readJson(request));
  const profile = await ProfessionalProfile.findOne({ userId: auth.userId }); if (!profile) throw new AppError("Professional profile not found.", 404, "PROFILE_NOT_FOUND");
  if (["approved", "pending_review", "suspended"].includes(profile.applicationStatus)) throw new AppError("This application cannot be edited in its current status.", 409, "APPLICATION_NOT_EDITABLE");
  const { submit, ...fields } = body;
  for (const [key, value] of Object.entries(fields)) if (value !== undefined) (profile as any).set(key, value);
  if (submit) {
    const services = await Service.countDocuments({ professionalId: profile._id, isActive: true });
    const availability = await Availability.findOne({ professionalId: profile._id });
    const documentTypes = new Set((profile.documents ?? []).map((doc: any) => doc.documentType));
    const missing: string[] = [];
    if (!profile.displayName || !profile.city || !profile.state) missing.push("basic profile and city/state");
    if (!Number.isFinite(profile.baseLocation?.latitude) || !Number.isFinite(profile.baseLocation?.longitude)) missing.push("GPS/map service location");
    if (!profile.categories.length) missing.push("at least one service category");
    if (!profile.profilePhoto?.url) missing.push("profile photo");
    if (!profile.portfolioImages.length) missing.push("at least one portfolio image");
    if (!documentTypes.has("identity_proof")) missing.push("identity proof document");
    if (!documentTypes.has("address_proof")) missing.push("address proof document");
    if (!services) missing.push("at least one active service listing");
    if (!availability || !availability.weeklySchedule.length) missing.push("weekly availability schedule");
    if (missing.length) throw new AppError("Complete the required onboarding fields before submitting.", 422, "ONBOARDING_INCOMPLETE", { missing });
    profile.applicationStatus = "pending_review"; profile.applicationSubmittedAt = new Date(); profile.reviewReason = undefined;
    if (availability) { availability.acceptingRequests = false; await availability.save(); }
  }
  await profile.save();
  if (submit) {
    await Promise.all([
      writeAudit({ actorUserId: auth.userId, actorRole: "professional", action: "professional.application_submitted", targetType: "ProfessionalProfile", targetId: String(profile._id), request }),
      notifyAdmins({
        type: "system_message",
        title: "Professional application ready for review",
        message: `${profile.displayName || "A professional"} submitted an application for verification.`,
        data: { applicationId: String(profile._id) },
        dedupeKey: `admin-application-submitted:${String(profile._id)}:${profile.applicationSubmittedAt?.getTime() ?? Date.now()}`,
      }).catch((error) => console.error("Unable to notify admins about a submitted application", error)),
    ]);
  }
  return { profile: safeDocumentSummary(profile.toObject()), submitted: submit, applicationStatus: profile.applicationStatus };
});
