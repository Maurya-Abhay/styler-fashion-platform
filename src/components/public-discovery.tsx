 "use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  Clock3,
  Heart,
  MapPin,
  Search,
  Sparkles,
  Star,
} from "lucide-react";

import { apiRequest, money, humanize, unwrapItems } from "@/components/api-client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Alert, Button, EmptyState, LoadingBlock } from "@/components/ui";

type ImageItem = {
  _id?: string;
  fileId?: string;
  url?: string;
  altText?: string;
};

type Service = {
  _id?: string;
  id?: string;
  title?: string;
  category?: string;
  description?: string;
  durationMinutes?: number;
  pricingType?: string;
  pricePaise?: number;
  images?: ImageItem[];
};

type Review = {
  _id?: string;
  id?: string;
  customerId?: { name?: string } | string;
  createdAt?: string;
  rating?: number;
  comment?: string;
};

type Professional = {
  _id?: string;
  id?: string;
  slug?: string;
  displayName?: string;
  name?: string;
  profilePhoto?: ImageItem;
  profileImageUrl?: string;
  portfolioImages?: ImageItem[];
  bio?: string;
  city?: string;
  state?: string;
  experienceYears?: number;
  categories?: string[];
  services?: Service[];
  rating?: { averageRating?: number; total?: number };
};

type ProfessionalDetailResponse = {
  profile?: Professional;
  professional?: Professional;
  services?: Service[];
  reviews?: Review[];
  rating?: Professional["rating"];
};

type Props = {
  slug: string;
  initialData?: ProfessionalDetailResponse | Professional | null;
};

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

function SectionHeading({
  eyebrow,
  title,
  detail,
}: {
  eyebrow: string;
  title: string;
  detail?: string;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-styler-accent">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-styler-ink sm:text-[28px]">
          {title}
        </h2>
      </div>
      {detail ? (
        <p className="text-xs leading-5 text-styler-muted">{detail}</p>
      ) : null}
    </div>
  );
}

function Price({ service }: { service: Service }) {
  if (service.pricingType === "quote_required") {
    return <span>Get a quote</span>;
  }

  return (
    <span>
      {service.pricingType === "starting_from" ? "From " : ""}
      {money(service.pricePaise)}
    </span>
  );
}

