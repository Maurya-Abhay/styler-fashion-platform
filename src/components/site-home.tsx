
"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight, ArrowUpRight, BadgeCheck, CalendarCheck, CheckCircle2,
  ChevronRight, Clock3, Heart, MapPin, Palette, Ruler, Search,
  Scissors, ShieldCheck, Shirt, Sparkles, WandSparkles, Activity,
} from "lucide-react";
import { apiRequest, unwrapItems } from "@/components/api-client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CATEGORIES as MARKETPLACE_CATEGORIES } from "@/lib/categories";

type ServiceImage = { url?: string; altText?: string };

type ProfessionalSummary = {
  id?: string;
  _id?: string;
  slug?: string;
  displayName?: string;
  name?: string;
  bio?: string;
  profilePhoto?: string | { url?: string } | null;
  profileImageUrl?: string;
  city?: string;
  state?: string;
  experienceYears?: number;
  categories?: string[];
  services?: ServiceSummary[];
};

type ServiceSummary = {
  id?: string;
  _id?: string;
  slug?: string;
  title?: string;
  description?: string;
  category?: string;
  pricingType?: "fixed" | "starting_from" | "quote_required";
  pricePaise?: number;
  durationMinutes?: number;
  images?: ServiceImage[];
  professional?: ProfessionalSummary | null;
};

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
  alterations: Ruler,
  personal_styling: WandSparkles,
  fashion_consulting: Palette,
  special_occasion_wear: Scissors,
  other: Sparkles,
};

const CATEGORY_IMAGE_BY_ID: Record<string, string> = {
  hair_styling: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=700&q=85",
  makeup: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=700&q=85",
  skincare: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=700&q=85",
  nails: "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=700&q=85",
  massage: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=700&q=85",
  home_cleaning: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=700&q=85",
  plumbing: "https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=700&q=85",
  fitness_wellness: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=700&q=85",
  lehenga_stitching: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=700&q=85",
  custom_clothing: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=700&q=85",
  alterations: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=700&q=85",
  personal_styling: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=700&q=85",
  fashion_consulting: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=700&q=85",
  special_occasion_wear: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=700&q=85",
  other: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=700&q=85",
};

const CATEGORY_GROUP_ORDER: Record<string, number> = {
  fashion: 0,
  beauty: 1,
  wellness: 2,
  home: 3,
  repairs: 4,
};

const CATEGORIES = [...MARKETPLACE_CATEGORIES]
  .sort((a, b) => CATEGORY_GROUP_ORDER[a.group] - CATEGORY_GROUP_ORDER[b.group])
  .map((category) => ({
  id: category.slug,
  label: category.label,
  description: category.blurb,
  icon: CATEGORY_ICON_BY_ID[category.slug] || Sparkles,
  image: CATEGORY_IMAGE_BY_ID[category.slug],
  }));

const SERVICE_FALLBACK_IMAGES: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((item) => [item.id, item.image.replace("w=700", "w=900")])
);

const TRUST_ITEMS = [
  { icon: BadgeCheck, title: "Approved professionals", text: "Reviewed before joining" },
  { icon: ShieldCheck, title: "Secure payments", text: "Protected checkout" },
  { icon: CalendarCheck, title: "Simple booking", text: "Choose a preferred time" },
  { icon: Clock3, title: "Fast matching", text: "10-minute response window" },
];

function formatPrice(pricePaise?: number, pricingType?: string) {
  if (pricingType === "quote_required" || typeof pricePaise !== "number") {
    return "Request a quote";
  }
  return `From ${new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.max(0, pricePaise) / 100)}`;
}

function professionalImage(pro: ProfessionalSummary) {
  if (typeof pro.profilePhoto === "string") return pro.profilePhoto;
  return pro.profilePhoto?.url || pro.profileImageUrl || "";
}

function categoryName(category?: string) {
  return CATEGORIES.find((item) => item.id === category)?.label || "Fashion service";
}

