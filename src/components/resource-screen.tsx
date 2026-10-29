
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  RefreshCw,
  Search,
  FileText,
  CalendarDays,
  WalletCards,
  CreditCard,
  Users,
  Settings2,
  Activity,
  Sparkles,
  ChevronRight,
} from "lucide-react";

import {
  apiRequest,
  dateTime,
  humanize,
  money,
  unwrapItems,
} from "@/components/api-client";

import {
  Alert,
  Button,
  Card,
  EmptyState,
  LoadingBlock,
  PageHeading,
  StatusBadge,
} from "@/components/ui";

const iconMap: Record<string, any> = {
  applications: FileText,
  professionals: Users,
  bookings: CalendarDays,
  payments: CreditCard,
  payouts: WalletCards,
  reports: Activity,
  settings: Settings2,
  "audit-logs": FileText,
  notifications: Sparkles,
};

function bestTitle(item: any) {
  return (
    item?.title ||
    item?.displayName ||
    item?.name ||
    item?.serviceSnapshot?.title ||
    item?.serviceTitle ||
    item?.action ||
    item?.type ||
    item?.razorpayOrderId ||
    item?.bookingId ||
    item?._id ||
    item?.id ||
    "Styler record"
  );
}

function bestDescription(item: any) {
  return (
    item?.description ||
    item?.bio ||
    item?.message ||
    item?.requirements ||
    item?.reason ||
    item?.reviewReason ||
    item?.serviceSnapshot?.category ||
    item?.category ||
    item?.email ||
    "Details available in this record."
  );
}

function statusOf(item: any) {
  return (
    item?.status ||
    item?.applicationStatus ||
    item?.accountStatus ||
    item?.paymentStatus ||
    item?.payoutStatus
  );
}

function itemDate(item: any) {
  return (
    item?.createdAt ||
    item?.updatedAt ||
    item?.startAt ||
    item?.applicationSubmittedAt ||
    item?.sentAt ||
    item?.occurredAt
  );
}

type ResourceAction = {
  label: string;
  href?: string;
  run?: (item: any) => Promise<void> | void;
  variant?: "primary" | "secondary" | "danger";
};

type ResourceScreenProps = {
  title: string;
  description: string;
  endpoint: string;
  actions?: ResourceAction[];
  extraAction?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
};

