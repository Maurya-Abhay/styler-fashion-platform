"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  MapPin,
  Search,
  Sparkles,
  Clock3,
  SlidersHorizontal,
  BadgeCheck,
  Heart,
} from "lucide-react";
import { apiRequest, money, humanize, unwrapItems } from "@/components/api-client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Alert, Button, EmptyState, LoadingBlock } from "@/components/ui";
import { CATEGORIES } from "@/lib/categories";

const categoryOptions = CATEGORIES;

export function ProfessionalDiscovery({ category }: { category?: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [cat, setCat] = useState(category || "");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get("q");
    if (query) setQ(query);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const t = setTimeout(() => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (city.trim()) params.set("city", city.trim());
      if (cat) params.set("category", cat);

      apiRequest<any>(`/api/professionals?${params}`, { signal: controller.signal })
        .then((d) => setItems(unwrapItems(d)))
        .catch((e) => {
          if (e?.name !== "AbortError") setError(e.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 300);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [q, city, cat]);

  return (
    <div className="min-h-screen bg-styler-canvas text-styler-ink selection:bg-styler-accent-soft selection:text-styler-ink antialiased">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {/* Navigation & Header */}
        <div>

          <div className="mt-2">
            <h1 className="mt-2 font-sans text-3xl font-bold text-styler-ink sm:text-4xl lg:text-5xl">
              Find the person behind <br />
              <em className="italic text-styler-accent">your next great look.</em>
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-styler-ink-soft sm:text-base">
              Discover approved local professionals across fashion, beauty, wellness, home and repair services.
            </p>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="mt-8 grid grid-cols-1 gap-3 rounded-panel border border-styler-line bg-styler-surface p-2.5 shadow-soft sm:grid-cols-12 sm:items-center">
          <label className="flex items-center gap-2 rounded-sm border border-styler-line bg-styler-canvas px-3 py-2 sm:col-span-5">
            <Search size={18} className="text-styler-muted shrink-0" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search a name or specialty"
              className="w-full bg-transparent text-sm text-styler-ink placeholder:text-styler-muted focus:outline-none"
            />
          </label>

          <label className="flex items-center gap-2 rounded-sm border border-styler-line bg-styler-canvas px-3 py-2 sm:col-span-3">
            <MapPin size={17} className="text-styler-muted shrink-0" />
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              className="w-full bg-transparent text-sm text-styler-ink placeholder:text-styler-muted focus:outline-none"
            />
          </label>

          <label className="flex items-center gap-2 rounded-sm border border-styler-line bg-styler-canvas px-3 py-2 sm:col-span-4">
            <SlidersHorizontal size={17} className="text-styler-muted shrink-0" />
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              className="w-full bg-transparent text-sm text-styler-ink focus:outline-none"
            >
              <option value="">All services</option>
              {categoryOptions.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Content Body */}
        <div className="mt-8">
          {error && <Alert tone="error">{error}</Alert>}

          {loading ? (
            <LoadingBlock label="Finding your people…" />
          ) : items.length === 0 ? (
            <EmptyState
              title="Your next match is still out there"
              description="No professionals match these filters yet. Try another service or city."
              icon={<Search size={23} />}
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQ("");
                    setCity("");
                    setCat("");
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((p: any, i: number) => (
                <Link
                  href={`/professionals/${p.slug || p.id || p._id}`}
                  key={p._id || p.id || i}
                  className="group relative flex flex-col overflow-hidden rounded-panel border border-styler-line bg-styler-surface shadow-soft transition-all hover:-translate-y-1 hover:border-styler-line-strong hover:shadow-panel"
                >
                  {/* Visual Header */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-styler-surface-2">
                    {p.profilePhoto?.url || p.profileImageUrl ? (
                      <img
                        src={p.profilePhoto?.url || p.profileImageUrl}
                        alt={p.displayName || p.name || "Professional"}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-styler-accent">
                        <Sparkles size={28} />
                        <span className="font-sans text-xl font-bold">
                          {(p.displayName || p.name || "Styler").slice(0, 1).toUpperCase()}
                        </span>
                      </div>
                    )}

                    <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full border border-styler-line/80 bg-styler-surface/90 px-2.5 py-0.5 text-[11px] font-semibold text-styler-accent backdrop-blur-md">
                      <BadgeCheck size={13} /> Approved
                    </span>

                    <span className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-styler-surface/90 text-styler-ink opacity-0 transition-opacity backdrop-blur-md group-hover:opacity-100">
                      <ArrowUpRight size={17} />
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="flex flex-1 flex-col justify-between p-5">
                    <div>
                      <div className="flex items-center justify-between text-xs text-styler-muted">
                        <span className="flex items-center gap-1">
                          <MapPin size={13} />
                          {[p.city, p.state].filter(Boolean).join(", ") || "India"}
                        </span>
                        <span>{p.experienceYears || 0}+ yrs exp.</span>
                      </div>

                      <h3 className="mt-3 font-sans text-lg font-medium text-styler-ink transition-colors group-hover:text-styler-accent">
                        {p.displayName || p.name || "Fashion professional"}
                      </h3>

                      <p className="mt-1.5 line-clamp-2 text-xs text-styler-ink-soft">
                        {p.bio || "A fashion professional ready to help bring your idea to life."}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {(p.categories || []).slice(0, 2).map((c: string) => (
                          <span
                            key={c}
                            className="rounded-sm bg-styler-surface-2 px-2 py-0.5 text-[11px] font-medium text-styler-ink-soft"
                          >
                            {humanize(c)}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-styler-line pt-3 text-xs">
                      <span className="text-styler-muted">
                        {(p.services || []).length} service{(p.services || []).length === 1 ? "" : "s"} offered
                      </span>
                      <span className="inline-flex items-center gap-1 font-bold text-styler-accent">
                        View profile <ArrowUpRight size={14} />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Directory Footnote */}
        <div className="mt-12 flex items-start gap-3 rounded-panel border border-styler-line bg-styler-surface-2 p-4 text-xs text-styler-ink-soft">
          <Clock3 size={16} className="mt-0.5 shrink-0 text-styler-accent" />
          <span>
            Professionals receive requests based on service fit, location and availability. A 10-minute response window applies to each offer.
          </span>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

export function ProfessionalDetail({
  slug,
  initialData,
}: {
  slug: string;
  initialData?: any;
}) {
  const [data, setData] = useState<any>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState("");
  const [favoriteError, setFavoriteError] = useState("");
  const [favorite, setFavorite] = useState(false);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [isCustomer, setIsCustomer] = useState(false);

  const profile = data?.profile || data?.professional || data;
  const services = profile?.services || data?.services || [];
  const professionalId = String(profile?.id || profile?._id || "");

  useEffect(() => {
    if (!professionalId) return;
    let active = true;
    setFavorite(false);
    setIsCustomer(false);

    async function loadFavoriteState() {
      setFavoriteError("");
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });
        if (response.status === 401) {
          if (active) setIsCustomer(false);
          return;
        }
        if (!response.ok) {
          throw new Error(`Could not check your account (${response.status}).`);
        }
        const payload = await response.json() as {
          data?: { user?: { role?: string } };
        };
        if (!active) return;
        if (payload.data?.user?.role !== "customer") {
          if (active) setIsCustomer(false);
          return;
        }

        const favorites = await apiRequest<any>("/api/customer/favorites");
        if (!active) return;
        setIsCustomer(true);
        setFavorite(unwrapItems(favorites).some(
          (item: any) => String(item.id || item.professional?.id) === professionalId,
        ));
      } catch (cause) {
        if (active) {
          setFavoriteError(cause instanceof Error ? cause.message : "Could not load your saved professionals.");
        }
      }
    }

    void loadFavoriteState();
    return () => {
      active = false;
    };
  }, [professionalId]);

  async function toggleFavorite() {
    if (!professionalId) {
      setFavoriteError("This professional cannot be saved right now.");
      return;
    }

    setSavingFavorite(true);
    setFavoriteError("");
    try {
      if (favorite) {
        await apiRequest(`/api/customer/favorites/${encodeURIComponent(professionalId)}`, {
          method: "DELETE",
        });
        setFavorite(false);
      } else {
        await apiRequest("/api/customer/favorites", {
          method: "POST",
          body: JSON.stringify({ professionalId }),
        });
        setFavorite(true);
      }
    } catch (cause) {
      setFavoriteError(cause instanceof Error ? cause.message : "Could not update favorites.");
    } finally {
      setSavingFavorite(false);
    }
  }

  useEffect(() => {
    if (initialData) return;
    const controller = new AbortController();
    apiRequest<any>(`/api/professionals/${encodeURIComponent(slug)}`, {
      signal: controller.signal,
    })
      .then(setData)
      .catch((e) => {
        if (e?.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [slug, initialData]);

  return (
    <div className="min-h-screen bg-styler-canvas text-styler-ink selection:bg-styler-accent-soft selection:text-styler-ink antialiased">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <Link
          href="/professionals"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-styler-ink-soft transition-colors hover:text-styler-ink"
        >
          <ArrowLeft size={15} />
          <span>All professionals</span>
        </Link>

        <div className="mt-6">
          {loading ? (
            <LoadingBlock label="Opening professional profile…" />
          ) : error ? (
            <Alert tone="error">{error}</Alert>
          ) : !profile ? (
            <EmptyState
              title="Profile not found"
              description="This professional may no longer be listed."
            />
          ) : (
            <>
              {favoriteError && <Alert tone="error">{favoriteError}</Alert>}
              {/* Profile Hero Card */}
              <section className="grid grid-cols-1 gap-8 rounded-panel border border-styler-line bg-styler-surface p-6 shadow-soft md:grid-cols-12 md:p-8">
                <div className="relative aspect-square w-full overflow-hidden rounded-panel bg-styler-surface-2 md:col-span-4">
                  {profile.profilePhoto?.url ? (
                    <img
                      src={profile.profilePhoto.url}
                      alt={profile.displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-styler-accent">
                      <Sparkles size={36} />
                      <span className="font-sans text-2xl font-bold">
                        {(profile.displayName || "S").slice(0, 1)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-between md:col-span-8">
                  <div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-styler-accent">
                      <BadgeCheck size={14} /> Approved Professional
                    </span>

                    <h1 className="mt-2 font-sans text-3xl font-bold text-styler-ink sm:text-4xl">
                      {profile.displayName || "Fashion professional"}
                    </h1>

                    <p className="mt-1 flex items-center gap-1 text-xs text-styler-muted">
                      <MapPin size={16} />
                      {[profile.city, profile.state].filter(Boolean).join(", ")}
                    </p>

                    <p className="mt-4 text-sm leading-relaxed text-styler-ink-soft">
                      {profile.bio || "A trusted fashion professional ready to help you feel your best."}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {(profile.categories || []).map((c: string) => (
                        <span
                          key={c}
                          className="rounded-sm bg-styler-accent-soft px-2.5 py-1 text-xs font-medium text-styler-accent"
                        >
                          {humanize(c)}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 border-t border-styler-line pt-6">
                    <div className="grid grid-cols-3 gap-4 text-center sm:max-w-md">
                      <div className="rounded-sm bg-styler-surface-2 p-3">
                        <strong className="block text-lg font-bold text-styler-ink">
                          {profile.experienceYears || 0}+
                        </strong>
                        <span className="text-[11px] text-styler-muted">Years experience</span>
                      </div>
                      <div className="rounded-sm bg-styler-surface-2 p-3">
                        <strong className="block text-lg font-bold text-styler-ink">
                          {services.length}
                        </strong>
                        <span className="text-[11px] text-styler-muted">Services</span>
                      </div>
                      <div className="rounded-sm bg-styler-surface-2 p-3">
                        <strong className="block text-lg font-bold text-styler-ink">
                          10 min
                        </strong>
                        <span className="text-[11px] text-styler-muted">Response window</span>
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="flex flex-wrap gap-3">
                        {isCustomer ? (
                          <Button
                            variant="secondary"
                            loading={savingFavorite}
                            onClick={() => void toggleFavorite()}
                          >
                            <Heart size={16} fill={favorite ? "currentColor" : "none"} />
                            {favorite ? "Remove from favorites" : "Save to favorites"}
                          </Button>
                        ) : (
                          <Link
                            href="/login"
                            className="inline-flex items-center gap-2 rounded-sm border border-styler-line px-4 py-3 text-xs font-semibold text-styler-ink-soft hover:bg-styler-surface-2"
                          >
                            <Heart size={16} /> Login to save
                          </Link>
                        )}
                        <Link
                          className="inline-flex items-center gap-2 rounded-sm bg-styler-accent px-6 py-3 text-xs font-semibold text-white shadow-soft transition-all hover:bg-styler-accent-strong hover:-translate-y-0.5"
                          href={`/customer/bookings/new?service=${encodeURIComponent(
                            services[0]?.category || profile.categories?.[0] || "other"
                          )}`}
                        >
                          <span>Request a booking</span>
                          <ArrowUpRight size={16} />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Services & Pricing Section */}
              <section className="mt-12">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-styler-accent">
                      What they do
                    </span>
                    <h2 className="mt-1 font-sans text-2xl font-bold text-styler-ink sm:text-3xl">
                      Services & pricing
                    </h2>
                  </div>
                  <p className="text-xs text-styler-muted">
                    Final scope and exact pricing are shown before payment.
                  </p>
                </div>

                <div className="mt-6">
                  {services.length ? (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {services.map((s: any) => (
                        <article
                          className="flex flex-col overflow-hidden rounded-panel border border-styler-line bg-styler-surface shadow-soft"
                          key={s._id || s.id}
                        >
                          <div className="relative aspect-video w-full overflow-hidden bg-styler-surface-2 flex items-center justify-center text-styler-accent">
                            {s.images?.[0]?.url ? (
                              <img
                                src={s.images[0].url}
                                alt={s.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Sparkles size={28} />
                            )}
                          </div>

                          <div className="flex flex-1 flex-col justify-between p-5">
                            <div>
                              <span className="text-[11px] font-bold uppercase tracking-wider text-styler-accent">
                                {humanize(s.category)}
                              </span>
                              <h3 className="mt-1 font-sans text-lg font-medium text-styler-ink">
                                {s.title}
                              </h3>
                              <p className="mt-2 line-clamp-3 text-xs text-styler-ink-soft">
                                {s.description}
                              </p>
                            </div>

                            <div className="mt-6 flex items-center justify-between border-t border-styler-line pt-3 text-xs">
                              <strong className="font-bold text-styler-ink">
                                {s.pricingType === "quote_required"
                                  ? "Quote required"
                                  : `${s.pricingType === "starting_from" ? "From " : ""}${money(
                                      s.pricePaise
                                    )}`}
                              </strong>
                              <span className="flex items-center gap-1 text-styler-muted">
                                <Clock3 size={14} />
                                {s.durationMinutes || 60} min
                              </span>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="Services coming soon"
                      description="This professional is still finishing their service listings."
                    />
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}