"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CreditCard, ReceiptText, RefreshCw, ShieldCheck } from "lucide-react";
import { apiRequest, dateTime, humanize, money, unwrapItems } from "@/components/api-client";
import { Alert, Button, Card, EmptyState, LoadingBlock, PageHeading, StatusBadge } from "@/components/ui";

export function CustomerPaymentsScreen() {
  const [data, setData] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    apiRequest<any>(`/api/customer/payments?limit=20&page=${page}`)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load payment history.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, reload]);

  const items = unwrapItems(data);
  const summary = data?.summary;
  const totalPages = Math.max(1, Number(data?.totalPages) || 1);
  const total = Number(data?.total) || 0;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHeading
        title="Payment History"
        description="Review payment status and receipts for your Styler bookings."
        action={
          <Button variant="secondary" onClick={() => setReload((value) => value + 1)} loading={loading}>
            <RefreshCw size={14} className="mr-1.5" /> Refresh
          </Button>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="rounded p-4 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400">
            <span>Total Payments</span>
            <span className="p-1.5 rounded bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400">
              <ReceiptText size={15} />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold font-serif text-gray-900 dark:text-white">
            {Number(summary?.totalPayments || 0).toLocaleString("en-IN")}
          </div>
          <div className="mt-0.5 text-[10px] text-gray-400">Payments created for your bookings</div>
        </Card>

        <Card className="rounded p-4 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400">
            <span>Paid Amount</span>
            <span className="p-1.5 rounded bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400">
              <CreditCard size={15} />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold font-serif text-gray-900 dark:text-white">
            {money(summary?.paidPaise || 0)}
          </div>
          <div className="mt-0.5 text-[10px] text-gray-400">Includes captured and refunded records</div>
        </Card>

        <Card className="rounded p-4 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400">
            <span>Awaiting Payment</span>
            <span className="p-1.5 rounded bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400">
              <ShieldCheck size={15} />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold font-serif text-gray-900 dark:text-white">
            {Number(summary?.pendingPayments || 0).toLocaleString("en-IN")}
          </div>
          <div className="mt-0.5 text-[10px] text-gray-400">Created or authorized with provider</div>
        </Card>
      </div>

      {/* Main Payment List */}
      {loading ? (
        <LoadingBlock />
      ) : items.length ? (
        <div className="space-y-2.5">
          {items.map((payment: any) => {
            const booking = payment.bookingId && typeof payment.bookingId === "object" ? payment.bookingId : null;
            const bookingId = booking?._id || payment.bookingId;

            return (
              <Card className="rounded p-4 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs flex flex-col sm:flex-row items-start gap-3" key={payment._id}>
                <div className="p-2 rounded bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 shrink-0">
                  <CreditCard size={16} />
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                      {booking?.serviceSnapshot?.title || "Styler booking payment"}
                    </h3>
                    <StatusBadge status={payment.status} />
                  </div>

                  <p className="text-[11px] font-mono text-gray-600 dark:text-gray-300">
                    {payment.razorpayPaymentId || payment.razorpayOrderId || "Payment reference pending"}
                    {payment.method ? ` · ${humanize(payment.method)}` : ""}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400 pt-0.5">
                    <span>{dateTime(payment.capturedAt || payment.createdAt)}</span>
                    {booking?.startAt && <span>Booking · {dateTime(booking.startAt)}</span>}
                    <strong className="font-bold text-gray-900 dark:text-white">{money(payment.amountPaise)}</strong>
                  </div>

                  {payment.failureDescription && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 p-2 rounded border border-rose-200 dark:border-rose-900/40">
                      {payment.failureDescription}
                    </p>
                  )}

                  {payment.refunds?.length > 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded border border-amber-200 dark:border-amber-900/40">
                      {payment.refunds.length} refund update(s) · latest {humanize(payment.refunds[payment.refunds.length - 1].status)}
                    </p>
                  )}

                  {["captured", "refund_pending", "partially_refunded", "refunded"].includes(payment.status) && (
                    <a
                      href={`/api/receipts/payment/${payment._id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded bg-pink-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-pink-700"
                    >
                      <ReceiptText size={13} /> View Receipt
                    </a>
                  )}

                  {bookingId && (
                    <div className="pt-1">
                      <Link
                        href={`/customer/bookings/${bookingId}`}
                        className="inline-flex items-center gap-1 rounded bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                      >
                        View Booking <ArrowRight size={13} />
                      </Link>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="rounded p-8 text-center border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b]">
          <EmptyState
            title="No payment history yet"
            description="When a booking requires payment, its payment status and details will appear here."
            icon={<CreditCard size={22} />}
            action={
              <Link href="/customer/bookings" className="inline-flex items-center gap-1.5 rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121620] px-3.5 py-2 text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                View Bookings
              </Link>
            }
          />
        </Card>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-3 text-xs">
          <span className="text-gray-500 dark:text-gray-400">
            Page <strong>{page}</strong> of <strong>{totalPages}</strong> • {total.toLocaleString("en-IN")} payments
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>
              Previous
            </Button>
            <Button variant="secondary" disabled={page >= totalPages || loading} onClick={() => setPage((value) => value + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}