export function ResourceScreen({
  title,
  description,
  endpoint,
  actions = [],
  extraAction,
  emptyTitle,
  emptyDescription,
}: ResourceScreenProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const separator = endpoint.includes("?") ? "&" : "?";
      const result = await apiRequest<any>(
        `${endpoint}${separator}page=${page}`
      );

      setData(result);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load records."
      );
    } finally {
      setLoading(false);
    }
  }, [endpoint, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = unwrapItems(data).filter(
    (item: any) =>
      !query ||
      JSON.stringify(item).toLowerCase().includes(query.toLowerCase())
  );

  const totalPages = Math.max(1, Number(data?.totalPages) || 1);
  const totalRecords =
    data?.total == null ? items.length : Number(data.total);

  const isObject =
    data &&
    !Array.isArray(data) &&
    !Array.isArray(data?.items);

  const metrics = isObject
    ? Object.entries(data)
        .filter(
          ([key, value]) =>
            typeof value === "number" &&
            /count|total|revenue|amount|volume|users|bookings|professionals|applications|payout|customers/i.test(
              key
            )
        )
        .slice(0, 4)
    : [];

  async function doAction(item: any, action: ResourceAction) {
    if (!action.run) return;

    const id = String(item?._id || item?.id || "");

    setBusy(id + action.label);
    setNotice("");
    setError("");

    try {
      await action.run(item);
      setNotice(`${action.label} completed.`);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Action failed."
      );
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title={title}
        description={description}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={load}
              loading={loading}
            >
              <RefreshCw size={15} />
              Refresh
            </Button>
            {extraAction}
          </div>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      {metrics.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {metrics.map(([key, value]) => (
            <Card
              key={key}
              className="rounded-xl border-styler-line bg-styler-surface p-4 transition-shadow hover:shadow-panel"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-styler-muted">
                  {humanize(key)}
                </span>
                <Sparkles
                  size={16}
                  className="text-styler-accent"
                />
              </div>

              <p className="mt-3 text-2xl font-bold text-styler-ink">
                {/_paise$/i.test(key)
                  ? money(Number(value))
                  : Number(value).toLocaleString("en-IN")}
              </p>

              <p className="mt-1 text-[10px] text-styler-muted">
                Live account data
              </p>
            </Card>
          ))}
        </div>
      )}


      {data && isObject && !items.length && !metrics.length && (
        <Card className="overflow-hidden rounded-xl border-styler-line bg-styler-surface">
          <div className="border-b border-styler-line bg-styler-surface-2 px-5 py-3">
            <h2 className="font-semibold text-styler-ink">
              Current Data
            </h2>
            <p className="text-xs text-styler-muted">
              Fetched from your Styler API.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <tbody className="divide-y divide-styler-line">
                {Object.entries(data)
                  .filter(([key]) => key !== "success")
                  .map(([key, value]) => (
                    <tr key={key} className="hover:bg-styler-surface-2">
                      <td className="px-5 py-3 font-medium text-styler-ink-soft">
                        {humanize(key)}
                      </td>
                      <td className="break-words px-5 py-3 text-styler-ink">
                        {typeof value === "object"
                          ? JSON.stringify(value)
                          : String(value ?? "—")}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {(items.length > 0 ||
        (!loading &&
          !error &&
          (!isObject || Array.isArray(data)))) && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex w-full max-w-sm items-center gap-2 rounded-xl border border-styler-line bg-styler-surface px-3 py-2.5">
              <Search size={16} className="shrink-0 text-styler-muted" />
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Search records..."
                aria-label="Search records"
                className="w-full bg-transparent text-sm text-styler-ink outline-none placeholder:text-styler-muted"
              />
            </label>

            <span className="text-xs text-styler-muted">
              {query
                ? `${items.length} matching on this page`
                : `${totalRecords} record${totalRecords === 1 ? "" : "s"}`}
            </span>
          </div>

          <div className="space-y-3">
            {items.map((item: any, index: number) => {
              const id = String(item?._id || item?.id || index);
              const resource = endpoint.split("/").filter(Boolean).pop() || "";
              const Icon = iconMap[resource] || FileText;

              return (
                <Card
                  key={id}
                  className="rounded-xl border-styler-line bg-styler-surface p-4 transition-shadow hover:shadow-panel sm:p-5"
                >
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-styler-accent-soft text-styler-accent">
                      <Icon size={19} />
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="break-words text-sm font-semibold text-styler-ink">
                          {bestTitle(item)}
                        </h3>

                        {statusOf(item) && (
                          <StatusBadge status={statusOf(item)} />
                        )}
                      </div>

                      <p className="line-clamp-2 text-xs leading-5 text-styler-ink-soft">
                        {bestDescription(item)}
                      </p>

                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-styler-muted">
                        {itemDate(item) && (
                          <span>{dateTime(itemDate(item))}</span>
                        )}

                        {item?.city && (
                          <span>
                            {[item.city, item.state]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        )}

                        {item?.email && <span>{item.email}</span>}

                        {item?.amountPaise != null && (
                          <strong className="text-styler-ink">
                            {money(item.amountPaise)}
                          </strong>
                        )}

                        {item?.priceSnapshot?.totalPaise != null && (
                          <strong className="text-styler-ink">
                            {money(item.priceSnapshot.totalPaise)}
                          </strong>
                        )}

                        {item?.applicationStatus &&
                          item?.experienceYears != null && (
                            <span>
                              {item.experienceYears} years experience
                            </span>
                          )}
                      </div>

                      {item?.reviewReason && (
                        <Alert tone="warning">
                          Review note: {item.reviewReason}
                        </Alert>
                      )}

                      {actions.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {actions.map((action) =>
                            action.href ? (
                              <Link
                                key={action.label}
                                href={action.href.replace(":id", id)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-styler-line px-3 py-2 text-xs font-semibold text-styler-ink-soft transition hover:border-styler-accent hover:text-styler-accent"
                              >
                                {action.label}
                                <ChevronRight size={14} />
                              </Link>
                            ) : (
                              <Button
                                key={action.label}
                                variant={action.variant || "secondary"}
                                loading={busy === id + action.label}
                                onClick={() => doAction(item, action)}
                              >
                                {action.label}
                              </Button>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-styler-line pt-4">
              <span className="text-xs text-styler-muted">
                Page {page} of {totalPages}
              </span>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Previous
                </Button>

                <Button
                  variant="secondary"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {loading && <LoadingBlock />}

      {!loading &&
        !error &&
        items.length === 0 &&
        (!isObject || Array.isArray(data)) && (
          <Card className="rounded-xl border-styler-line bg-styler-surface p-5 sm:p-8">
            <EmptyState
              title={emptyTitle || "Nothing here yet"}
              description={
                emptyDescription ||
                "When there are records to show, they'll appear here."
              }
              icon={<Sparkles size={20} />}
              action={extraAction}
            />
          </Card>
        )}
    </div>
  );
}
