import mongoose from "mongoose";
import { z } from "zod";
import Availability from "@/models/Availability";
import ProfessionalProfile from "@/models/ProfessionalProfile";
import User from "@/models/User";
import { currentUser, readJson, routeParams, requireId, withApi, writeAudit } from "@/lib/api-utils";
import { notifyUser } from "@/lib/notifications";
import { AppError } from "@/types";

const schema = z.object({
  suspended: z.boolean(),
  reason: z.string().trim().min(3).max(1000),
});

export const PATCH = withApi(async (request, context) => {
  const admin = await currentUser(request, ["admin"]);
  const { userId } = await routeParams(context);
  requireId(userId, "userId");
  const body = schema.parse(await readJson(request));
  const expectedStatus = body.suspended ? "active" : "suspended";
  const nextStatus = body.suspended ? "suspended" : "active";
  const session = await mongoose.startSession();
  let affectedUser: any = null;
  let beforeProfileStatus: string | undefined;

  try {
    await session.withTransaction(async () => {
      affectedUser = await User.findOneAndUpdate(
        {
          _id: userId,
          role: { $in: ["customer", "professional"] },
          accountStatus: expectedStatus,
        },
        { $set: { accountStatus: nextStatus } },
        { new: true, session },
      ).select("_id name role accountStatus");
      if (!affectedUser) {
        const existing = await User.findOne({
          _id: userId,
          role: { $in: ["customer", "professional"] },
        }).select("accountStatus").session(session).lean();
        if (!existing) throw new AppError("Customer or professional user not found.", 404, "USER_NOT_FOUND");
        throw new AppError(
          `Only ${expectedStatus} accounts can be ${body.suspended ? "suspended" : "reactivated"}.`,
          409,
          "INVALID_ACCOUNT_STATUS",
        );
      }

      if (affectedUser.role === "professional") {
        const profile = await ProfessionalProfile.findOne({ userId }).session(session);
        if (profile) {
          beforeProfileStatus = profile.applicationStatus;
          if (body.suspended && profile.applicationStatus === "approved") {
            profile.applicationStatus = "suspended";
            profile.reviewedBy = admin.userId as any;
            profile.reviewedAt = new Date();
            profile.reviewReason = body.reason;
            await profile.save({ session });
          } else if (!body.suspended && profile.applicationStatus === "suspended") {
            profile.applicationStatus = "approved";
            profile.reviewedBy = admin.userId as any;
            profile.reviewedAt = new Date();
            profile.reviewReason = body.reason;
            await profile.save({ session });
          }
          if (body.suspended) {
            await Availability.updateOne(
              { professionalId: profile._id },
              { $set: { acceptingRequests: false } },
              { session },
            );
          }
        }
      }
    });
  } finally {
    await session.endSession();
  }

  await writeAudit({
    actorUserId: admin.userId,
    actorRole: "admin",
    action: body.suspended ? "user.suspended" : "user.reactivated",
    targetType: "User",
    targetId: userId,
    before: { accountStatus: expectedStatus, applicationStatus: beforeProfileStatus },
    after: { accountStatus: nextStatus, reason: body.reason },
    request,
  });
  await notifyUser({
    recipientUserId: userId,
    type: "system_message",
    title: body.suspended ? "Styler account suspended" : "Styler account reactivated",
    message: body.reason,
    channels: ["in_app", "email"],
    data: { accountStatus: nextStatus },
    dedupeKey: `admin-user-status:${userId}:${nextStatus}:${Date.now()}`,
  });

  return {
    userId,
    role: affectedUser.role,
    accountStatus: affectedUser.accountStatus,
  };
});
