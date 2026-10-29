import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import Link from "next/link";
import { LoaderCircle, Sparkles } from "lucide-react";

export function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <img
      src="/styler-icon.svg"
      alt="Styler"
      className={`shrink-0 transition-transform hover:scale-105 ${
        small ? "h-5 w-5" : "h-7 w-7"
      }`}
      width={small ? 20 : 28}
      height={small ? 20 : 28}
    />
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Styler home"
      className={`inline-flex items-center gap-2 text-xl font-extrabold tracking-tight transition-opacity hover:opacity-90 ${
        light ? "text-white" : "text-gray-900 dark:text-white"
      }`}
    >
      <BrandMark />
      <span>Styler</span>
    </Link>
  );
}

export function Button({
  children,
  variant = "primary",
  loading = false,
  className = "",
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
}) {
  const variantStyles = {
    primary:
      "bg-pink-600 text-white hover:bg-pink-700 dark:bg-pink-600 dark:hover:bg-pink-500 shadow-xs",
    secondary:
      "border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121620] text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800",
    ghost:
      "bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white",
    danger:
      "bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500 shadow-xs",
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded px-4 py-2 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 disabled:pointer-events-none disabled:opacity-50 ${variantStyles[variant]} ${className}`}
      disabled={Boolean(disabled) || loading}
      {...props}
    >
      {loading ? <LoaderCircle className="animate-spin shrink-0" size={15} /> : null}
      {children}
    </button>
  );
}

export function Card({
  children,
  className = "",
  ...props
}: {
  children: ReactNode;
  className?: string;
  [key: string]: any;
}) {
  return (
    <section
      className={`rounded border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs ${className}`}
      {...props}
    >
      {children}
    </section>
  );
}

export function Field({
  label,
  help,
  error,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  help?: string;
  error?: string;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 text-xs ${className}`}>
      {label && <span className="font-semibold text-gray-700 dark:text-gray-300">{label}</span>}
      <input
        className={`w-full rounded border bg-white dark:bg-[#121620] px-3 py-2 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors focus:border-pink-500 focus:outline-none ${
          error ? "border-rose-500" : "border-gray-200 dark:border-gray-800"
        }`}
        {...props}
      />
      {help && <span className="text-[10px] text-gray-400">{help}</span>}
      {error && <span className="text-[10px] font-medium text-rose-500">{error}</span>}
    </label>
  );
}

export function SelectField({
  label,
  children,
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 text-xs ${className}`}>
      {label && <span className="font-semibold text-gray-700 dark:text-gray-300">{label}</span>}
      <select
        className="w-full rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121620] px-3 py-2 text-xs text-gray-900 dark:text-white transition-colors focus:border-pink-500 focus:outline-none"
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function TextAreaField({
  label,
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 text-xs ${className}`}>
      {label && <span className="font-semibold text-gray-700 dark:text-gray-300">{label}</span>}
      <textarea
        className="min-h-[90px] w-full rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121620] px-3 py-2 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors focus:border-pink-500 focus:outline-none"
        {...props}
      />
    </label>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-gray-100 dark:border-gray-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-0.5">
        {eyebrow && (
          <div className="text-[10px] font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400">
            {eyebrow}
          </div>
        )}
        <h1 className="font-serif text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status?: string }) {
  const normalized = String(status || "unknown").toLowerCase();

  const tone = [
    "approved",
    "active",
    "confirmed",
    "completed",
    "captured",
    "transferred",
    "published",
    "verified",
  ].includes(normalized)
    ? "success"
    : [
        "pending_review",
        "pending",
        "pending_payment",
        "created",
        "sent",
        "on_hold",
        "processing",
        "matching",
        "offers_sent",
        "needs_changes",
      ].includes(normalized)
    ? "warning"
    : [
        "rejected",
        "failed",
        "cancelled",
        "suspended",
        "refunded",
        "disabled",
      ].includes(normalized)
    ? "danger"
    : "neutral";

  const toneStyles = {
    success:
      "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50",
    warning:
      "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50",
    danger:
      "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/50",
    neutral:
      "bg-gray-50 dark:bg-gray-800/40 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800",
  };

  const dotStyles = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
    neutral: "bg-gray-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-semibold capitalize ${toneStyles[tone]}`}
    >
      <span className={`h-1.5 w-1.5 rounded ${dotStyles[tone]}`} />
      {normalized.replace(/_/g, " ")}
    </span>
  );
}

export function Alert({
  tone = "info",
  children,
}: {
  tone?: "info" | "success" | "error" | "warning";
  children: ReactNode;
}) {
  const toneStyles = {
    info: "border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300",
    success: "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300",
    error: "border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300",
    warning: "border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300",
  };

  return (
    <div
      className={`rounded border p-3 text-xs font-medium leading-relaxed ${toneStyles[tone]}`}
      role="status"
    >
      {children}
    </div>
  );
}

export function LoadingBlock({
  label = "Loading your Styler workspace…",
}: {
  label?: string;
}) {
  return (
    <div className="flex items-center justify-center gap-2.5 rounded border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] p-8 text-xs font-medium text-gray-500 dark:text-gray-400 shadow-xs">
      <LoaderCircle className="animate-spin text-pink-600 dark:text-pink-400" size={20} />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] p-8 text-center shadow-xs sm:p-12 space-y-3">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400">
        {icon || <Sparkles size={20} />}
      </div>
      <div className="max-w-md space-y-0.5">
        <h3 className="font-serif text-base font-bold text-gray-900 dark:text-white">{title}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{description}</p>
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}