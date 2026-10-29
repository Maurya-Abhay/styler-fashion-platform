import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Clock3,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CATEGORIES } from "@/lib/categories";

export const metadata: Metadata = {
  title: "Services | Styler",
  description:
    "Discover fashion, beauty, wellness, home and repair services from approved professionals on Styler.",
};

export const dynamic = "force-dynamic";

type RawService = {
  _id?: string;
  id?: string;
  slug?: string;
  title?: string;
  name?: string;
  category?: string | { name?: string; label?: string; slug?: string } | null;
  description?: string;
  blurb?: string;
  pricePaise?: number;
  price?: number;
  startingPrice?: number;
  pricingType?: "fixed" | "starting_from" | "quote_required";
  durationMinutes?: number;
  image?: string;
  imageUrl?: string;
  images?: Array<string | { url?: string; secure_url?: string }>;
  isActive?: boolean;
};

type Service = {
  id: string;
  title: string;
  category: string;
  categoryKey: string;
  description: string;
  price?: number;
  pricingType?: "fixed" | "starting_from" | "quote_required";
  durationMinutes?: number;
  image: string;
};

type Params = Promise<{
  group?: string | string[];
  q?: string | string[];
}>;

const BASE_URL =
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

const PHOTOS = [
  "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=85",
  "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=1000&q=85",
  "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=1000&q=85",
  "https://images.unsplash.com/photo-1591369822096-ffd140ec948f?auto=format&fit=crop&w=1000&q=85",
];