export function SiteHome() {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [services, setServices] = useState<ServiceSummary[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const featuredProfessional = professionals[0];
  const featuredProfessionalName = featuredProfessional?.displayName || featuredProfessional?.name;

  useEffect(() => {
    const controller = new AbortController();

    async function loadHomepageData() {
      const results = await Promise.allSettled([
        apiRequest<unknown>("/api/services?limit=8", { signal: controller.signal }),
        apiRequest<unknown>("/api/professionals?limit=4", { signal: controller.signal }),
      ]);

      if (controller.signal.aborted) return;

      setServices(results[0].status === "fulfilled"
        ? unwrapItems(results[0].value) as ServiceSummary[] : []);
      setProfessionals(results[1].status === "fulfilled"
        ? unwrapItems(results[1].value) as ProfessionalSummary[] : []);
      setApiError(results.some((result) => result.status === "rejected"));
      setLoading(false);
    }

    void loadHomepageData();
    return () => controller.abort();
  }, []);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (city.trim()) params.set("city", city.trim());
    const search = params.toString();
    window.location.href = search ? `/professionals?${search}` : "/professionals";
  }

  return (
    <div className="min-h-screen bg-styler-canvas text-styler-ink antialiased">
      <SiteHeader />
      <main>
        <section className="relative isolate overflow-hidden bg-[#f5f8ff] dark:bg-[#10121c]">
          <div className="absolute inset-0 hidden lg:block">
            <picture className="absolute inset-0">
              <img
                src="/images/hero-desktop.webp"
                alt=""
                fetchPriority="high"
                className="h-full w-full object-cover object-[62%_center]"
              />
            </picture>
            <div className="absolute inset-0 bg-gradient-to-r from-[#f5f8ff] via-[#f5f8ff]/95 via-40% to-transparent to-75% dark:from-[#10121c] dark:via-[#10121c]/90" />
            <div className="absolute inset-y-0 left-[42%] w-[18%] bg-gradient-to-r from-[#f5f8ff]/70 to-transparent dark:from-[#10121c]/60" />
          </div>

          <div className="relative h-[min(96vw,440px)] min-h-[320px] overflow-hidden lg:hidden">
            <picture className="absolute inset-0">
              <source media="(max-width: 767px)" srcSet="/images/hero-mobile.webp" />
              <img
                src="/images/hero-desktop.webp"
                alt="A fashion professional fitting a detailed bridal outfit in her studio"
                fetchPriority="high"
                className="h-full w-full object-cover object-[center_42%]"
              />
            </picture>
            <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-[#f5f8ff] dark:to-[#10121c]" />
            <div className="absolute bottom-8 right-4 inline-flex items-center gap-2 rounded-lg border border-white/80 bg-white/95 px-3 py-2 shadow-lg">
              <span className="grid h-8 w-8 place-items-center rounded-md bg-pink-50 text-styler-accent"><Scissors size={15} /></span>
              <span>
                <strong className="block text-[10px] leading-4 text-[#17264a]">Made for your moment</strong>
                <span className="block text-[9px] text-slate-500">Find your fashion expert</span>
              </span>
              <ArrowRight size={13} className="ml-1 text-[#2459c7]" />
            </div>
          </div>

          <div className="relative z-10 mx-auto flex w-full max-w-7xl items-center px-4 pb-10 sm:px-6 sm:pb-12 lg:min-h-[calc(100svh-64px)] lg:px-8 lg:py-12">
            <div className="relative -mt-12 w-full max-w-[610px] lg:mt-0 lg:w-[54%]">
              <span className="inline-flex items-center gap-2 rounded-md border border-blue-100 bg-white/85 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#2459c7] shadow-sm backdrop-blur sm:text-xs">
                <Sparkles size={14} className="text-styler-accent" /> Your style, our priority
              </span>

              <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif" }} className="mt-4 max-w-[620px] text-[2.55rem] font-bold leading-[1.06] tracking-[-0.035em] text-[#142652] dark:text-white sm:text-5xl lg:mt-6 lg:text-[3.75rem]">
                Find your perfect{" "}
                <span className="text-[#3973ef] dark:text-blue-300">fashion professional.</span>
              </h1>

              <p className="mt-4 max-w-[500px] text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base sm:leading-7 lg:mt-5">
                From bridal wear and custom outfits to alterations and personal styling, meet trusted professionals who bring your vision to life.
              </p>

              <form
                onSubmit={submitSearch}
                role="search"
                className="mt-5 flex flex-col gap-1.5 rounded-lg border border-transparent bg-white p-2 shadow-[0_12px_32px_rgba(27,57,112,0.12)] transition focus-within:border-blue-200 focus-within:ring-4 focus-within:ring-blue-100/70 sm:mt-6 sm:p-2.5 lg:mt-8 lg:flex-row lg:items-center dark:focus-within:border-blue-900 dark:focus-within:ring-blue-950/60"
              >
                <label className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5">
                  <Search size={18} className="shrink-0 text-[#3973ef]" />
                  <input
                    name="q"
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Bridal wear, tailoring, styling..."
                    aria-label="Search fashion services"
                    className="min-w-0 flex-1 bg-transparent py-3 text-sm text-[#17264a] outline-none placeholder:text-slate-400 focus-visible:!outline-none"
                  />
                </label>

                <span aria-hidden="true" className="mx-2 hidden h-8 w-px bg-slate-200 lg:block" />

                <label className="flex min-w-0 items-center gap-2.5 px-2.5 lg:w-36">
                  <MapPin size={17} className="shrink-0 text-[#3973ef]" />
                  <input
                    name="city"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    placeholder="Your city"
                    aria-label="City"
                    className="w-full min-w-0 bg-transparent py-3 text-sm text-[#17264a] outline-none placeholder:text-slate-400 focus-visible:!outline-none"
                  />
                </label>

                <button
                  type="submit"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-[#2463eb] px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#174fc9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2463eb] lg:px-5"
                >
                  Find a professional <ArrowUpRight size={16} />
                </button>
              </form>

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-medium text-slate-600 dark:text-slate-300 sm:mt-5 sm:gap-x-5 sm:text-xs">
                <span className="inline-flex items-center gap-1.5"><BadgeCheck size={14} className="text-[#3973ef]" /> Verified experts</span>
                <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-[#3973ef]" /> Secure booking</span>
                <span className="inline-flex items-center gap-1.5"><Clock3 size={14} className="text-[#3973ef]" /> Quick matching</span>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2 lg:mt-7">
                <span className="mr-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">Popular:</span>
                {["lehenga_stitching", "custom_clothing", "alterations"].map((category) => (
                  <Link
                    key={category}
                    href={`/services/${category}`}
                    className="rounded-md border border-blue-100 bg-white/75 px-3 py-1.5 text-[10px] font-semibold text-[#29477f] transition hover:border-blue-300 hover:bg-white hover:text-[#174fc9] dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
                  >
                    {categoryName(category)}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute right-[4.5%] top-[15%] z-10 hidden rounded-lg border border-white/80 bg-white/95 px-4 py-3 shadow-[0_12px_35px_rgba(25,49,91,0.12)] backdrop-blur lg:block">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-pink-50 text-styler-accent"><Shirt size={19} /></span>
              <span>
                <strong className="block text-xs text-[#17264a]">Bridal wear</strong>
                <span className="mt-0.5 block text-[10px] text-slate-500">Designed around you</span>
              </span>
              <ChevronRight size={15} className="text-[#3973ef]" />
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-[14%] right-[4.5%] z-10 hidden items-center gap-3 rounded-lg border border-white/80 bg-white/95 px-4 py-3 shadow-[0_12px_35px_rgba(25,49,91,0.12)] backdrop-blur lg:flex">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-blue-50 text-[#3973ef]"><BadgeCheck size={18} /></span>
            <span>
              <strong className="block max-w-40 truncate text-[11px] text-[#17264a]">Approved fashion experts</strong>
              <span className="mt-0.5 block text-[10px] text-slate-500">{featuredProfessional?.city ? `Discover in ${featuredProfessional.city}` : "Ready to make it yours"}</span>
            </span>
          </div>
        </section>

        {/* Service categories */}
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8" aria-label="Browse fashion service categories">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-styler-accent">Find your kind of style</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">What are we creating today?</h2>
              <p className="mt-2 text-sm text-styler-muted">Browse services from approved fashion professionals.</p>
            </div>
            <Link href="/services" className="inline-flex items-center gap-1 text-sm font-semibold text-styler-accent hover:underline">
              Explore services <ArrowRight size={15} />
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6">
            {CATEGORIES.map(({ id, label, icon: Icon, image }) => {
              return (
                <Link key={id} href={`/services/${id}`} className="group overflow-hidden rounded-lg border border-styler-line bg-styler-surface transition hover:-translate-y-0.5 hover:border-styler-line-strong hover:shadow-soft">
                  <div className="relative h-[4.5rem] overflow-hidden sm:h-24">
                    <img src={image} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
                    <span className="absolute bottom-1.5 left-1.5 grid h-7 w-7 place-items-center rounded-md bg-white/95 text-styler-accent sm:bottom-2 sm:left-2 sm:h-8 sm:w-8"><Icon size={16} /></span>
                  </div>
                  <div className="flex min-h-[4.25rem] items-center justify-between gap-1.5 px-2 py-2 sm:min-h-[4.5rem] sm:px-3">
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 text-[11px] font-bold leading-snug sm:text-sm">{label}</h3>
                      <span className="mt-1 block text-[9px] font-medium text-styler-muted sm:text-[10px]">Explore services</span>
                    </div>
                    <ChevronRight size={14} className="shrink-0 text-styler-accent transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

       
        {/* Popular fashion services */}
        <section className="bg-styler-surface-2/70 py-10 sm:py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-styler-accent">Picked for you</p>
                <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Popular fashion services</h2>
                <p className="mt-2 text-sm text-styler-muted">Discover services and pricing from professionals.</p>
              </div>
              <Link href="/services" className="hidden items-center gap-1 text-sm font-semibold text-styler-accent sm:inline-flex">
                View all <ArrowRight size={15} />
              </Link>
            </div>

            {loading ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-64 animate-pulse rounded-2xl bg-styler-surface" />
                ))}
              </div>
            ) : services.length ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {services.slice(0, 4).map((service, i) => {
                  const image =
                    service.images?.find((item) => item.url)?.url ||
                    SERVICE_FALLBACK_IMAGES[service.category || ""] ||
                    CATEGORIES[i % CATEGORIES.length].image;
                  const profile = service.professional;
                  const href = profile?.slug
                    ? `/professionals/${profile.slug}`
                    : `/services/${service.category || "lehenga_stitching"}`;

                  return (
                    <Link
                      key={service._id || service.id || `${service.category}-${i}`}
                      href={href}
                      className="group overflow-hidden rounded-lg border border-styler-line bg-styler-surface shadow-soft transition hover:-translate-y-0.5 hover:shadow-panel"
                    >
                      <div className="relative h-44 overflow-hidden">
                        <img src={image} alt={service.title || "Fashion service"} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                        <span className="absolute left-3 top-3 rounded-md bg-white/95 px-2.5 py-1 text-[10px] font-bold text-styler-accent">
                          {categoryName(service.category)}
                        </span>
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold group-hover:text-styler-accent">
                          {service.title || categoryName(service.category)}
                        </h3>
                        <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-styler-muted">
                          {service.description || "Discuss your requirements with a fashion professional."}
                        </p>
                        <div className="mt-4 flex items-center justify-between border-t border-styler-line pt-3">
                          <span className="text-sm font-bold text-styler-accent">
                            {formatPrice(service.pricePaise, service.pricingType)}
                          </span>
                          {service.durationMinutes ? (
                            <span className="text-xs text-styler-muted">
                              {Math.round(service.durationMinutes / 60 * 10) / 10} hr
                            </span>
                          ) : null}
                        </div>
                        {profile?.displayName && (
                          <p className="mt-2 truncate text-xs text-styler-muted">
                            By {profile.displayName}{profile.city ? ` · ${profile.city}` : ""}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="mt-6 rounded-lg border border-dashed border-styler-line bg-styler-surface px-6 py-10 text-center">
                <Scissors size={28} className="mx-auto text-styler-accent" />
                <h3 className="mt-3 font-bold">New services coming soon</h3>
                <p className="mt-2 text-sm text-styler-muted">
                  Explore professionals while new services are added.
                </p>
                <Link href="/professionals" className="mt-4 inline-flex items-center gap-2 rounded-md bg-styler-accent px-4 py-2.5 text-sm font-semibold text-white">
                  Find a professional <ArrowRight size={15} />
                </Link>
                {apiError && <p className="mt-3 text-xs text-styler-muted">Some data could not be loaded.</p>}
              </div>
            )}
          </div>
        </section>

        {/* Featured professionals */}
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-styler-accent">Meet the makers</p>
              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Professionals with an eye for detail</h2>
              <p className="mt-2 text-sm text-styler-muted">Discover designers, tailors and stylists.</p>
            </div>
            <Link href="/professionals" className="inline-flex items-center gap-1 text-sm font-semibold text-styler-accent hover:underline">
              Meet all professionals <ArrowRight size={15} />
            </Link>
          </div>

          {professionals.length ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {professionals.slice(0, 4).map((pro, i) => {
                const name = pro.displayName || pro.name || "Styler Professional";
                const image = professionalImage(pro) || [
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=85",
                  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=85",
                  "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=800&q=85",
                  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=85",
                ][i % 4];
                const categories = (pro.categories || []).slice(0, 2).map(categoryName).join(" · ");
                const identifier = pro.slug || pro.id || pro._id;

                return (
                  <Link
                    key={identifier || name}
                    href={identifier ? `/professionals/${identifier}` : "/professionals"}
                    className="group overflow-hidden rounded-lg border border-styler-line bg-styler-surface shadow-soft transition hover:-translate-y-0.5 hover:shadow-panel"
                  >
                    <div className="relative h-52 overflow-hidden bg-styler-surface-2">
                      <img src={image} alt={name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                      <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                        <BadgeCheck size={13} /> Approved
                      </span>
                      <span className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md bg-white/95 text-styler-accent">
                        <Heart size={15} />
                      </span>
                    </div>
                    <div className="p-4">
                      <h3 className="flex items-center gap-1.5 font-bold group-hover:text-styler-accent">
                        {name} <BadgeCheck size={15} className="text-sky-600" />
                      </h3>
                      <p className="mt-1 truncate text-xs text-styler-muted">
                        {categories || "Fashion designer & tailor"}
                      </p>
                      <p className="mt-3 flex items-center gap-1 text-xs text-styler-muted">
                        <MapPin size={13} /> {[pro.city, pro.state].filter(Boolean).join(", ") || "India"}
                      </p>
                      {typeof pro.experienceYears === "number" && (
                        <p className="mt-2 text-xs text-styler-muted">{pro.experienceYears}+ years of experience</p>
                      )}
                      <div className="mt-4 flex items-center justify-between border-t border-styler-line pt-3 text-sm font-semibold text-styler-accent">
                        View profile <ArrowUpRight size={15} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : !loading ? (
            <div className="mt-6 rounded-lg border border-styler-line bg-styler-surface p-8 text-center text-sm text-styler-muted">
              Approved professionals will appear here as they join Styler.
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-72 animate-pulse rounded-lg bg-styler-surface" />
              ))}
            </div>
          )}
        </section>

        {/* Call to action */}
        <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 sm:pb-16 lg:px-8">
          <div className="relative isolate overflow-hidden rounded-xl bg-[#35102f] px-6 py-10 text-white shadow-soft sm:px-10 sm:py-14 lg:px-14">
            <img
              src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1600&q=85"
              alt="Fashion styling inspiration"
              loading="lazy"
              className="absolute inset-0 -z-20 h-full w-full object-cover opacity-40"
            />
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#35102f] via-[#45133f]/90 to-transparent" />
            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-pink-200">Your style, your story</p>
              <h2 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">
                A special outfit starts with{" "}
                <span className="font-serif italic text-pink-200">the right hands.</span>
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/80">
                From wedding lehengas to everyday alterations, find professionals who understand the details.
              </p>
              <Link href="/professionals" className="mt-6 inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-bold text-[#45133f] transition hover:bg-pink-50">
                Find your professional <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="bg-styler-surface-2/70 py-10 sm:py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-styler-accent">Simple from the start</p>
              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Your next look, in four easy steps</h2>
              <p className="mt-2 text-sm leading-6 text-styler-muted">
                Tell us what you need and let the right professional come to you.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { number: "01", icon: Search, title: "Tell us what you need", text: "Choose a service, location and preferred time." },
                { number: "02", icon: Sparkles, title: "Get matched quickly", text: "Your request reaches suitable approved professionals." },
                { number: "03", icon: CalendarCheck, title: "Confirm your booking", text: "Confirm with the professional and pay securely." },
                { number: "04", icon: CheckCircle2, title: "Enjoy your service", text: "Attend your appointment and share your feedback." },
              ].map(({ number, icon: Icon, title, text }) => (
                <article key={number} className="rounded-lg border border-styler-line bg-styler-surface p-5 shadow-soft">
                  <div className="flex items-center justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-md bg-styler-accent-soft text-styler-accent">
                      <Icon size={21} />
                    </span>
                    <span className="font-mono text-sm font-bold text-styler-accent/60">{number}</span>
                  </div>
                  <h3 className="mt-4 font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-styler-muted">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Trust highlights */}
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_ITEMS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex items-center gap-3 rounded-lg border border-styler-line bg-styler-surface p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-styler-accent-soft text-styler-accent">
                  <Icon size={20} />
                </span>
                <div>
                  <p className="text-sm font-bold">{title}</p>
                  <p className="mt-1 text-xs text-styler-muted">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}