"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CreditCard,
  FileText,
  RefreshCw,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";
import { apiRequest, dateTime, humanize, money, unwrapItems } from "@/components/api-client";
import { Alert, Button, Card, EmptyState, LoadingBlock, PageHeading, StatusBadge } from "@/components/ui";

type AdminOperationKind = "professionals" | "requests" | "bookings" | "payments" | "payouts" | "reports" | "audit-logs";

const config: Record<AdminOperationKind, { title: string; description: string; endpoint: string; icon: typeof Users }> = {
  professionals: {
    title: "Professionals",
    description: "Monitor professional profiles, approval status and account restrictions.",
    endpoint: "/api/admin/professionals?limit=100",
    icon: Users,
  },
  requests: {
    title: "Booking Requests",
    description: "Monitor customer requests, matching outcomes, offer deadlines and cancellations.",
    endpoint: "/api/admin/booking-requests?limit=100",
    icon: Activity,
  },
  bookings: {
    title: "All Bookings",
    description: "Review booking status across customers and professionals.",
    endpoint: "/api/admin/bookings?limit=100",
    icon: CalendarDays,
  },
  payments: {
    title: "Payments & Refunds",
    description: "Review payment provider state and request eligible refunds with an audit trail.",
    endpoint: "/api/admin/payments?limit=100",
    icon: CreditCard,
  },
  payouts: {
    title: "Professional Payouts",
    description: "Track amounts owed and process eligible transfers when Razorpay Route is configured.",
    endpoint: "/api/admin/payouts?limit=100",
    icon: WalletCards,
  },
  reports: {
    title: "Platform Reports",
    description: "Financial and operational summaries. Platform revenue is not the same as net profit.",
    endpoint: "/api/admin/reports",
    icon: FileText,
  },
  "audit-logs": {
    title: "Audit Log",
    description: "Review admin and system actions to support accountability and investigation.",
    endpoint: "/api/admin/audit-logs?limit=100",
    icon: ShieldCheck,
  },
};

