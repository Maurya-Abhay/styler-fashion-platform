
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  Heart,
  ShieldCheck,
  Target,
  Eye,
  Scissors,
  Sparkles,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const VALUES = [
  {
    icon: BadgeCheck,
    title: "Trusted Professionals",
    text: "Discover fashion professionals whose profiles are reviewed before appearing in our directory.",
  },
  {
    icon: ShieldCheck,
    title: "Confidence at Every Step",
    text: "Explore services, understand pricing, and review booking details before making a decision.",
  },
  {
    icon: Heart,
    title: "Style That Feels Like You",
    text: "Find people who can bring your ideas to life, from everyday alterations to custom occasion wear.",
  },
];

export function AboutContent() {
  return (
    <div className="flex min-h-screen flex-col bg-styler-canvas text-styler-ink antialiased">
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {/* Hero */}
        <section className="relative isolate overflow-hidden rounded-3xl border border-styler-line bg-styler-surface">
          <div className="absolute inset-0 -z-10">
            <img
              src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1800&q=85"
              alt=""
              className="h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#1a0818]/95 via-[#1a0818]/80 to-[#1a0818]/30" />
          </div>

          <div className="max-w-3xl px-6 py-16 sm:px-10 sm:py-20 lg:px-14 lg:py-24">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-pink-200">
              <Sparkles size={15} />
              Our story
            </span>

            <h1 className="mt-5 font-serif text-4xl font-medium leading-tight text-white sm:text-5xl lg:text-6xl">
              Fashion should feel
              <span className="block italic text-pink-300">like you.</span>
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-7 text-white/80 sm:text-base">
              Styler connects you with fashion professionals who understand
              your ideas, respect your individuality, and help turn your
              vision into something you can wear with confidence.
            </p>

            <Link
              href="/professionals"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#45133f] transition hover:bg-pink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#45133f]"
            >
              Explore professionals
              <ArrowUpRight size={17} />
            </Link>
          </div>
        </section>

        {/* Mission and vision */}
        <section className="mt-12 grid gap-5 md:grid-cols-2">
          <article className="rounded-2xl border border-styler-line bg-styler-surface p-6 sm:p-8">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-styler-accent-soft text-styler-accent">
              <Target size={23} />
            </span>

            <h2 className="mt-5 font-serif text-2xl font-medium">
              Our mission
            </h2>

            <p className="mt-3 text-sm leading-7 text-styler-ink-soft">
              Make finding the right fashion expertise simpler and more
              personal. We help customers discover tailors, designers, and
              stylists for the services that matter to them.
            </p>
          </article>

          <article className="rounded-2xl border border-styler-line bg-styler-surface p-6 sm:p-8">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-styler-accent-soft text-styler-accent">
              <Eye size={23} />
            </span>

            <h2 className="mt-5 font-serif text-2xl font-medium">
              Our vision
            </h2>

            <p className="mt-3 text-sm leading-7 text-styler-ink-soft">
              Build a more connected fashion community where talented local
              professionals can showcase their work and customers can find
              services that suit their style and needs.
            </p>
          </article>
        </section>

        {/* Values */}
        <section className="mt-14">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-styler-accent">
              What matters to us
            </p>
            <h2 className="mt-2 font-serif text-3xl font-medium sm:text-4xl">
              Good style starts with trust.
            </h2>
            <p className="mt-3 text-sm leading-7 text-styler-ink-soft">
              Every part of the experience should help you make a more
              informed and confident choice.
            </p>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {VALUES.map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                className="rounded-2xl border border-styler-line bg-styler-surface p-6 transition-colors hover:border-styler-line-strong"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-styler-accent-soft text-styler-accent">
                  <Icon size={21} />
                </span>

                <h3 className="mt-5 text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-styler-ink-soft">
                  {text}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* How Styler works */}
        <section className="mt-14 rounded-2xl border border-styler-line bg-styler-surface p-6 sm:p-8 lg:p-10">
          <div className="grid gap-8 md:grid-cols-[1fr_1fr] md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-styler-accent">
                A simpler way to find your fit
              </p>
              <h2 className="mt-3 font-serif text-3xl font-medium sm:text-4xl">
                Your idea. The right hands.
              </h2>
              <p className="mt-4 text-sm leading-7 text-styler-ink-soft">
                Whether you need a perfect alteration, a custom outfit, or
                help refining your personal style, start by exploring
                professionals and their listed services.
              </p>
            </div>

            <div className="space-y-5">
              {[
                {
                  title: "Explore",
                  text: "Browse professionals by location and specialty.",
                },
                {
                  title: "Compare",
                  text: "Review profiles, services, and available pricing.",
                },
                {
                  title: "Connect",
                  text: "Choose a service and submit your booking request.",
                },
              ].map((step, index) => (
                <div key={step.title} className="flex items-start gap-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-styler-accent-soft text-sm font-semibold text-styler-accent">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">{step.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-styler-ink-soft">
                      {step.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-8 flex flex-col gap-5 rounded-2xl bg-styler-accent px-6 py-9 text-white sm:px-9 sm:py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-white/80">
              <Scissors size={15} />
              Your style, your story
            </div>
            <h2 className="mt-3 font-serif text-2xl font-medium sm:text-3xl">
              Find someone who gets your style.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">
              Discover fashion services and take the next step towards your
              next favourite look.
            </p>
          </div>

          <Link
            href="/professionals"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-styler-accent transition hover:bg-styler-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Find a professional
            <ArrowUpRight size={17} />
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