function text(...values: unknown[]): string | undefined {
  return values.find(
    (v): v is string => typeof v === "string" && !!v.trim(),
  );
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function labelCategory(category: RawService["category"]) {
  const value = typeof category === "string"
    ? category
    : category && typeof category === "object"
      ? text(category.label, category.name, category.slug)
      : undefined;

  return (value || "Fashion service")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractServices(payload: unknown): RawService[] {
  if (Array.isArray(payload)) return payload as RawService[];
  if (!payload || typeof payload !== "object") return [];

  const r = payload as Record<string, unknown>;
  const nested = r.data && typeof r.data === "object" && !Array.isArray(r.data)
    ? r.data as Record<string, unknown>
    : undefined;

  const list = [
    r.items, r.services, r.data,
    nested?.items, nested?.services, nested?.results,
  ].find(Array.isArray);

  return list ? list as RawService[] : [];
}

async function loadServices(): Promise<RawService[]> {
  try {
    const url = new URL("/api/services", BASE_URL);
    url.searchParams.set("limit", "100");

    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return [];

    const payload: unknown = await response.json();
    return extractServices(payload).filter((s) => s.isActive !== false);
  } catch {
    return [];
  }
}

function normalize(item: RawService, index: number): Service | null {
  const title = text(item.title, item.name);
  if (!title) return null;

  const category = labelCategory(item.category);
  const rawCategory = typeof item.category === "string"
    ? item.category
    : item.category && typeof item.category === "object"
      ? text(item.category.slug, item.category.name, item.category.label) || category
      : category;

  const first = item.images?.[0];
  const image = text(
    typeof first === "string" ? first : undefined,
    typeof first === "object" ? first?.url : undefined,
    typeof first === "object" ? first?.secure_url : undefined,
    item.imageUrl,
    item.image,
  );

  const keywords = `${title} ${category}`.toLowerCase();
  const fallback = keywords.includes("bridal") || keywords.includes("lehenga")
    ? PHOTOS[0]
    : keywords.includes("stitch") || keywords.includes("alter")
      ? PHOTOS[2]
      : keywords.includes("styling") || keywords.includes("consult")
        ? PHOTOS[3]
        : PHOTOS[index % PHOTOS.length];

  const price = item.pricingType === "quote_required"
    ? undefined
    : typeof item.pricePaise === "number" && Number.isFinite(item.pricePaise)
    ? item.pricePaise / 100
    : typeof item.startingPrice === "number" && Number.isFinite(item.startingPrice)
      ? item.startingPrice
      : typeof item.price === "number" && Number.isFinite(item.price)
        ? item.price
        : undefined;

  return {
    id: text(item._id, item.id, item.slug) || slugify(title),
    title,
    category,
    categoryKey: slugify(rawCategory),
    description: text(item.description, item.blurb) ||
      "A personalised service from a Styler professional.",
    price,
    pricingType: item.pricingType,
    durationMinutes: typeof item.durationMinutes === "number" && item.durationMinutes > 0
      ? item.durationMinutes
      : undefined,
    image: image || fallback,
  };
}

function getParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDuration(minutes?: number) {
  if (!minutes) return undefined;
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours} hr ${remaining} min` : `${hours} hr`;
}

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  const params = await searchParams;
  const query = getParam(params.q).trim();
  const group = getParam(params.group);

  const allServices = (await loadServices())
    .map(normalize)
    .filter((s): s is Service => s !== null);

  const categories = CATEGORIES.map((category) => ({
    key: slugify(category.slug),
    label: category.label,
  }));

  const activeGroup = categories.some((c) => c.key === group) ? group : "";

  const services = allServices.filter((s) => {
    const matchesGroup = !activeGroup || s.categoryKey === activeGroup;
    const searchable = `${s.title} ${s.category} ${s.description}`.toLowerCase();
    return matchesGroup && (!query || searchable.includes(query.toLowerCase()));
  });

  return (
    <div className="min-h-screen bg-styler-canvas text-styler-ink">
      <SiteHeader />

      <main>
        {/* Marketplace hero */}
        <section className="px-4 pt-5 sm:px-6 lg:px-8">
          <div className="relative isolate mx-auto flex min-h-[540px] max-w-[1600px] items-center overflow-hidden rounded-[28px] bg-[#210d20] sm:min-h-[620px] lg:min-h-[690px]">
            <img
              src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=2000&q=90"
              alt="Styler service professionals"
              fetchPriority="high"
              className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#210d20]/95 via-[#210d20]/75 to-[#210d20]/10" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#210d20]/60 via-transparent to-black/10" />

            <div className="w-full max-w-3xl px-6 py-16 sm:px-12 lg:px-16 lg:py-24">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-pink-200 backdrop-blur-md">
                <Sparkles size={14} /> Trusted local services
              </span>

              <h1 className="mt-7 text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-7xl">
                Great service.
                <br />
                Right nearby.
                <br />
                <span className="font-serif italic text-pink-300">
                  Made personal.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-7 text-white/80 sm:text-lg">
                Browse fashion, beauty, wellness, home and repair services from approved professionals.
              </p>

              <form
                action="/services"
                method="get"
                role="search"
                className="mt-8 flex max-w-2xl flex-col gap-2 rounded-2xl border border-white/20 bg-styler-surface p-2 shadow-2xl sm:flex-row"
              >
                {activeGroup && <input type="hidden" name="group" value={activeGroup} />}

                <label className="flex min-w-0 flex-1 items-center gap-3 px-3">
                  <Search size={20} className="shrink-0 text-styler-accent" />
                  <input
                    name="q"
                    type="search"
                    defaultValue={query}
                    placeholder="Search tailoring, makeup, cleaning, plumbing..."
                    aria-label="Search services"
                    className="min-w-0 flex-1 bg-transparent py-3 text-sm text-styler-ink outline-none placeholder:text-styler-muted"
                  />
                </label>

                <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-styler-accent px-6 py-3.5 text-sm font-bold text-white transition hover:bg-styler-accent-strong">
                  Explore services <ArrowUpRight size={17} />
                </button>
              </form>

              <div className="mt-6 flex flex-wrap gap-4 text-xs font-medium text-white/90">
                <span className="flex items-center gap-2"><BadgeCheck size={16} className="text-pink-300" /> Approved professionals</span>
                <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-pink-300" /> Secure payments</span>
                <span className="flex items-center gap-2"><Clock3 size={16} className="text-pink-300" /> Easy booking</span>
              </div>
            </div>
          </div>
        </section>

        {/* Category filters */}
        <section className="mx-auto max-w-7xl px-4 pb-4 pt-16 sm:px-6 lg:px-8" aria-label="Filter services by category">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-styler-accent">Explore services</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-styler-ink sm:text-4xl">
                What do you need help with?
              </h2>
              <p className="mt-3 text-sm text-styler-ink-soft">
                Choose from fashion, beauty, wellness, home and repair categories.
              </p>
            </div>
            <Link href="/professionals" className="inline-flex items-center gap-2 text-sm font-bold text-styler-accent hover:underline">
              Meet our professionals <ArrowRight size={16} />
            </Link>
          </div>

          <nav aria-label="Service categories" className="mt-7 flex gap-2 overflow-x-auto pb-3">
            <Link
              href={query ? `/services?q=${encodeURIComponent(query)}` : "/services"}
              className={`shrink-0 rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
                !activeGroup
                  ? "border-styler-accent bg-styler-accent text-white"
                  : "border-styler-line bg-styler-surface text-styler-ink hover:border-styler-accent"
              }`}
            >
              All services <span className="ml-1 opacity-70">{allServices.length}</span>
            </Link>

            {categories.map((category) => (
              <Link
                key={category.key}
                href={`/services?group=${encodeURIComponent(category.key)}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
                className={`shrink-0 rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
                  activeGroup === category.key
                    ? "border-styler-accent bg-styler-accent text-white"
                    : "border-styler-line bg-styler-surface text-styler-ink hover:border-styler-accent"
                }`}
              >
                {category.label}
              </Link>
            ))}
          </nav>
        </section>

        {/* Services Grid */}
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-styler-accent">
                Available near you
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-styler-ink sm:text-3xl">
                {query
                  ? `Results for "${query}"`
                  : activeGroup
                    ? categories.find((c) => c.key === activeGroup)?.label
                    : "Discover all services"}
              </h2>
              <p className="mt-2 text-sm text-styler-ink-soft">
                {services.length} {services.length === 1 ? "service" : "services"} available
              </p>
            </div>

            {(query || activeGroup) && (
              <Link
                href="/services"
                className="text-sm font-semibold text-styler-accent hover:underline"
              >
                Clear filters
              </Link>
            )}
          </div>

          {services.length > 0 ? (
            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {services.map((service) => (
                <article
                  key={service.id}
                  className="group overflow-hidden rounded-2xl border border-styler-line bg-styler-surface shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-panel"
                >
                  <Link
                    href={`/professionals?q=${encodeURIComponent(service.title)}`}
                    aria-label={`Find professionals for ${service.title}`}
                    className="block"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-styler-surface-2">
                      <img
                        src={service.image}
                        alt={service.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                      <span className="absolute bottom-3 left-3 rounded-full border border-white/70 bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-styler-accent shadow-sm">
                        {service.category}
                      </span>
                      <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-styler-accent shadow-sm transition group-hover:rotate-45">
                        <ArrowUpRight size={17} />
                      </span>
                    </div>

                    <div className="p-5">
                      <h3 className="text-base font-bold leading-6 text-styler-ink transition group-hover:text-styler-accent">
                        {service.title}
                      </h3>

                      <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-styler-ink-soft">
                        {service.description}
                      </p>

                      <div className="mt-5 flex items-end justify-between gap-3 border-t border-styler-line pt-4">
                        <div>
                          <p className="text-xs text-styler-muted">
                            {service.pricingType === "quote_required"
                              ? "Pricing"
                              : service.pricingType === "starting_from"
                                ? "Starting price"
                                : "Service price"}
                          </p>
                          <p className="mt-1 text-lg font-bold text-styler-accent">
                            {service.pricingType === "quote_required"
                              ? "Quote required"
                              : typeof service.price === "number"
                              ? `₹${formatPrice(service.price)}`
                              : "Price on request"}
                          </p>
                        </div>

                        {service.durationMinutes ? (
                          <span className="flex items-center gap-1 text-xs text-styler-muted">
                            <Clock3 size={14} />
                            {formatDuration(service.durationMinutes)}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-4 flex items-center justify-between rounded-xl bg-styler-accent-soft px-3 py-2.5 text-sm font-semibold text-styler-accent">
                        Find a professional <ArrowRight size={16} />
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-7 rounded-3xl border border-dashed border-styler-line bg-styler-surface px-6 py-14 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-styler-accent-soft text-styler-accent">
                <Sparkles size={25} />
              </span>
              <h3 className="mt-5 text-xl font-bold text-styler-ink">
                No services found
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-styler-ink-soft">
                {query || activeGroup
                  ? "Try another search or clear your filters to explore all available services."
                  : "Services from approved professionals will appear here as they become available."}
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href="/services"
                  className="rounded-xl border border-styler-line px-5 py-3 text-sm font-semibold text-styler-ink transition hover:border-styler-accent"
                >
                  View all services
                </Link>
                <Link
                  href="/professionals"
                  className="rounded-xl bg-styler-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-styler-accent-strong"
                >
                  Browse professionals <ArrowRight size={16} className="ml-1 inline" />
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* Premium CTA */}
        <section className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
          <div className="relative isolate overflow-hidden rounded-[28px] bg-[#291025] px-6 py-10 text-white sm:px-10 sm:py-14 lg:px-14">
            <img
              src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1500&q=85"
              alt=""
              loading="lazy"
              className="absolute inset-0 -z-20 h-full w-full object-cover object-center opacity-35"
            />
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#291025] via-[#291025]/90 to-[#291025]/40" />

            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-pink-200">
                <Sparkles size={15} /> Styler marketplace
              </span>
              <h2 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
                Find the right help for{" "}
                <span className="font-serif italic text-pink-300">
                  what you need.
                </span>
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-7 text-white/75 sm:text-base">
                Explore approved professionals, compare services and request the help you need.
              </p>

              <Link
                href="/professionals"
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-[#45133f] transition hover:bg-pink-100"
              >
                Find your professional <ArrowUpRight size={17} />
              </Link>
            </div>
          </div>
        </section>

      </main>

      <SiteFooter />
    </div>
  );
}