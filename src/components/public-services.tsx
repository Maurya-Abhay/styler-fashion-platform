
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Clock3,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";
import { apiRequest, humanize, money, unwrapItems } from "@/components/api-client";
import { Alert, EmptyState, LoadingBlock } from "@/components/ui";
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
          className="inline-flex items-center gap-2 text-sm text-styler-muted hover:text-styler-accent"
        >
          <ArrowLeft size={16} /> All services
        </Link>

        {/* Premium hero */}
        <section className="relative isolate mt-6 overflow-hidden rounded-3xl bg-[#35102f] shadow-soft">
          <picture>
            <source
              media="(max-width: 640px)"
              srcSet="/images/hero-mobile.webp"
            />
            <img
              src={FALLBACK_IMAGE}
              alt="Indian occasion wear and fashion design"
              fetchPriority="high"
              className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
            />
          </picture>
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#240b21]/95 via-[#35102f]/80 to-[#35102f]/30" />

          <div className="max-w-2xl px-6 py-12 text-white sm:px-10 sm:py-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-pink-200">
              <Sparkles size={14} /> Styler Collection
            </span>

            <h1 className="mt-5 text-3xl font-bold leading-tight sm:text-5xl">
              Discover your perfect{" "}
              <span className="font-serif italic text-pink-300">
                {humanize(category).toLowerCase()}.
              </span>
            </h1>

            <p className="mt-4 max-w-lg text-sm leading-7 text-white/80 sm:text-base">
              Explore approved professionals, compare services and find the
              right person for your needs.
            </p>

            <div className="mt-6 flex flex-wrap gap-4 text-xs text-white/90">
              <span className="flex items-center gap-2">
                <Sparkles size={15} className="text-pink-300" />
                Personalised fashion
              </span>
              <span className="flex items-center gap-2">
                <Clock3 size={15} className="text-pink-300" />
                Flexible appointments
              </span>
            </div>
          </div>
        </section>

        {/* Search */}
        <section className="mt-8">
          <label className="flex items-center gap-3 rounded-2xl border border-styler-line bg-styler-surface px-4 py-3.5 shadow-soft focus-within:border-styler-accent">
            <Search size={19} className="shrink-0 text-styler-accent" />
            <input
              type="search"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search services, designs or styles..."
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
        </section>

        {/* Results */}
        <section className="py-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-styler-accent">
                Styler services
              </p>
              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                {humanize(category)} Services
              </h2>
              {!loading && (
                <p className="mt-1 text-sm text-styler-muted">
                  {items.length} {items.length === 1 ? "service" : "services"} found
                </p>
              )}
            </div>
            <Link
              href="/professionals"
              className="inline-flex items-center gap-1 text-sm font-semibold text-styler-accent hover:underline"
            >
              Browse professionals <ArrowUpRight size={16} />
            </Link>
          </div>

          {error && <Alert tone="error">{error}</Alert>}

          {loading ? (
            <LoadingBlock label="Finding services..." />
          ) : items.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                    className="group overflow-hidden rounded-2xl border border-styler-line bg-styler-surface shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-panel"
                  >
                    <Link href={profileHref} className="block">
                      <div className="relative aspect-[4/3] overflow-hidden bg-styler-surface-2">
                        <img
                          src={image}
                          alt={service.title || humanize(category)}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-styler-accent shadow-sm">
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

                    <div className="mx-5 mb-5 flex items-center justify-between gap-3 rounded-xl bg-styler-surface-2 p-3">
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
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-styler-surface text-styler-accent transition hover:bg-styler-accent hover:text-white"
                      >
                        <ArrowUpRight size={17} />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No services found"
              description={
                q
                  ? "Try another search term or clear your search."
                  : "New services will appear here as professionals join Styler."
              }
              icon={<Search size={24} />}
              action={
                <div className="flex flex-wrap justify-center gap-3">
                  {q && (
                    <button
                      onClick={() => setQ("")}
                      className="rounded-xl border border-styler-line px-4 py-2.5 text-sm font-semibold"
                    >
                      Clear search
                    </button>
                  )}
                  <Link
                    href="/professionals"
                    className="inline-flex items-center gap-2 rounded-xl bg-styler-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-styler-accent-strong"
                  >
                    Find professionals <ArrowUpRight size={16} />
                  </Link>
                </div>
              }
            />
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
