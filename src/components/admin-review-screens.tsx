"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  FileCheck2,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { apiRequest, unwrapItems } from "@/components/api-client";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Field,
  LoadingBlock,
  PageHeading,
  SelectField,
  StatusBadge,
} from "@/components/ui";

export function AdminApplicationsScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [status, setStatus] = useState("pending_review");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    apiRequest<any>(
      `/api/admin/applications?status=${encodeURIComponent(
        status
      )}&limit=50&page=${page}`
    )
      .then((result) => {
        if (!active) return;
        const pages = Math.max(1, Number(result?.totalPages) || 1);
        if (page > pages) {
          setPage(pages);
          return;
        }
        setItems(unwrapItems(result));
        setTotalPages(pages);
        setTotal(Number(result?.total) || 0);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load applications."
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, reload, status]);

  async function action(
    item: any,
    kind: "approve" | "reject" | "request-changes"
  ) {
    let body: Record<string, string> = {};
    if (kind !== "approve") {
      const reason = window.prompt(
        kind === "reject"
          ? "Reason for rejection (minimum 3 characters):"
          : "What changes does this applicant need to make?"
      );
      if (!reason || reason.trim().length < 3) return;
      body = { reason: reason.trim() };
    }

    const id = String(item._id);
    setBusy(`${id}:${kind}`);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/api/admin/applications/${id}/${kind}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setNotice(
        kind === "approve"
          ? "Professional approved."
          : kind === "reject"
          ? "Application rejected with a reason."
          : "Correction request sent."
      );
      setReload((value) => value + 1);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not update application."
      );
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHeading
        title="Application Review Queue"
        description="Review profile quality, verification documents, service listings, and availability before activation."
        action={
          <Button
            variant="secondary"
            onClick={() => setReload((value) => value + 1)}
            loading={loading}
          >
            <RefreshCw size={14} className="mr-1.5" /> Refresh
          </Button>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      {/* Toolbar Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#1a1f2b] p-3 rounded border border-gray-100 dark:border-gray-800 shadow-xs">
        <div className="w-full sm:w-64">
          <SelectField
            aria-label="Application status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="pending_review">Pending Review</option>
            <option value="needs_changes">Needs Changes</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All Applications</option>
          </SelectField>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Showing <strong className="text-gray-900 dark:text-white">{total.toLocaleString("en-IN")}</strong> application(s)
        </span>
      </div>

      {loading ? (
        <LoadingBlock />
      ) : items.length ? (
        <div className="space-y-3">
          {items.map((profile) => {
            const hasIdProof = (profile.documents || []).some(
              (doc: any) => doc.documentType === "identity_proof"
            );
            const hasAddrProof = (profile.documents || []).some(
              (doc: any) => doc.documentType === "address_proof"
            );

            return (
              <Card
                className="rounded p-4 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs space-y-3"
                key={profile._id}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-300 font-bold text-sm grid place-items-center">
                      {(
                        profile.displayName ||
                        profile.userId?.name ||
                        "S"
                      )
                        .slice(0, 1)
                        .toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-snug">
                        {profile.displayName ||
                          profile.userId?.name ||
                          "New Professional"}
                      </h3>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-0.5">
                        <span>{profile.userId?.email || "No email"}</span>
                        <span>•</span>
                        <span>{profile.userId?.phone || "No phone"}</span>
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={profile.applicationStatus} />
                </div>

                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-2">
                  {profile.bio || "No introduction provided."}
                </p>

                {/* Metadata & Requirements Checklist */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-gray-50 dark:bg-[#121620] p-2.5 rounded border border-gray-100 dark:border-gray-800/80">
                  <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                    <FileCheck2
                      size={13}
                      className={
                        hasIdProof ? "text-emerald-500" : "text-amber-500"
                      }
                    />
                    <span>
                      ID Proof:{" "}
                      <strong className="text-gray-800 dark:text-gray-200">
                        {hasIdProof ? "Uploaded" : "Missing"}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                    <FileCheck2
                      size={13}
                      className={
                        hasAddrProof ? "text-emerald-500" : "text-amber-500"
                      }
                    />
                    <span>
                      Address:{" "}
                      <strong className="text-gray-800 dark:text-gray-200">
                        {hasAddrProof ? "Uploaded" : "Missing"}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                    <Sparkles
                      size={13}
                      className={
                        profile.activeServiceCount
                          ? "text-emerald-500"
                          : "text-amber-500"
                      }
                    />
                    <span>
                      Services:{" "}
                      <strong className="text-gray-800 dark:text-gray-200">
                        {profile.activeServiceCount ?? "Review"}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                    <CalendarDays
                      size={13}
                      className={
                        profile.hasAvailability
                          ? "text-emerald-500"
                          : "text-amber-500"
                      }
                    />
                    <span>
                      Availability:{" "}
                      <strong className="text-gray-800 dark:text-gray-200">
                        {profile.hasAvailability ? "Set" : "Pending"}
                      </strong>
                    </span>
                  </div>
                </div>

                {profile.reviewReason && (
                  <Alert tone="warning">
                    Previous review note: {profile.reviewReason}
                  </Alert>
                )}

                {/* Actions Footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-gray-400">
                    {[profile.city, profile.state]
                      .filter(Boolean)
                      .join(", ") || "Location incomplete"}{" "}
                    • {profile.experienceYears || 0} yrs exp
                  </span>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/applications/${profile._id}`}
                      className="inline-flex items-center gap-1 rounded bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                    >
                      Open Application <ArrowRight size={13} />
                    </Link>

                    {["pending_review", "needs_changes"].includes(
                      profile.applicationStatus
                    ) && (
                      <>
                        <Button
                          loading={busy === `${profile._id}:approve`}
                          onClick={() => void action(profile, "approve")}
                        >
                          <BadgeCheck size={13} className="mr-1" /> Approve
                        </Button>
                        <Button
                          variant="secondary"
                          loading={busy === `${profile._id}:request-changes`}
                          onClick={() =>
                            void action(profile, "request-changes")
                          }
                        >
                          Request Changes
                        </Button>
                      </>
                    )}
                    {["draft", "pending_review", "needs_changes"].includes(
                      profile.applicationStatus
                    ) && (
                      <Button
                        variant="danger"
                        loading={busy === `${profile._id}:reject`}
                        onClick={() => void action(profile, "reject")}
                      >
                        Reject
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="rounded p-8 text-center border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b]">
          <EmptyState
            title="No applications in this queue"
            description="There are no applications matching the selected status right now."
            icon={<FileCheck2 size={22} />}
          />
        </Card>
      )}

      {totalPages > 1 && (
        <AdminPagination
          page={page}
          totalPages={totalPages}
          total={total}
          loading={loading}
          onPage={setPage}
        />
      )}
    </div>
  );
}

export function AdminCommissionOverridesScreen() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    apiRequest<any>(`/api/admin/professionals?limit=50&page=${page}`)
      .then((result) => {
        if (!active) return;
        const list = unwrapItems(result);
        setProfiles(list);
        setTotal(Number(result?.total) || 0);
        setTotalPages(Math.max(1, Number(result?.totalPages) || 1));
        setValues(
          Object.fromEntries(
            list.map((profile: any) => [
              String(profile._id),
              profile.commissionOverridePercent == null
                ? ""
                : String(profile.commissionOverridePercent),
            ])
          )
        );
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load professional commissions."
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, reload]);

  async function save(profile: any) {
    const id = String(profile._id);
    setBusy(id);
    setError("");
    setNotice("");
    try {
      await apiRequest("/api/admin/commissions", {
        method: "PATCH",
        body: JSON.stringify({
          professionalProfileId: id,
          commissionOverridePercent:
            values[id] === "" ? null : Number(values[id]),
        }),
      });
      setNotice(
        `Commission override saved for ${
          profile.displayName || "professional"
        }.`
      );
      setReload((value) => value + 1);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save commission."
      );
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHeading
        title="Commission Settings"
        description="Set the platform-wide default in Settings, then override the percentage for individual professionals when needed."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setReload((value) => value + 1)}
              loading={loading}
            >
              <RefreshCw size={14} className="mr-1.5" /> Refresh
            </Button>
            <Link
              className="inline-flex items-center gap-1.5 rounded bg-pink-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-pink-700 transition"
              href="/admin/settings"
            >
              <SlidersHorizontal size={14} /> Default Commission
            </Link>
          </div>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      {loading ? (
        <LoadingBlock />
      ) : profiles.length ? (
        <div className="space-y-2.5">
          {profiles.map((profile) => (
            <Card
              className="rounded p-3.5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              key={profile._id}
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-300 font-bold text-xs grid place-items-center shrink-0">
                  {(profile.displayName || "S").slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-xs font-bold text-gray-900 dark:text-white">
                      {profile.displayName || "Professional"}
                    </strong>
                    <StatusBadge status={profile.applicationStatus} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {profile.city || "Location not set"} • Leave empty to use
                    platform default
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <div className="w-24">
                  <Field
                    aria-label={`Commission override for ${
                      profile.displayName || "professional"
                    }`}
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={values[String(profile._id)] ?? ""}
                    placeholder="Default"
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [String(profile._id)]: event.target.value,
                      }))
                    }
                  />
                </div>
                <span className="text-xs font-bold text-gray-400">%</span>
                <Button
                  loading={busy === String(profile._id)}
                  onClick={() => void save(profile)}
                >
                  Save
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="rounded p-8 text-center border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b]">
          <EmptyState
            title="No professionals found"
            description="Professional profiles will appear here."
            icon={<SlidersHorizontal size={22} />}
          />
        </Card>
      )}

      {totalPages > 1 && (
        <AdminPagination
          page={page}
          totalPages={totalPages}
          total={total}
          loading={loading}
          onPage={setPage}
        />
      )}
    </div>
  );
}

function AdminPagination({
  page,
  totalPages,
  total,
  loading,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  loading: boolean;
  onPage: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-3 text-xs">
      <span className="text-gray-500 dark:text-gray-400">
        Page <strong>{page}</strong> of <strong>{totalPages}</strong> •{" "}
        {total.toLocaleString("en-IN")} records
      </span>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          disabled={page <= 1 || loading}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          disabled={page >= totalPages || loading}
          onClick={() => onPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}