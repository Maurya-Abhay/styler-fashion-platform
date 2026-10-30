
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

      <main className="w-full flex-1">
        <section className="relative isolate min-h-[min(170vw,700px)] overflow-hidden bg-[#f5f8ff] dark:bg-[#10121c] sm:min-h-[620px] lg:min-h-[calc(100svh-64px)]">
          <picture className="absolute inset-0">
            <source media="(max-width: 767px)" srcSet="/images/hero-mobile.webp" />
            <img
              src="/images/hero-desktop.webp"
              alt=""
              fetchPriority="high"
              className="h-full w-full object-cover object-[center_40%] lg:object-[62%_center]"
            />
          </picture>
          <div className="absolute inset-0 hidden bg-gradient-to-r from-[#f5f8ff]/95 via-[#f5f8ff]/80 via-40% to-transparent to-75% dark:from-[#10121c]/95 dark:via-[#10121c]/80 lg:block" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#10121c]/90 via-[#10121c]/15 to-transparent lg:hidden" />
          <div className="absolute inset-y-0 left-[42%] hidden w-[18%] bg-gradient-to-r from-[#f5f8ff]/60 to-transparent dark:from-[#10121c]/55 lg:block" />

          <div className="relative z-10 mx-auto flex min-h-[min(170vw,700px)] max-w-7xl items-end px-4 pb-9 pt-72 sm:min-h-[620px] sm:px-6 sm:pb-12 lg:min-h-[calc(100svh-64px)] lg:items-center lg:px-8 lg:py-16">
            <div className="max-w-[620px]">
              <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#2459c7] dark:text-blue-200 sm:text-xs">
                <Sparkles size={15} />
                Our story
              </span>

              <h1 className="mt-3 max-w-[600px] font-serif text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl dark:lg:text-white lg:text-[#142652]">
                Fashion should feel{" "}
                <span className="text-pink-200 lg:text-[#3973ef] dark:lg:text-blue-300">
                  like you.
                </span>
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-6 text-white/90 sm:text-base sm:leading-7 lg:text-slate-600 dark:lg:text-slate-300">
                Styler connects you with fashion professionals who understand
                your ideas, respect your individuality, and help turn your
                vision into something you can wear with confidence.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/professionals"
                  className="inline-flex items-center gap-2 rounded-md bg-[#2463eb] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#174fc9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  Explore professionals
                  <ArrowUpRight size={17} />
                </Link>
                <Link
                  href="/services"
                  className="inline-flex items-center gap-2 border border-white/60 bg-white/90 px-5 py-3 text-sm font-semibold text-[#17264a] transition hover:bg-white lg:border-blue-200"
                >
                  Browse services
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-medium text-white/90 lg:text-slate-600 dark:lg:text-slate-300">
                <span className="inline-flex items-center gap-1.5"><BadgeCheck size={14} className="text-blue-300 lg:text-[#3973ef]" /> Reviewed professionals</span>
                <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-blue-300 lg:text-[#3973ef]" /> Clear service details</span>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <section className="grid gap-4 md:grid-cols-2">
          <article className="border border-styler-line bg-styler-surface p-5 sm:p-7">
            <span className="grid h-10 w-10 place-items-center bg-styler-accent-soft text-styler-accent">
              <Target size={21} />
            </span>

            <h2 className="mt-4 text-xl font-semibold">Our mission</h2>

            <p className="mt-2 text-sm leading-7 text-styler-ink-soft">
              Make finding the right fashion expertise simpler and more
              personal. We help customers discover tailors, designers, and
              stylists for the services that matter to them.
            </p>
          </article>

          <article className="border border-styler-line bg-styler-surface p-5 sm:p-7">
            <span className="grid h-10 w-10 place-items-center bg-styler-accent-soft text-styler-accent">
              <Eye size={21} />
            </span>

            <h2 className="mt-4 text-xl font-semibold">Our vision</h2>

            <p className="mt-2 text-sm leading-7 text-styler-ink-soft">
              Build a more connected fashion community where talented local
              professionals can showcase their work and customers can find
              services that suit their style and needs.
            </p>
          </article>
        </section>

        <section className="mt-12 sm:mt-14">
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

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {VALUES.map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                className="border border-styler-line bg-styler-surface p-5 transition-colors hover:border-styler-line-strong sm:p-6"
              >
                <span className="grid h-10 w-10 place-items-center bg-styler-accent-soft text-styler-accent">
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
        <section className="mt-12 border border-styler-line bg-styler-surface p-5 sm:mt-14 sm:p-8 lg:p-10">
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
                  <span className="grid h-9 w-9 shrink-0 place-items-center bg-styler-accent-soft text-sm font-semibold text-styler-accent">
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
        <section className="mt-8 flex flex-col gap-5 bg-styler-accent px-5 py-7 text-white sm:px-8 sm:py-9 md:flex-row md:items-center md:justify-between">
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
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-semibold text-styler-accent transition hover:bg-styler-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Find a professional
            <ArrowUpRight size={17} />
          </Link>
        </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
