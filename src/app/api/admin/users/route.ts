import ProfessionalProfile from "@/models/ProfessionalProfile";
import User from "@/models/User";
import { currentUser, paginationFromRequest, safeRegexText, withApi } from "@/lib/api-utils";

export const GET = withApi(async (request) => {
  await currentUser(request, ["admin"]);
  const url = new URL(request.url);
  const { page, limit, skip } = paginationFromRequest(request);
  const filter: Record<string, unknown> = {
    role: { $in: ["customer", "professional"] },
  };
  const role = url.searchParams.get("role");
  const status = url.searchParams.get("status");
  const query = url.searchParams.get("q")?.trim();
  if (role === "customer" || role === "professional") filter.role = role;
  if (["pending_email", "active", "suspended", "disabled"].includes(status || "")) {
    filter.accountStatus = status;
  }
  if (query) {
    const escaped = safeRegexText(query.slice(0, 100));
    filter.$or = [
      { name: new RegExp(escaped, "i") },
      { email: new RegExp(escaped, "i") },
      { phone: new RegExp(escaped, "i") },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("name email phone role accountStatus emailVerifiedAt createdAt lastLoginAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);
  const professionalIds = users
    .filter((user: any) => user.role === "professional")
    .map((user: any) => user._id);
  const profiles = await ProfessionalProfile.find({ userId: { $in: professionalIds } })
    .select("userId displayName applicationStatus city state")
    .lean();
  const profileByUserId = new Map(
    profiles.map((profile: any) => [String(profile.userId), profile]),
  );

  return {
    items: users.map((user: any) => ({
      ...user,
      professionalProfile: profileByUserId.get(String(user._id)) ?? null,
    })),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
});