export function AdminOperationsScreen({ kind }: { kind: AdminOperationKind }) {
  const definition = config[kind];
  const Icon = definition.icon;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    const url = new URL(definition.endpoint, window.location.origin);
    if (kind !== "reports") {
      url.searchParams.set("page", String(page));
    }
    if ((kind === "payments" || kind === "payouts" || kind === "requests") && status) {
      url.searchParams.set("status", status);
    }

    apiRequest<any>(`${url.pathname}${url.search}`)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load this resource.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [definition.endpoint, kind, page, reload, status]);

  const items = unwrapItems(data);
  const totalPages = Math.max(1, Number(data?.totalPages) || 1);
  const totalRecords = Number(data?.total ?? items.length);
  const isCollection = Array.isArray(data) || Array.isArray(data?.items);
  const metrics =
    data && !isCollection
      ? Object.entries(data).filter(
          ([key, value]) =>
            typeof value === "number" &&
            /(count|total|amount|revenue|volume|bookings|payout|professionals)/i.test(key)
        )
      : [];

  async function suspend(professional: any) {
    const suspended = professional.applicationStatus !== "suspended";
    const action = suspended ? "Suspend" : "Reactivate";
    const description = suspended
      ? "They will no longer be eligible for new matching offers."
      : "They will be eligible for new matching offers again once they re-enable availability.";
    if (!window.confirm(`${action} ${professional.displayName || "this professional"}? ${description}`)) return;
    const id = String(professional._id);
    setBusy(id);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/api/admin/professionals/${id}/suspend`, {
        method: "POST",
        body: JSON.stringify({
          suspended,
          reason: suspended ? "Suspended by platform administrator" : "Reactivated by platform administrator",
        }),
      });
      setNotice(suspended ? "Professional account suspended." : "Professional account reactivated.");
      setReload((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not suspend professional.");
    } finally {
      setBusy("");
    }
  }

  async function verifyPayoutAccount(professional: any) {
    const id = String(professional._id || professional.id || "");
    if (!id) {
      setError("Professional profile ID is unavailable.");
      return;
    }
    const providerAccountId = window.prompt(
      "Enter the professional's Razorpay Route linked-account ID:",
      professional.payoutAccount?.providerAccountId || "",
    );
    if (!providerAccountId?.trim()) return;

    setBusy(id);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/api/admin/payout-accounts/${id}/verify`, {
        method: "PATCH",
        body: JSON.stringify({ status: "verified", providerAccountId: providerAccountId.trim() }),
      });
      setNotice("Payout account verified.");
      setReload((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not verify payout account.");
    } finally {
      setBusy("");
    }
  }

  async function refund(payment: any) {
    const reason = window.prompt("Enter a refund reason (minimum 3 characters):");
    if (!reason || reason.trim().length < 3) return;
    const id = String(payment._id);
    setBusy(id);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/api/admin/payments/${id}/refund`, {
        method: "POST",
        headers: { "Idempotency-Key": `admin-refund:${id}:${Date.now()}` },
        body: JSON.stringify({ reason }),
      });
      setNotice("Refund request submitted. Check the updated provider status.");
      setReload((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not request refund.");
    } finally {
      setBusy("");
    }
  }

  async function processPayout(payout: any) {
    if (!window.confirm("Process this payout through the configured Razorpay Route account?")) return;
    const id = String(payout._id);
    setBusy(id);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/api/admin/payouts/${id}/process`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setNotice("Payout processing request sent.");
      setReload((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Payout could not be processed.");
    } finally {
      setBusy("");
    }
  }

  async function cancelRequest(record: any) {
    const reason = window.prompt("Enter a cancellation reason for the customer:");
    if (!reason || reason.trim().length < 3) return;
    const id = String(record._id);
    setBusy(id);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/api/admin/booking-requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      setNotice("Booking request cancelled and the customer was notified.");
      setReload((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not cancel booking request.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHeading
        title={definition.title}
        description={definition.description}
        action={
          <Button variant="secondary" onClick={() => setReload((value) => value + 1)} loading={loading}>
            <RefreshCw size={14} className="mr-1.5" /> Refresh
          </Button>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      {(kind === "payments" || kind === "payouts" || kind === "requests") && (
        <div className="flex items-center justify-between gap-3 bg-white dark:bg-[#1a1f2b] p-3 rounded border border-gray-100 dark:border-gray-800 shadow-xs">
          <div className="w-full sm:w-64">
            <label className="sr-only" htmlFor="admin-record-status">Filter by status</label>
            <select
              id="admin-record-status"
              className="w-full rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121620] px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:border-pink-500 focus:outline-none"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              {(kind === "payments"
                ? ["created", "authorized", "captured", "failed", "refund_pending", "partially_refunded", "refunded"]
                : kind === "payouts"
                  ? ["pending", "on_hold", "processing", "transferred", "failed", "reversed"]
                  : ["matching", "offers_sent", "assigned", "no_match", "expired", "cancelled"]
              ).map((value) => (
                <option key={value} value={value}>
                  {humanize(value)}
                </option>
              ))}
            </select>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Showing <strong className="text-gray-900 dark:text-white">{totalRecords.toLocaleString("en-IN")}</strong> record(s)
          </span>
        </div>
      )}

      {loading ? (
        <LoadingBlock />
      ) : !data ? (
        <Card className="rounded p-8 text-center border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b]">
          <EmptyState title="No data returned" description="The API did not return a response." />
        </Card>
      ) : (
        <>
          {metrics.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {metrics.map(([key, value]) => (
                <Card className="rounded p-4 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs" key={key}>
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400">
                    <span>{humanize(key)}</span>
                    <span className="p-1.5 rounded bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400">
                      <Icon size={15} />
                    </span>
                  </div>
                  <div className="mt-2 text-xl font-bold font-serif text-gray-900 dark:text-white">
                    {/_paise$/i.test(key) ? money(Number(value)) : Number(value).toLocaleString("en-IN")}
                  </div>
                  <div className="mt-0.5 text-[10px] text-gray-400">Current reporting period</div>
                </Card>
              ))}
            </div>
          )}

          {isCollection && items.length > 0 ? (
            <div className="space-y-2.5">
              {items.map((record: any) => {
                const id = String(record._id || record.id);
                const profile = record.professionalId && typeof record.professionalId === "object" ? record.professionalId : null;
                const user = record.userId && typeof record.userId === "object" ? record.userId : null;
                const title = kind === "requests"
                  ? `${humanize(record.serviceCategory || "service")} · ${record.customer?.name || "Customer"}`
                  : (
                  record.displayName ||
                  record.name ||
                  record.serviceSnapshot?.title ||
                  record.action ||
                  record.type ||
                  record.razorpayOrderId ||
                  record.providerTransferId ||
                  id
                );
                const recordStatus = record.applicationStatus || record.status || record.accountStatus || "unknown";

                return (
                  <Card className="rounded p-4 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs flex flex-col sm:flex-row items-start gap-3" key={id}>
                    <div className="p-2 rounded bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 shrink-0">
                      <Icon size={16} />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-xs font-bold text-gray-900 dark:text-white truncate">{title}</h3>
                        <StatusBadge status={recordStatus} />
                      </div>

                      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-2">
                        {                        record.requirements ||
                        record.bio ||
                          record.reason ||
                          record.reviewReason ||
                          record.description ||
                          record.serviceSnapshot?.category ||
                          record.email ||
                          user?.email ||
                          "Record from Styler marketplace operations."}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400 pt-0.5">
                        {record.createdAt && <span>{dateTime(record.createdAt)}</span>}
                        {kind === "requests" && record.customer?.email && <span>{record.customer.email}</span>}
                        {kind === "requests" && <span>{dateTime(record.preferredStartAt)}</span>}
                        {kind === "requests" && <span>{record.offersSentCount || 0} offers sent</span>}
                        {kind === "requests" && <span>Radius: {record.searchRadiusKm ?? 25} km</span>}
                        {kind === "requests" && record.noMatchReason && <span>{record.noMatchReason}</span>}
                        {(record.city || profile?.displayName) && (
                          <span>{[record.city, profile?.displayName].filter(Boolean).join(" · ")}</span>
                        )}
                        {record.amountPaise != null && <strong className="font-bold text-gray-900 dark:text-white">{money(record.amountPaise)}</strong>}
                        {record.priceSnapshot?.totalPaise != null && <strong className="font-bold text-gray-900 dark:text-white">{money(record.priceSnapshot.totalPaise)}</strong>}
                        {record.amountPaise == null && record.netAmountPaise != null && <strong className="font-bold text-gray-900 dark:text-white">{money(record.netAmountPaise)}</strong>}
                        {record.customerId?.email && <span>{record.customerId.email}</span>}
                        {record.razorpayPaymentId && <span className="font-mono text-[10px]">{record.razorpayPaymentId}</span>}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        {kind === "professionals" && (
                          <>
                            <Link href={`/admin/applications/${id}`} className="inline-flex items-center gap-1 rounded bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                              Review Profile <ArrowUpRight size={13} />
                            </Link>
                            {record.applicationStatus === "approved" && (
                              <Button variant="danger" loading={busy === id} onClick={() => void suspend(record)}>
                                <AlertTriangle size={13} className="mr-1" /> Suspend
                              </Button>
                            )}
                            {record.applicationStatus === "suspended" && (
                              <Button variant="secondary" loading={busy === id} onClick={() => void suspend(record)}>
                                Reactivate
                              </Button>
                            )}
                            {record.payoutAccount?.status !== "verified" && (
                              <Button variant="secondary" loading={busy === id} onClick={() => void verifyPayoutAccount(record)}>
                                Verify payout account
                              </Button>
                            )}
                          </>
                        )}
                        {kind === "payments" && ["captured", "partially_refunded"].includes(record.status) && (
                          <Button variant="secondary" loading={busy === id} onClick={() => void refund(record)}>
                            Request Refund
                          </Button>
                        )}
                        {kind === "payouts" && ["pending", "failed"].includes(record.status) && (
                          <Button loading={busy === id} onClick={() => void processPayout(record)}>
                            <WalletCards size={13} className="mr-1" /> Process Payout
                          </Button>
                        )}
                        {kind === "bookings" && (
                          <Link href={`/admin/bookings/${id}`} className="inline-flex items-center gap-1 rounded bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                            Open Booking <ArrowUpRight size={13} />
                          </Link>
                        )}
                        {kind === "requests" && ["matching", "offers_sent"].includes(record.status) && (
                          <Button variant="danger" loading={busy === id} onClick={() => void cancelRequest(record)}>
                            Cancel request
                          </Button>
                        )}
                        {kind === "audit-logs" && record.targetId && (
                          <span className="font-mono text-[10px] text-gray-400">{record.targetType}: {String(record.targetId).slice(-10)}</span>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : isCollection ? (
            <Card className="rounded p-8 text-center border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b]">
              <EmptyState title="No records yet" description="Once Styler has activity for this view, the records will appear here." icon={<Icon size={22} />} />
            </Card>
          ) : kind === "reports" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="rounded p-5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs space-y-3">
                <div className="border-b border-gray-100 dark:border-gray-800 pb-2">
                  <h2 className="text-xs font-bold text-gray-900 dark:text-white">Booking Status Report</h2>
                  <p className="text-[10px] text-gray-400">Operational breakdown for the reporting period.</p>
                </div>
                <ReportRows rows={data.bookingStats} />
              </Card>

              <Card className="rounded p-5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs space-y-3">
                <div className="border-b border-gray-100 dark:border-gray-800 pb-2">
                  <h2 className="text-xs font-bold text-gray-900 dark:text-white">Payment Status Report</h2>
                  <p className="text-[10px] text-gray-400">Gross payment volume by status.</p>
                </div>
                <ReportRows rows={data.paymentStats} />

                <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
                  <h2 className="text-xs font-bold text-gray-900 dark:text-white">Payout Status</h2>
                  <p className="text-[10px] text-gray-400 mb-2">Amounts by transfer state.</p>
                  <ReportRows rows={data.payoutStats} />
                </div>
              </Card>

              <Card className="rounded p-5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs space-y-3 md:col-span-2">
                <h2 className="text-xs font-bold text-gray-900 dark:text-white">Revenue Entries</h2>
                <ReportRows rows={data.platformRevenueEntries} />
                <Alert tone="info">{data.note || "Revenue does not equal net profit."}</Alert>
              </Card>
            </div>
          ) : (
            <Card className="rounded p-5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs">
              <h2 className="text-xs font-bold text-gray-900 dark:text-white mb-2">Report Summary</h2>
              <pre className="p-3 rounded bg-gray-50 dark:bg-[#121620] text-[10px] font-mono text-gray-700 dark:text-gray-300 overflow-x-auto">
                {JSON.stringify(data, null, 2)}
              </pre>
            </Card>
          )}

          {isCollection && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-3 text-xs">
              <span className="text-gray-500 dark:text-gray-400">
                Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> • {totalRecords.toLocaleString("en-IN")} records
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                  Previous
                </Button>
                <Button variant="secondary" disabled={page >= totalPages || loading} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ReportRows({ rows }: { rows?: any[] }) {
  if (!rows?.length) return <p className="text-xs text-gray-400 py-2">No entries for this reporting period.</p>;
  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
      {rows.map((row) => (
        <div className="flex items-center justify-between py-2 text-xs" key={String(row._id)}>
          <span className="text-gray-600 dark:text-gray-300">{humanize(String(row._id || "unknown"))}</span>
          <strong className="font-bold text-gray-900 dark:text-white">
            {row.amountPaise != null
              ? money(row.amountPaise)
              : row.volumePaise != null
              ? money(row.volumePaise)
              : row.serviceVolumePaise != null
              ? money(row.serviceVolumePaise)
              : Number(row.count || 0).toLocaleString("en-IN")}
          </strong>
        </div>
      ))}
    </div>
  );
}