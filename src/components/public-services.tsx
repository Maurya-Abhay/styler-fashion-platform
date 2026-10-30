
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Clock3,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";
import { apiRequest, humanize, money, unwrapItems } from "@/components/api-client";
import { Alert, LoadingBlock } from "@/components/ui";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

type Service = {
  _id?: string;
  id?: string;
  title?: string;
  category?: string;
  description?: string;
  pricingType?: string;
  pricePaise?: number;
  durationMinutes?: number;
  images?: { url?: string }[];
  professional?: {
    displayName?: string;
    slug?: string;
    city?: string;
    state?: string;
  };
  professionalId?: string;
};

const FALLBACK_IMAGE = "/images/hero-desktop.webp";

export function ServiceCategoryPage({
  category,
}: {
  category: string;
}) {
  const [items, setItems] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const isPersonalStyling = category === "personal_styling";

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ category, limit: "100" });
    if (q.trim()) params.set("q", q.trim());

    setLoading(true);
    setError("");

    const timer = setTimeout(() => {
      apiRequest<unknown>(`/api/services?${params}`)
        .then((data) => {
          if (active) setItems(unwrapItems(data) as Service[]);
        })
        .catch((err: unknown) => {
          if (active) {
            setError(
              err instanceof Error
                ? err.message
                : "Unable to load services. Please try again.",
            );
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [category, q]);

  return (
    <div className="min-h-screen bg-styler-canvas text-styler-ink antialiased">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/services"
          className="inline-flex items-center gap-2 text-sm font-medium text-styler-muted transition hover:text-styler-accent"
        >
          <ArrowLeft size={16} /> All services
        </Link>

        <section className="relative mt-5 grid overflow-hidden border border-styler-line bg-[#35102f] shadow-soft md:min-h-[360px] md:grid-cols-[1.05fr_.95fr] lg:min-h-[390px]">
          <div className="relative z-10 flex flex-col justify-center px-6 py-10 text-white sm:px-10 sm:py-12 lg:px-12">
            <span className="inline-flex w-fit items-center gap-2 border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-pink-100">
              <Sparkles size={14} /> Styler services
            </span>

            <h1 className="mt-6 max-w-xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-[46px]">
              {isPersonalStyling ? (
                <>
                  Find a style that feels{" "}
                  <span className="font-serif italic text-pink-200">like you.</span>
                </>
              ) : (
                <>
                  Find your perfect{" "}
                  <span className="font-serif italic text-pink-200">
                    {humanize(category).toLowerCase()}.
                  </span>
                </>
              )}
            </h1>

            <p className="mt-4 max-w-lg text-sm leading-7 text-white/75 sm:text-base">
              {isPersonalStyling
                ? "Get thoughtful wardrobe advice and occasion-ready looks from independent styling professionals."
                : "Explore services from approved professionals and find the right person for your needs."}
            </p>

            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/15 pt-5 text-xs font-medium text-white/85">
              <span className="flex items-center gap-2">
                <BadgeCheck size={15} className="text-pink-200" />
                Approved professionals
              </span>
              <span className="flex items-center gap-2">
                <Clock3 size={15} className="text-pink-200" />
                Flexible appointments
              </span>
            </div>
          </div>

          <div className="relative min-h-[210px] overflow-hidden sm:min-h-[280px] md:min-h-full">
            <picture>
              <source
                media="(max-width: 640px)"
                srcSet="/images/hero-mobile.webp"
              />
              <img
                src={FALLBACK_IMAGE}
                alt="Fashion styling and occasion wear inspiration"
                fetchPriority="high"
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
            </picture>
            <div className="absolute inset-0 bg-gradient-to-t from-[#240b21]/35 via-transparent to-transparent md:bg-gradient-to-r md:from-[#35102f]/35 md:via-transparent md:to-transparent" />
            <span className="absolute bottom-4 right-4 border border-white/25 bg-black/25 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
              Style, your way
            </span>
          </div>
        </section>

        <section className="mt-8 border-b border-styler-line pb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-styler-accent">
                Explore the collection
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                {humanize(category)} services
              </h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {!loading && (
                <p className="text-xs text-styler-muted">
                  {items.length} {items.length === 1 ? "service" : "services"} found
                </p>
              )}
              <label className="flex min-h-11 w-full items-center gap-3 border border-styler-line bg-styler-surface px-3.5 transition focus-within:border-styler-accent sm:w-[320px]">
                <Search size={17} className="shrink-0 text-styler-accent" />
                <input
                  type="search"
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  placeholder="Search services or styles"
                  aria-label="Search services"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-styler-muted"
                />
                {q && (
                  <button
                    type="button"
                    onClick={() => setQ("")}
                    className="text-xs font-semibold text-styler-accent"
                  >
                    Clear
                  </button>
                )}
              </label>
            </div>
          </div>
        </section>

        <section className="py-7">
          {error && <Alert tone="error">{error}</Alert>}

          {loading ? (
            <LoadingBlock label="Finding services..." />
          ) : items.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((service, index) => {
                const image = service.images?.find((item) => item.url)?.url || FALLBACK_IMAGE;
                const profileHref = service.professional?.slug
                  ? `/professionals/${service.professional.slug}`
                  : service.professionalId
                    ? `/professionals/${service.professionalId}`
                    : "/professionals";

                return (
                  <article
                    key={service._id || service.id || `${service.title}-${index}`}
                    className="group overflow-hidden border border-styler-line bg-styler-surface shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-panel"
                  >
                    <Link href={profileHref} className="block">
                      <div className="relative aspect-[4/3] overflow-hidden bg-styler-surface-2">
                        <img
                          src={image}
                          alt={service.title || humanize(category)}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                        <span className="absolute left-3 top-3 bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-styler-accent shadow-sm">
                          {humanize(service.category || category)}
                        </span>
                      </div>

                      <div className="p-5">
                        <h3 className="font-bold leading-6 transition group-hover:text-styler-accent">
                          {service.title || "Fashion service"}
                        </h3>
                        <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-styler-muted">
                          {service.description || "Discuss your requirements with a fashion professional."}
                        </p>

                        <div className="mt-4 flex items-center justify-between gap-3 border-t border-styler-line pt-4">
                          <div>
                            <p className="text-[11px] text-styler-muted">
                              {service.pricingType === "quote_required"
                                ? "Pricing"
                                : "Starting price"}
                            </p>
                            <p className="mt-1 text-sm font-bold text-styler-accent">
                              {service.pricingType === "quote_required"
                                ? "Quote required"
                                : typeof service.pricePaise === "number"
                                  ? `${service.pricingType === "starting_from" ? "From " : ""}${money(service.pricePaise)}`
                                  : "Price on request"}
                            </p>
                          </div>
                          {service.durationMinutes ? (
                            <span className="flex items-center gap-1 text-xs text-styler-muted">
                              <Clock3 size={14} />
                              {service.durationMinutes} min
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Link>

                    <div className="mx-5 mb-5 flex items-center justify-between gap-3 border border-styler-line bg-styler-surface-2 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">
                          {service.professional?.displayName || "Styler professional"}
                        </p>
                        <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-styler-muted">
                          <MapPin size={12} />
                          {[service.professional?.city, service.professional?.state]
                            .filter(Boolean)
                            .join(", ") || "India"}
                        </p>
                      </div>
                      <Link
                        href={profileHref}
                        aria-label={`View ${service.professional?.displayName || "professional"} profile`}
                        className="grid h-9 w-9 shrink-0 place-items-center bg-styler-surface text-styler-accent transition hover:bg-styler-accent hover:text-white"
                      >
                        <ArrowUpRight size={17} />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="grid gap-6 border border-styler-line bg-styler-surface p-6 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-8">
              <div className="grid h-12 w-12 place-items-center border border-styler-line bg-styler-surface-2 text-styler-accent">
                <Search size={21} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {q ? "No matching services" : "More styles are on the way"}
                </h3>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-styler-muted">
                  {q
                    ? "Try a different search, or clear it to see all available services."
                    : `There aren't any ${humanize(category).toLowerCase()} services listed just yet. Browse our professionals to find someone who can help.`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {q && (
                  <button
                    type="button"
                    onClick={() => setQ("")}
                    className="border border-styler-line px-4 py-2.5 text-sm font-semibold transition hover:bg-styler-surface-2"
                  >
                    Clear search
                  </button>
                )}
                <Link
                  href="/professionals"
                  className="inline-flex items-center justify-center gap-2 bg-styler-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-styler-accent-strong"
                >
                  Browse professionals <ArrowUpRight size={16} />
                </Link>
              </div>
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