export function ProfessionalDiscovery() {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialQuery = params.get("q")?.trim() || "";
    const initialCity = params.get("city")?.trim() || "";
    setQuery(initialQuery);
    setCity(initialCity);

    const controller = new AbortController();
    const searchParams = new URLSearchParams({ limit: "12" });
    if (initialQuery) searchParams.set("q", initialQuery);
    if (initialCity) searchParams.set("city", initialCity);

    apiRequest<unknown>(`/api/professionals?${searchParams}`, {
      signal: controller.signal,
    })
      .then((response) => setProfessionals(unwrapItems(response) as Professional[]))
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name !== "AbortError") {
          setError(cause.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  return (
    <div className="min-h-screen bg-styler-canvas text-styler-ink">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-styler-accent">
            Find your perfect fit
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Fashion professionals
          </h1>
          <p className="mt-3 text-sm leading-6 text-styler-muted sm:text-base">
            Search approved professionals by service, name, or location.
          </p>
        </div>

        <form
          action="/professionals"
          method="get"
          role="search"
          className="mt-7 flex flex-col gap-2 rounded-lg border border-styler-line bg-styler-surface p-2 shadow-soft transition focus-within:border-styler-line-strong sm:flex-row sm:items-center"
        >
          <label className="flex min-w-0 flex-1 items-center gap-3 px-3">
            <Search size={18} aria-hidden="true" className="shrink-0 text-blue-600" />
            <input
              name="q"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Service, style, or professional"
              aria-label="Search services or professionals"
              className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-styler-muted focus-visible:!outline-none"
            />
          </label>
          <label className="flex min-w-0 items-center gap-3 border-t border-styler-line px-3 sm:w-52 sm:border-l sm:border-t-0">
            <MapPin size={17} aria-hidden="true" className="shrink-0 text-blue-600" />
            <input
              name="city"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Your city"
              aria-label="Filter by city"
              className="w-full min-w-0 bg-transparent py-3 text-sm outline-none placeholder:text-styler-muted focus-visible:!outline-none"
            />
          </label>
          <button
            type="submit"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-[#2463eb] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#174fc9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2463eb]"
          >
            Search professionals <ArrowUpRight size={16} />
          </button>
        </form>

        <div className="mt-8 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            {query || city ? "Matching professionals" : "Browse professionals"}
          </h2>
          {!loading && !error ? (
            <span className="text-sm text-styler-muted">
              {professionals.length} {professionals.length === 1 ? "result" : "results"}
            </span>
          ) : null}
        </div>

        {error ? (
          <div className="mt-5"><Alert tone="error">{error}</Alert></div>
        ) : loading ? (
          <div className="mt-5"><LoadingBlock label="Finding fashion professionals..." /></div>
        ) : professionals.length ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
            {professionals.map((professional, index) => {
              const identifier = professional.slug || professional._id || professional.id;
              const photo = professional.profilePhoto?.url || professional.profileImageUrl;
              const services = professional.services || [];

              return (
                <Link
                  key={identifier || index}
                  href={identifier ? `/professionals/${encodeURIComponent(identifier)}` : "/professionals"}
                  className="group overflow-hidden rounded-lg border border-styler-line bg-styler-surface shadow-soft transition hover:-translate-y-0.5 hover:border-styler-line-strong hover:shadow-panel"
                >
                  <div className="aspect-[16/10] overflow-hidden bg-styler-surface-2">
                    {photo ? (
                      <img
                        src={photo}
                        alt={`${professional.displayName || professional.name || "Professional"} profile`}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-4xl font-semibold text-styler-accent">
                        {(professional.displayName || professional.name || "S").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold group-hover:text-styler-accent">
                          {professional.displayName || professional.name || "Fashion professional"}
                        </h3>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-styler-muted">
                          <MapPin size={13} aria-hidden="true" />
                          {[professional.city, professional.state].filter(Boolean).join(", ") || "Location not listed"}
                        </p>
                      </div>
                      <BadgeCheck size={18} aria-label="Approved professional" className="shrink-0 text-blue-600" />
                    </div>
                    {professional.bio ? (
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-styler-ink-soft">
                        {professional.bio}
                      </p>
                    ) : null}
                    <p className="mt-3 line-clamp-1 text-xs text-styler-muted">
                      {services.length
                        ? services.map((service) => service.title || humanize(service.category || "Service")).slice(0, 3).join(" · ")
                        : (professional.categories || []).map(humanize).slice(0, 3).join(" · ") || "View professional profile"}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-styler-accent">
                      View profile <ArrowUpRight size={15} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mt-5 border border-styler-line bg-styler-surface px-6 py-10 text-center">
            <h3 className="text-base font-semibold">No professionals found</h3>
            <p className="mt-2 text-sm text-styler-muted">
              Try a different service or city, or browse all approved professionals.
            </p>
            <Link href="/professionals" className="mt-4 inline-flex font-semibold text-styler-accent hover:underline">
              Clear search
            </Link>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

export function ProfessionalDetail({ slug, initialData }: Props) {
  const [payload, setPayload] = useState<ProfessionalDetailResponse | Professional | null>(
    initialData ?? null,
  );
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState("");
  const [favoriteError, setFavoriteError] = useState("");
  const [favorite, setFavorite] = useState(false);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [isCustomer, setIsCustomer] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const profile = useMemo(() => {
    const data = payload as ProfessionalDetailResponse | null;
    return (data?.profile || data?.professional || payload) as Professional | null;
  }, [payload]);

  const services =
    profile?.services ||
    (payload as ProfessionalDetailResponse | null)?.services ||
    [];
  const portfolio = (profile?.portfolioImages || []).filter((image) => image?.url);
  const profileImage = profile?.profilePhoto?.url || profile?.profileImageUrl;
  const gallery = [
    ...(profileImage
      ? [{ url: profileImage, altText: `${profile?.displayName || "Professional"} profile photo` }]
      : []),
    ...portfolio,
  ];
  const reviews = (payload as ProfessionalDetailResponse | null)?.reviews || [];
  const rating =
    profile?.rating ||
    (payload as ProfessionalDetailResponse | null)?.rating ||
    {};
  const professionalId = String(profile?._id || profile?.id || "");
  const displayName = profile?.displayName || profile?.name || "Professional";
  const location = [profile?.city, profile?.state].filter(Boolean).join(", ");

  useEffect(() => {
    setActiveImage(0);
  }, [professionalId]);

  useEffect(() => {
    if (initialData) return;

    const controller = new AbortController();
    setLoading(true);
    setError("");

    apiRequest<ProfessionalDetailResponse>(
      `/api/professionals/${encodeURIComponent(slug)}`,
      { signal: controller.signal },
    )
      .then(setPayload)
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name !== "AbortError") {
          setError(cause.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [slug, initialData]);

  useEffect(() => {
    if (!professionalId) return;

    let active = true;
    setFavorite(false);
    setIsCustomer(false);

    async function loadFavoriteState() {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (response.status === 401 || !response.ok) return;

        const result = await response.json();
        if (result?.data?.user?.role !== "customer" || !active) return;

        const favorites = await apiRequest<unknown>("/api/customer/favorites");
        if (!active) return;

        setIsCustomer(true);
        setFavorite(
          unwrapItems(favorites).some(
            (item: any) =>
              String(item?._id || item?.professional?._id || item?.professionalId) ===
              professionalId,
          ),
        );
      } catch {
        // Favorite status is optional; the profile remains usable if this request fails.
      }
    }

    void loadFavoriteState();
    return () => {
      active = false;
    };
  }, [professionalId]);

  async function toggleFavorite() {
    if (!professionalId || savingFavorite) return;

    setSavingFavorite(true);
    setFavoriteError("");

    try {
      if (favorite) {
        await apiRequest(
          `/api/customer/favorites/${encodeURIComponent(professionalId)}`,
          { method: "DELETE" },
        );
        setFavorite(false);
      } else {
        await apiRequest("/api/customer/favorites", {
          method: "POST",
          body: JSON.stringify({ professionalId }),
        });
        setFavorite(true);
      }
    } catch (cause) {
      setFavoriteError(
        cause instanceof Error ? cause.message : "Could not update saved professionals.",
      );
    } finally {
      setSavingFavorite(false);
    }
  }

  const bookingHref = `/customer/bookings/new?service=${encodeURIComponent(
    services[0]?.category || profile?.categories?.[0] || "other",
  )}`;

  return (
    <div className="min-h-screen bg-styler-canvas text-styler-ink antialiased">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-9 lg:px-8">
        <Link
          href="/professionals"
          className="inline-flex items-center gap-2 text-sm font-medium text-styler-ink-soft transition hover:text-styler-accent"
        >
          <ArrowLeft size={16} />
          All professionals
        </Link>

        <div className="mt-5">
          {loading ? (
            <LoadingBlock label="Loading professional profile…" />
          ) : error ? (
            <Alert tone="error">{error}</Alert>
          ) : !profile ? (
            <EmptyState
              title="Profile not found"
              description="This professional may no longer be listed."
            />
          ) : (
            <>
              {favoriteError ? <Alert tone="error">{favoriteError}</Alert> : null}

              {/* Profile overview */}
              <section className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="grid gap-5 rounded-lg border border-styler-line bg-styler-surface p-4 shadow-soft sm:p-6 md:grid-cols-[minmax(220px,300px)_minmax(0,1fr)]">
                  <div className="min-w-0">
                    <div className="relative aspect-[4/4.5] overflow-hidden rounded-md bg-styler-surface-2">
                      {gallery.length > 0 ? (
                        <img
                          src={gallery[Math.min(activeImage, gallery.length - 1)]?.url}
                          alt={
                            gallery[Math.min(activeImage, gallery.length - 1)]?.altText ||
                            `${displayName} portfolio`
                          }
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-3 text-styler-accent">
                          <Sparkles size={34} />
                          <span className="text-3xl font-semibold">
                            {displayName.slice(0, 1).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 border border-white/70 bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-styler-ink shadow-sm backdrop-blur">
                        <BadgeCheck size={14} className="text-styler-accent" />
                        Verified professional
                      </span>
                    </div>

                    {gallery.length > 1 ? (
                      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                        {gallery.map((image, index) => (
                          <button
                            key={`${image.url}-${index}`}
                            type="button"
                            onClick={() => setActiveImage(index)}
                            aria-label={`Show image ${index + 1}`}
                            aria-pressed={activeImage === index}
                            className={cx(
                              "h-[66px] w-[66px] shrink-0 overflow-hidden rounded-sm border-2 transition",
                              activeImage === index
                                ? "border-styler-accent"
                                : "border-transparent opacity-70 hover:opacity-100",
                            )}
                          >
                            <img
                              src={image.url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex min-w-0 flex-col py-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-styler-accent">
                        Professional profile
                      </span>
                      <BadgeCheck size={15} className="text-styler-accent" />
                    </div>

                    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-styler-ink sm:text-4xl">
                      {displayName}
                    </h1>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-styler-muted">
                      {location ? (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin size={14} />
                          {location}
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1.5 text-amber-500">
                        <Star size={14} fill="currentColor" />
                        <strong className="text-styler-ink">
                          {rating.averageRating == null
                            ? "New"
                            : Number(rating.averageRating).toFixed(1)}
                        </strong>
                        <span className="text-styler-muted">
                          ({rating.total || 0} reviews)
                        </span>
                      </span>
                    </div>

                    <p className="mt-5 whitespace-pre-line text-sm leading-7 text-styler-ink-soft">
                      {profile.bio || "No profile description has been added yet."}
                    </p>

                    {profile.categories?.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {profile.categories.map((category) => (
                          <span
                            key={category}
                            className="border border-styler-line bg-styler-accent-soft px-3 py-1.5 text-xs font-medium text-styler-accent"
                          >
                            {humanize(category)}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-6 grid grid-cols-3 border-y border-styler-line py-4 text-center">
                      <div>
                        <strong className="block text-xl font-semibold">
                          {profile.experienceYears || 0}+
                        </strong>
                        <span className="mt-1 block text-[11px] text-styler-muted">
                          Years experience
                        </span>
                      </div>
                      <div className="border-x border-styler-line">
                        <strong className="block text-xl font-semibold">
                          {services.length}
                        </strong>
                        <span className="mt-1 block text-[11px] text-styler-muted">
                          Services
                        </span>
                      </div>
                      <div>
                        <strong className="block text-xl font-semibold">
                          {portfolio.length}
                        </strong>
                        <span className="mt-1 block text-[11px] text-styler-muted">
                          Portfolio photos
                        </span>
                      </div>
                    </div>

                    <div className="mt-auto flex flex-wrap gap-3 pt-5">
                      <Link
                        href={bookingHref}
                        className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-styler-accent px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-styler-accent-strong sm:flex-none"
                      >
                        Book now
                        <ArrowUpRight size={16} />
                      </Link>

                      {isCustomer ? (
                        <Button
                          variant="secondary"
                          loading={savingFavorite}
                          onClick={() => void toggleFavorite()}
                        >
                          <Heart
                            size={16}
                            fill={favorite ? "currentColor" : "none"}
                          />
                          {favorite ? "Saved" : "Save profile"}
                        </Button>
                      ) : (
                        <Link
                          href="/login"
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-styler-line px-4 py-3 text-sm font-semibold text-styler-ink-soft transition hover:bg-styler-surface-2"
                        >
                          <Heart size={16} />
                          Save profile
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {/* Services summary */}
                <aside className="h-fit rounded-lg border border-styler-line bg-styler-surface p-5 shadow-soft">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold">Services</h2>
                    <a
                      href="#services"
                      className="text-xs font-semibold text-styler-accent hover:underline"
                    >
                      View all
                    </a>
                  </div>

                  {services.length ? (
                    <ul className="mt-3 divide-y divide-styler-line">
                      {services.slice(0, 5).map((service, index) => (
                        <li
                          key={service._id || service.id || `${service.title}-${index}`}
                          className="flex items-center justify-between gap-3 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {service.title || humanize(service.category || "Service")}
                            </p>
                            <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-styler-muted">
                              <Clock3 size={12} />
                              {service.durationMinutes || 60} min
                            </p>
                          </div>
                          <strong className="shrink-0 text-xs font-semibold">
                            <Price service={service} />
                          </strong>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="py-7 text-sm text-styler-muted">
                      No services have been listed yet.
                    </p>
                  )}

                  <Link
                    href={bookingHref}
                    className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-styler-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-styler-accent-strong"
                  >
                    Book this professional
                    <ArrowUpRight size={15} />
                  </Link>
                </aside>
              </section>

              {/* Section navigation */}
              <nav
                aria-label="Profile sections"
                className="sticky top-16 z-20 mt-7 flex gap-7 overflow-x-auto border-b border-styler-line bg-styler-canvas/95 px-1 backdrop-blur"
              >
                {[
                  ["about", "About"],
                  ["services", "Services"],
                  ["portfolio", "Portfolio"],
                  ["reviews", "Reviews"],
                ].map(([id, label]) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    className="whitespace-nowrap border-b-2 border-transparent px-1 py-3 text-sm font-semibold text-styler-muted transition hover:border-styler-accent hover:text-styler-accent"
                  >
                    {label}
                  </a>
                ))}
              </nav>

              {/* About */}
              <section id="about" className="scroll-mt-28 py-9">
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="rounded-lg border border-styler-line bg-styler-surface p-5 shadow-soft sm:p-7">
                    <SectionHeading
                      eyebrow="Get to know"
                      title={`About ${displayName}`}
                    />
                    <p className="mt-5 whitespace-pre-line text-sm leading-7 text-styler-ink-soft">
                      {profile.bio || "No additional information is available."}
                    </p>
                  </div>

                  <div className="rounded-lg border border-styler-line bg-styler-surface p-5 shadow-soft sm:p-6">
                    <h3 className="text-base font-semibold">Professional details</h3>
                    <ul className="mt-4 space-y-4 text-sm text-styler-ink-soft">
                      <li className="flex items-center gap-3">
                        <BadgeCheck size={17} className="text-styler-accent" />
                        Verified professional
                      </li>
                      <li className="flex items-center gap-3">
                        <CalendarDays size={17} className="text-styler-accent" />
                        {profile.experienceYears || 0}+ years of experience
                      </li>
                      {location ? (
                        <li className="flex items-center gap-3">
                          <MapPin size={17} className="text-styler-accent" />
                          {location}
                        </li>
                      ) : null}
                    </ul>
                  </div>
                </div>
              </section>

              {/* Services */}
              <section id="services" className="scroll-mt-28 py-5">
                <SectionHeading
                  eyebrow="What they offer"
                  title="Services & pricing"
                  detail="Final scope and exact pricing are shown before payment."
                />

                {services.length ? (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {services.map((service, index) => (
                      <article
                        key={service._id || service.id || `${service.title}-${index}`}
                        className="overflow-hidden rounded-lg border border-styler-line bg-styler-surface shadow-soft transition hover:-translate-y-0.5 hover:shadow-panel"
                      >
                        <div className="aspect-[16/9] overflow-hidden bg-styler-surface-2">
                          {service.images?.[0]?.url ? (
                            <img
                              src={service.images[0].url}
                              alt={service.title || "Service"}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-styler-accent">
                              <Sparkles size={28} />
                            </div>
                          )}
                        </div>
                        <div className="p-5">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-styler-accent">
                            {humanize(service.category || "Service")}
                          </p>
                          <h3 className="mt-2 text-lg font-semibold">
                            {service.title || "Professional service"}
                          </h3>
                          {service.description ? (
                            <p className="mt-2 line-clamp-3 text-sm leading-6 text-styler-ink-soft">
                              {service.description}
                            </p>
                          ) : null}
                          <div className="mt-5 flex items-center justify-between gap-3 border-t border-styler-line pt-4 text-sm">
                            <strong>
                              <Price service={service} />
                            </strong>
                            <span className="inline-flex items-center gap-1.5 text-xs text-styler-muted">
                              <Clock3 size={14} />
                              {service.durationMinutes || 60} min
                            </span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 rounded-lg border border-styler-line bg-styler-surface p-6">
                    <EmptyState
                      title="No services listed"
                      description="This professional has not added services yet."
                    />
                  </div>
                )}
              </section>

              {/* Portfolio */}
              <section id="portfolio" className="scroll-mt-28 py-10">
                <SectionHeading
                  eyebrow="Selected work"
                  title="Portfolio"
                  detail={`${portfolio.length} photos`}
                />

                {portfolio.length ? (
                  <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {portfolio.map((image, index) => (
                      <a
                        key={image._id || image.fileId || image.url || index}
                        href={image.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group aspect-square overflow-hidden rounded-md bg-styler-surface-2"
                      >
                        <img
                          src={image.url}
                          alt={
                            image.altText ||
                            `${displayName} portfolio image ${index + 1}`
                          }
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 rounded-lg border border-styler-line bg-styler-surface p-6">
                    <EmptyState
                      title="Portfolio coming soon"
                      description="This professional has not added portfolio photos yet."
                    />
                  </div>
                )}
              </section>

              {/* Reviews */}
              <section id="reviews" className="scroll-mt-28 py-5">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <SectionHeading eyebrow="Client feedback" title="Reviews" />
                  <div className="inline-flex items-center gap-2 text-sm">
                    <Star size={16} className="text-amber-500" fill="currentColor" />
                    <strong>
                      {rating.averageRating == null
                        ? "New"
                        : Number(rating.averageRating).toFixed(1)}
                    </strong>
                    <span className="text-styler-muted">
                      ({rating.total || 0} reviews)
                    </span>
                  </div>
                </div>

                {reviews.length ? (
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {reviews.map((review, index) => {
                      const customer =
                        typeof review.customerId === "object"
                          ? review.customerId
                          : null;

                      return (
                        <article
                          key={review._id || review.id || index}
                          className="rounded-lg border border-styler-line bg-styler-surface p-5 shadow-soft"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-sm font-semibold">
                                {customer?.name || "Styler customer"}
                              </h3>
                              {review.createdAt ? (
                                <p className="mt-1 text-xs text-styler-muted">
                                  {new Date(review.createdAt).toLocaleDateString()}
                                </p>
                              ) : null}
                            </div>
                            <div
                              className="flex gap-0.5 text-amber-500"
                              aria-label={`${review.rating || 0} out of 5 stars`}
                            >
                              {Array.from({ length: 5 }, (_, starIndex) => (
                                <Star
                                  key={starIndex}
                                  size={14}
                                  fill={
                                    starIndex < Number(review.rating || 0)
                                      ? "currentColor"
                                      : "none"
                                  }
                                />
                              ))}
                            </div>
                          </div>
                          {review.comment ? (
                            <p className="mt-4 text-sm leading-6 text-styler-ink-soft">
                              {review.comment}
                            </p>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-5 rounded-lg border border-styler-line bg-styler-surface p-6">
                    <EmptyState
                      title="No reviews yet"
                      description="Customer reviews will appear here after completed bookings."
                    />
                  </div>
                )}
              </section>

              {/* Bottom booking prompt */}
              <section className="mt-10 flex flex-col gap-4 rounded-lg bg-styler-accent px-5 py-6 text-white sm:flex-row sm:items-center sm:justify-between sm:px-8">
                <div>
                  <h2 className="text-xl font-semibold">
                    Ready to book {displayName}?
                  </h2>
                  <p className="mt-1 text-sm text-white/80">
                    Choose a service and send your booking request.
                  </p>
                </div>
                <Link
                  href={bookingHref}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-semibold text-styler-accent transition hover:bg-white/90"
                >
                  Book now
                  <ArrowUpRight size={16} />
                </Link>
              </section>
            </>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
