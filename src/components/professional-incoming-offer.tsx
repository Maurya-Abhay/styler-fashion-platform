"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Clock3, MapPin, X } from "lucide-react";

import { apiRequest, dateTime, humanize, money, unwrapItems } from "@/components/api-client";
import { Alert } from "@/components/ui";

type Offer = {
  _id: string;
  status: string;
  expiresAt: string;
  quotedPricePaise?: number;
  service?: { pricingType?: string };
  request?: {
    serviceCategory?: string;
    requirements?: string;
    city?: string;
    state?: string;
    distanceKm?: number | null;
    searchRadiusKm?: number;
    preferredStartAt?: string;
    preferredEndAt?: string;
    requestedDurationMinutes?: number;
    budgetMinPaise?: number;
    budgetMaxPaise?: number;
    referenceImages?: Array<{ url: string; caption?: string }>;
  };
};

export function ProfessionalIncomingOffer() {
  const router = useRouter();
  const [activeOffer, setActiveOffer] = useState<Offer | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [pollError, setPollError] = useState("");
  const handled = useRef(new Set<string>());
  const queue = useRef<Offer[]>([]);
  const polling = useRef(false);
  const retryAfter = useRef(0);

  function showNext() {
    if (queue.current.length) setActiveOffer(queue.current.shift() || null);
    else setActiveOffer(null);
  }

  useEffect(() => {
    let active = true;

    async function poll() {
      if (!active || document.hidden || polling.current || Date.now() < retryAfter.current) return;
      polling.current = true;
      try {
        const data = await apiRequest<any>("/api/professional/requests?limit=100");
        if (!active) return;
        setPollError("");
        const activeOffers = unwrapItems(data)
          .filter((offer: Offer) => offer.status === "sent");
        const activeIds = new Set(activeOffers.map((offer: Offer) => String(offer._id)));
        const fresh = activeOffers
          .filter((offer: Offer) => !handled.current.has(String(offer._id)))
          .sort((a: Offer, b: Offer) => new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime());
        queue.current = queue.current.filter((offer) => activeIds.has(String(offer._id)));
        if (fresh.length) {
          for (const offer of fresh) {
            const id = String(offer._id);
            handled.current.add(id);
            if (!queue.current.some((queued) => String(queued._id) === id)) {
              queue.current.push(offer);
            }
          }
        }
        setActiveOffer((current) =>
          current && activeIds.has(String(current._id))
            ? current
            : queue.current.shift() || null,
        );
      } catch (cause) {
        if (active) {
          const message = cause instanceof Error ? cause.message : "Could not check for new booking requests.";
          if (/professional approval is required|must be approved/i.test(message)) {
            retryAfter.current = Date.now() + 30_000;
            setPollError("");
          } else {
            setPollError(message);
          }
        }
      } finally {
        polling.current = false;
      }
    }

    void poll();
    const timer = window.setInterval(() => void poll(), 5_000);
    const refresh = () => {
      if (!document.hidden) void poll();
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  async function respond(action: "accept" | "reject") {
    if (!activeOffer || busy) return;
    let quotePaise: number | undefined;
    if (action === "accept" && activeOffer.service?.pricingType === "quote_required") {
      const input = window.prompt("Enter your service quote in rupees (example: 2500.00):");
      if (input === null) return;
      if (!/^\d+(?:\.\d{1,2})?$/.test(input.trim())) {
        setError("Enter a valid rupee amount with up to two decimal places.");
        return;
      }
      quotePaise = Math.round(Number(input) * 100);
      if (!Number.isSafeInteger(quotePaise) || quotePaise < 100) {
        setError("Quote must be at least ₹1.00.");
        return;
      }
      if (
        (activeOffer.request?.budgetMinPaise != null && quotePaise < activeOffer.request.budgetMinPaise)
        || (activeOffer.request?.budgetMaxPaise != null && quotePaise > activeOffer.request.budgetMaxPaise)
      ) {
        setError("Your quote must be within the customer's budget range.");
        return;
      }
    }

    setBusy(action);
    setError("");
    try {
      const result = await apiRequest<any>(`/api/booking-offers/${activeOffer._id}/${action}`, {
        method: "POST",
        body: JSON.stringify({ ...(quotePaise !== undefined ? { quotePaise } : {}) }),
      });
      const bookingId = action === "accept" ? String(result?._id || "") : "";
      showNext();
      if (bookingId) {
        router.push(`/professional/bookings/${bookingId}#booking-chat`);
        router.refresh();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not process this offer.");
    } finally {
      setBusy("");
    }
  }

  if (!activeOffer) {
    return pollError ? (
      <div className="fixed bottom-4 right-4 z-[100] w-[min(24rem,calc(100vw-2rem))]">
        <Alert tone="error">{pollError} We’ll keep trying automatically.</Alert>
      </div>
    ) : null;
  }

  const request = activeOffer.request;

  return (
    <>
    {pollError && (
      <div className="fixed bottom-4 right-4 z-[100] w-[min(24rem,calc(100vw-2rem))]">
        <Alert tone="error">{pollError} We’ll keep trying automatically.</Alert>
      </div>
    )}
    <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-booking-offer-title"
        className="my-auto max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-styler-line bg-styler-surface p-5 shadow-2xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-styler-accent">New nearby request</p>
            <h2 id="global-booking-offer-title" className="mt-1 text-xl font-bold text-styler-ink">
              {humanize(request?.serviceCategory || "Service request")}
            </h2>
          </div>
          <button
            type="button"
            onClick={showNext}
            aria-label="Close request alert"
            className="rounded-full p-2 text-styler-muted hover:bg-styler-surface-2 hover:text-styler-ink"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <p className="whitespace-pre-wrap text-xs leading-5 text-styler-ink-soft">
            {request?.requirements || "No additional requirements were provided."}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-styler-line bg-styler-surface-2 p-3">
              <p className="flex items-center gap-1.5 text-[10px] text-styler-muted">
                <MapPin size={12} /> Approx. straight-line distance
              </p>
              <p className="mt-1 text-sm font-bold text-styler-ink">
                {request?.distanceKm == null ? "Not available" : `About ${request.distanceKm} km`}
              </p>
              <p className="mt-1 text-[9px] leading-4 text-styler-muted">
                {request?.city}{request?.city && request?.state ? ", " : ""}{request?.state}
                {" · "}From your studio pin. Exact address appears after you accept.
              </p>
            </div>
            <div className="rounded-lg border border-styler-line bg-styler-surface-2 p-3">
              <p className="text-[10px] text-styler-muted">Your offer</p>
              <p className="mt-1 text-sm font-bold text-styler-ink">
                {activeOffer.service?.pricingType === "quote_required"
                  ? "Quote requested"
                  : money(activeOffer.quotedPricePaise)}
              </p>
              <p className="mt-1 text-[9px] text-styler-muted">
                {request?.requestedDurationMinutes || 60} min
                {request?.searchRadiusKm ? ` · Customer radius ${request.searchRadiusKm} km` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-styler-line pt-3 text-[10px] text-styler-muted">
            {request?.preferredStartAt && <span>{dateTime(request.preferredStartAt)}</span>}
            {request?.preferredEndAt && <span>Until {dateTime(request.preferredEndAt)}</span>}
            <span className="flex items-center gap-1"><Clock3 size={11} /> Expires {dateTime(activeOffer.expiresAt)}</span>
          </div>
          {request?.referenceImages?.length ? (
            <div className="flex gap-2 overflow-x-auto">
              {request.referenceImages.map((image, index) => (
                <a key={`${image.url}-${index}`} href={image.url} target="_blank" rel="noreferrer">
                  <img src={image.url} alt={image.caption || "Customer reference"} className="h-20 w-20 rounded-lg object-cover" />
                </a>
              ))}
            </div>
          ) : null}
          {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={showNext}
            className="rounded-lg border border-styler-line px-3 py-2 text-xs font-semibold text-styler-ink-soft hover:bg-styler-surface-2"
          >
            Remind me later
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void respond("reject")}
              disabled={Boolean(busy)}
              className="rounded-lg border border-styler-line px-3 py-2 text-xs font-semibold text-styler-ink-soft disabled:opacity-50"
            >
              {busy === "reject" ? "Declining…" : "Decline"}
            </button>
            <button
              type="button"
              onClick={() => void respond("accept")}
              disabled={Boolean(busy)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-styler-accent px-4 py-2 text-xs font-semibold text-white hover:bg-styler-accent-strong disabled:opacity-50"
            >
              {busy === "accept" ? "Accepting…" : "Accept & open chat"} <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </section>
    </div>
    </>
  );
}
