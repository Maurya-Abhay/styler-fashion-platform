import Booking from "@/models/Booking";
import Payment from "@/models/Payment";
import Payout from "@/models/Payout";
import ProfessionalProfile from "@/models/ProfessionalProfile";
import User from "@/models/User";
import { currentUser, requireId, routeParams, withApi } from "@/lib/api-utils";
import { AppError } from "@/types";

const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  } as Record<string, string>)[character]);

const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(paise / 100);

const dateTime = (value: Date | string | null | undefined) =>
  value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

function renderReceipt(input: {
  title: string;
  receiptNumber: string;
  issuedAt: Date | string | null | undefined;
  customerName: string;
  customerEmail?: string;
  bookingId: string;
  serviceTitle: string;
  rows: Array<[string, string]>;
  note: string;
}) {
  const rows = input.rows.map(([label, value]) =>
    `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`,
  ).join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(input.title)} · Styler</title>
<style>
*{box-sizing:border-box}body{margin:0;padding:32px;background:#f5f5f7;color:#171923;font:14px/1.5 Arial,sans-serif}
.receipt{max-width:760px;margin:0 auto;padding:40px;background:#fff;border:1px solid #e5e7eb;border-radius:12px}
.top{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;border-bottom:2px solid #e81e72;padding-bottom:22px}
h1{font-size:24px;margin:0 0 4px}.brand{font-weight:800;font-size:20px;color:#c81762}.muted{color:#626875;font-size:12px}
.meta{margin:22px 0;display:grid;grid-template-columns:1fr 1fr;gap:14px}.meta div{padding:12px;background:#f8f8fa;border-radius:8px}
.label{display:block;color:#747987;font-size:11px;margin-bottom:3px}table{width:100%;border-collapse:collapse;margin:22px 0}
th,td{text-align:left;padding:12px;border-bottom:1px solid #ececf0}th{font-weight:500;color:#626875}td{text-align:right;font-weight:600;overflow-wrap:anywhere}
.note{padding:14px;background:#f8f8fa;border-radius:8px;color:#555d6b;font-size:12px}.actions{display:flex;justify-content:center;margin:20px auto}
@media print{body{padding:0;background:#fff}.receipt{max-width:none;border:0;border-radius:0;padding:8mm}.actions{display:none}}
@media(max-width:600px){body{padding:12px}.receipt{padding:22px}.meta{grid-template-columns:1fr}.top{flex-direction:column}}
</style></head><body><main class="receipt">
<div class="top"><div><div class="brand">Styler</div><h1>${escapeHtml(input.title)}</h1><div class="muted">Receipt ${escapeHtml(input.receiptNumber)}</div></div>
<div class="muted">Issued ${escapeHtml(dateTime(input.issuedAt))}</div></div>
<section class="meta"><div><span class="label">Name</span><strong>${escapeHtml(input.customerName || "Styler user")}</strong>${input.customerEmail ? `<div class="muted">${escapeHtml(input.customerEmail)}</div>` : ""}</div>
<div><span class="label">Booking</span><strong>${escapeHtml(input.bookingId)}</strong><div class="muted">${escapeHtml(input.serviceTitle)}</div></div></section>
<table><tbody>${rows}</tbody></table>
<p class="note">${escapeHtml(input.note)}</p><p class="muted">This receipt is generated from Styler marketplace records. Keep it for your records.</p>
<div class="actions muted">To save or print: press Ctrl+P (or choose Print in your browser) and select “Save as PDF”.</div>
</main></body></html>`;
}

export const GET = withApi(async (request, context) => {
  const auth = await currentUser(request);
  const { receiptType, recordId } = await routeParams(context);
  requireId(recordId, "recordId");

  if (receiptType === "payment" && auth.role === "customer") {
    const payment = await Payment.findOne({ _id: recordId, customerId: auth.userId }).lean();
    if (!payment) throw new AppError("Payment receipt not found.", 404, "RECEIPT_NOT_FOUND");
    if (!["captured", "refund_pending", "partially_refunded", "refunded"].includes(payment.status)) {
      throw new AppError("A receipt is available after Razorpay confirms the payment.", 409, "PAYMENT_NOT_CAPTURED");
    }
    const [booking, customer] = await Promise.all([
      Booking.findById(payment.bookingId).select("serviceSnapshot priceSnapshot startAt professionalId").lean(),
      User.findById(auth.userId).select("name email").lean(),
    ]);
    if (!booking) throw new AppError("Booking details for this receipt are unavailable.", 404, "BOOKING_NOT_FOUND");
    const professional = await ProfessionalProfile.findById(booking.professionalId).select("displayName").lean();
    const prices = booking.priceSnapshot;
    const refunds = (payment.refunds ?? [])
      .filter((refund: any) => refund.status === "processed")
      .map((refund: any) => `${money(refund.amountPaise)} · ${dateTime(refund.processedAt || refund.createdAt)}`);
    const rows: Array<[string, string]> = [
      ["Payment status", payment.status === "captured" ? "Paid" : payment.status.replaceAll("_", " ")],
      ["Professional", professional?.displayName || "Styler professional"],
      ["Appointment", dateTime(booking.startAt)],
      ["Service amount", money(prices.servicePricePaise)],
      ["Discount", `−${money(prices.discountPaise || 0)}`],
      ["Platform fee", money(prices.customerPlatformFeePaise || 0)],
      ["Tax", money(prices.taxPaise || 0)],
      ["Amount paid", money(payment.amountPaise)],
      ["Payment method", payment.method || "Razorpay"],
      ["Razorpay payment ID", payment.razorpayPaymentId || "—"],
      ["Paid at", dateTime(payment.capturedAt)],
      ...(refunds.length ? [["Processed refunds", refunds.join("; ")] as [string, string]] : []),
    ];
    const html = renderReceipt({
      title: "Customer Payment Receipt",
      receiptNumber: `STY-PAY-${String(payment._id).slice(-10).toUpperCase()}`,
      issuedAt: payment.capturedAt || payment.createdAt,
      customerName: customer?.name || "",
      customerEmail: customer?.email,
      bookingId: String(payment.bookingId),
      serviceTitle: booking.serviceSnapshot?.title || "Styler service",
      rows,
      note: refunds.length
        ? "This receipt records the original captured payment. Processed refunds are listed above; bank posting times may vary."
        : "Payment was collected by Styler through Razorpay. This is a payment receipt, not a tax invoice.",
    });
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
        "Referrer-Policy": "no-referrer",
      },
    });
  }

  if (receiptType === "payout" && auth.role === "professional") {
    const profile = await ProfessionalProfile.findOne({ userId: auth.userId }).select("_id displayName").lean();
    if (!profile) throw new AppError("Professional profile not found.", 404, "PROFILE_NOT_FOUND");
    const payout = await Payout.findOne({ _id: recordId, professionalId: profile._id }).lean();
    if (!payout) throw new AppError("Payout receipt not found.", 404, "RECEIPT_NOT_FOUND");
    if (payout.status !== "transferred") {
      throw new AppError("Your payout receipt will be available after the transfer is recorded as complete.", 409, "PAYOUT_NOT_TRANSFERRED");
    }
    const booking = await Booking.findById(payout.bookingId).select("serviceSnapshot").lean();
    if (!booking) throw new AppError("Booking details for this receipt are unavailable.", 404, "BOOKING_NOT_FOUND");
    const recipient = payout.payoutRecipient?.upiId
      ? `${payout.payoutRecipient.accountHolderName || profile.displayName || "Professional"} · ${payout.payoutRecipient.upiId}`
      : payout.payoutRecipient?.providerAccountId || "Linked payout account";
    const rows: Array<[string, string]> = [
      ["Transfer status", "Transferred"],
      ["Payout method", payout.provider === "manual_upi" ? "UPI transfer" : "Razorpay Route"],
      ["Service gross", money(payout.grossAmountPaise)],
      ["Styler commission", money(payout.commissionPaise)],
      ["Your payout", money(payout.amountPaise)],
      ["Payout destination", recipient],
      ["Transfer reference / UTR", payout.manualTransactionReference || payout.providerTransferId || "—"],
      ["Transferred at", dateTime(payout.transferredAt || payout.manualPaidAt)],
    ];
    const html = renderReceipt({
      title: "Professional Payout Receipt",
      receiptNumber: `STY-OUT-${String(payout._id).slice(-10).toUpperCase()}`,
      issuedAt: payout.transferredAt || payout.manualPaidAt || payout.updatedAt,
      customerName: profile.displayName || "Professional",
      bookingId: String(payout.bookingId),
      serviceTitle: booking.serviceSnapshot?.title || "Styler service",
      rows,
      note: "This receipt confirms that Styler recorded the payout as transferred. For manual UPI payouts, verify the credit in your bank or UPI app using the reference above.",
    });
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
        "Referrer-Policy": "no-referrer",
      },
    });
  }

  throw new AppError("You do not have access to this receipt.", 403, "FORBIDDEN");
});
