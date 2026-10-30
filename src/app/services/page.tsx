import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Clock3,
  Heart,
  Palette,
  Ruler,
  Search,
  Scissors,
  ShieldCheck,
  Shirt,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CATEGORIES, FEATURED_GROUPS } from "@/lib/categories";

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

const configuredBaseUrl = [
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.APP_URL,
].map((value) => value?.trim())
  .find((value) => {
    if (!value) return false;
    try {
      return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  });

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

async function loadServices(): Promise<{ items: RawService[]; error?: string }> {
  try {
    const baseUrl = (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
      configuredBaseUrl ||
      (process.env.NODE_ENV === "development" ? "http://localhost:3000" : undefined);

    if (!baseUrl) {
      throw new Error("Unable to determine the application origin for service listings.");
    }

    const url = new URL("/api/services", baseUrl);
    url.searchParams.set("limit", "100");

    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      console.error("Failed to load public services.", {
        status: response.status,
        url: url.pathname,
      });
      return {
        items: [],
        error: "Service listings are temporarily unavailable. Please try again shortly.",
      };
    }

    const payload: unknown = await response.json();
    return {
      items: extractServices(payload).filter((s) => s.isActive !== false),
    };
  } catch (error) {
    console.error("Failed to load public services.", error);
    return {
      items: [],
      error: "We couldn't load services right now. Please try again shortly.",
    };
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

const CATEGORY_ICON_BY_ID: Record<string, typeof Sparkles> = {
  hair_styling: WandSparkles,
  makeup: Palette,
  skincare: Sparkles,
  nails: Sparkles,
  massage: Heart,
  home_cleaning: Sparkles,
  plumbing: Ruler,
  fitness_wellness: Activity,
  lehenga_stitching: Sparkles,
  custom_clothing: Shirt,
  alterations: Scissors,
  personal_styling: WandSparkles,
  fashion_consulting: Palette,
  special_occasion_wear: Shirt,
  other: Sparkles,
};

const CATEGORY_GROUP_ORDER: Record<string, number> = {
  fashion: 0,
  beauty: 1,
  wellness: 2,
  home: 3,
  repairs: 4,
};

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  const params = await searchParams;
  const query = getParam(params.q).trim();
  const group = getParam(params.group);

  const serviceResult = await loadServices();
  const allServices = serviceResult.items
    .map(normalize)
    .filter((s): s is Service => s !== null);

  const categories = CATEGORIES.map((category) => ({
    key: slugify(category.slug),
    label: category.label,
    group: category.group,
    Icon: CATEGORY_ICON_BY_ID[category.slug] || Sparkles,
    count: allServices.filter((service) => service.categoryKey === slugify(category.slug)).length,
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
        <section className="border-b border-styler-line bg-styler-surface-2/60">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center lg:px-8 lg:py-14">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-styler-accent">
                <Sparkles size={15} /> Styler services
              </span>
              <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-styler-ink sm:text-4xl lg:text-5xl">
                Find the right service for{" "}
                <span className="text-styler-accent">what matters to you.</span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-styler-ink-soft sm:text-base sm:leading-7">
                Explore services across fashion, beauty, wellness and home. Compare clear pricing and book with approved professionals.
              </p>

              <form
                action="/services"
                method="get"
                role="search"
                className="mt-6 flex max-w-2xl flex-col gap-2 border border-styler-line bg-styler-surface p-2 shadow-soft focus-within:border-styler-line-strong sm:flex-row sm:items-center"
              >
                {activeGroup && <input type="hidden" name="group" value={activeGroup} />}
                <label className="flex min-w-0 flex-1 items-center gap-3 px-2">
                  <Search size={18} aria-hidden="true" className="shrink-0 text-styler-accent" />
                  <input
                    name="q"
                    type="search"
                    defaultValue={query}
                    placeholder="Search tailoring, makeup, cleaning..."
                    aria-label="Search services"
                    className="min-w-0 flex-1 bg-transparent py-3 text-sm text-styler-ink outline-none placeholder:text-styler-muted focus-visible:!outline-none"
                  />
                </label>
                <button className="inline-flex items-center justify-center gap-2 bg-styler-accent px-5 py-3 text-sm font-bold text-white transition hover:bg-styler-accent-strong">
                  Search services <ArrowUpRight size={16} />
                </button>
              </form>
            </div>

            <div className="grid grid-cols-3 divide-x divide-styler-line border-y border-styler-line py-4 lg:grid-cols-1 lg:divide-x-0 lg:divide-y lg:border-y-0 lg:py-0">
              {[
                { icon: BadgeCheck, title: "Approved", detail: "Professionals reviewed" },
                { icon: ShieldCheck, title: "Secure", detail: "Protected payments" },
                { icon: Clock3, title: "Simple", detail: "Easy booking process" },
              ].map(({ icon: Icon, title, detail }) => (
                <div key={title} className="flex flex-col items-center gap-2 px-2 text-center lg:flex-row lg:items-center lg:gap-3 lg:px-0 lg:py-4 lg:text-left">
                  <span className="grid h-9 w-9 shrink-0 place-items-center bg-styler-surface text-styler-accent">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <span>
                    <strong className="block text-xs font-bold sm:text-sm">{title}</strong>
                    <span className="mt-0.5 hidden text-xs text-styler-muted sm:block">{detail}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Category filters */}
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8" aria-label="Filter services by category">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-styler-accent">Explore services</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-styler-ink sm:text-4xl">
                What do you need help with?
              </h2>
              <p className="mt-3 text-sm text-styler-ink-soft">
                Browse by category and see available services in each area.
              </p>
            </div>
            <Link href="/professionals" className="inline-flex items-center gap-2 text-sm font-bold text-styler-accent hover:underline">
              Meet our professionals <ArrowRight size={16} />
            </Link>
          </div>

          <nav aria-label="Service categories" className="mt-7 space-y-7">
            <div>
              <h3 className="mb-3 text-sm font-semibold text-styler-ink">All categories</h3>
              <Link
                href={query ? `/services?q=${encodeURIComponent(query)}` : "/services"}
                aria-current={!activeGroup ? "page" : undefined}
                className={`inline-flex items-center gap-2 border px-3.5 py-2.5 text-sm font-semibold transition ${
                  !activeGroup
                    ? "border-styler-accent bg-styler-accent text-white"
                    : "border-styler-line bg-styler-surface text-styler-ink hover:border-styler-accent"
                }`}
              >
                All services <span className="text-xs opacity-75">{allServices.length}</span>
              </Link>
            </div>
            {[...FEATURED_GROUPS]
              .sort((a, b) => CATEGORY_GROUP_ORDER[a.key] - CATEGORY_GROUP_ORDER[b.key])
              .map((groupMeta) => {
              const groupCategories = categories.filter((category) => category.group === groupMeta.key);
              if (!groupCategories.length) return null;

              return (
                <div key={groupMeta.key}>
                      <h3 className="mb-3 text-sm font-semibold text-styler-ink">{groupMeta.label}</h3>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                        {groupCategories.map(({ key, label, Icon, count }) => {
                          const selected = activeGroup === key;
                          return (
                            <Link
                              key={key}
                              href={`/services?group=${encodeURIComponent(key)}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
                              aria-current={selected ? "page" : undefined}
                              className={`flex min-h-16 items-center gap-2.5 border px-3 py-2.5 transition ${
                                selected
                                  ? "border-styler-accent bg-styler-accent-soft"
                                  : "border-styler-line bg-styler-surface hover:border-styler-line-strong hover:bg-styler-surface-2"
                              }`}
                            >
                              <span className={`grid h-9 w-9 shrink-0 place-items-center ${selected ? "bg-styler-surface text-styler-accent" : "bg-styler-surface-2 text-styler-accent"}`}>
                                <Icon size={17} aria-hidden="true" />
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-xs font-semibold text-styler-ink">{label}</span>
                                <span className="mt-0.5 block text-[10px] text-styler-muted">
                                  {count ? `${count} ${count === 1 ? "service" : "services"}` : "View category"}
                                </span>
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                </div>
              );
            })}
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

          {serviceResult.error ? (
            <div role="alert" className="mt-7 border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
              {serviceResult.error}
            </div>
          ) : services.length > 0 ? (
            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {services.map((service) => (
                <article
                  key={service.id}
                  className="group overflow-hidden rounded-lg border border-styler-line bg-styler-surface shadow-soft transition duration-300 hover:-translate-y-0.5 hover:shadow-panel"
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
                      <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                      <span className="absolute bottom-3 left-3 border border-white/70 bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-styler-accent shadow-sm">
                        {service.category}
                      </span>
                      <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center bg-white/95 text-styler-accent shadow-sm transition group-hover:rotate-45">
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

                      <div className="mt-4 flex items-center justify-between bg-styler-accent-soft px-3 py-2.5 text-sm font-semibold text-styler-accent">
                        Find a professional <ArrowRight size={16} />
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-7 border border-dashed border-styler-line bg-styler-surface px-6 py-14 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center bg-styler-accent-soft text-styler-accent">
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
                  className="border border-styler-line px-5 py-3 text-sm font-semibold text-styler-ink transition hover:border-styler-accent"
                >
                  View all services
                </Link>
                <Link
                  href="/professionals"
                  className="bg-styler-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-styler-accent-strong"
                >
                  Browse professionals <ArrowRight size={16} className="ml-1 inline" />
                </Link>
              </div>
            </div>
          )}
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 border border-styler-line bg-styler-surface-2/70 px-5 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-styler-accent">
                <Sparkles size={15} /> Styler marketplace
              </span>
              <h2 className="mt-3 text-2xl font-bold leading-tight text-styler-ink sm:text-3xl">
                Need help choosing a service?
              </h2>
              <p className="mt-2 text-sm leading-6 text-styler-ink-soft">
                Browse approved professionals and find the right person for your needs.
              </p>
            </div>
            <Link
              href="/professionals"
              className="inline-flex shrink-0 items-center justify-center gap-2 bg-styler-accent px-5 py-3 text-sm font-bold text-white transition hover:bg-styler-accent-strong"
            >
              Browse professionals <ArrowUpRight size={16} />
            </Link>
          </div>
        </section>

      </main>

      <SiteFooter />
    </div>
  );
}