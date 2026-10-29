"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Users,
  WalletCards,
  ArrowUpRight,
  Clock,
  FileText,
  Activity
} from "lucide-react";
import { apiRequest, dateTime, humanize, money, unwrapItems } from "@/components/api-client";
import { Alert, Button, Card, EmptyState, Field, LoadingBlock, PageHeading, SelectField, StatusBadge, TextAreaField } from "@/components/ui";

export function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [periodDays, setPeriodDays] = useState("7");

  useEffect(() => {
    let active = true;
    setError("");
    apiRequest<any>(`/api/admin/dashboard?days=${periodDays}`)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refresh, periodDays]);

  const stats = [
    { 
      label: "Total Users", 
      value: data?.users ?? 0, 
      icon: Users, 
      trendUp: true,
      bgColor: "bg-pink-100 dark:bg-pink-900/30",
      textColor: "text-pink-600 dark:text-pink-400"
    },
    { 
      label: "Total Professionals", 
      value: data?.approvedProfessionals ?? 0, 
      icon: BadgeCheck, 
      trendUp: true,
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      textColor: "text-blue-600 dark:text-blue-400"
    },
    { 
      label: "Total Bookings", 
      value: data?.bookings ?? 0, 
      icon: CalendarDays, 
      trendUp: true,
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
      textColor: "text-emerald-600 dark:text-emerald-400"
    },
    { 
      label: `Revenue · Last ${periodDays} Days`, 
      value: data?.platformRevenuePaise ? (data.platformRevenuePaise / 100) : 0, 
      icon: WalletCards, 
      trendUp: true,
      isMoney: true,
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
      textColor: "text-amber-600 dark:text-amber-400"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Good Morning, Admin! <span className="text-xl">👋</span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Here's what's happening with your platform today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <Button variant="secondary" onClick={() => { setLoading(true); setRefresh((v) => v + 1); }} loading={loading}>
            <RefreshCw size={14} className="mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {loading ? (
        <LoadingBlock />
      ) : !data ? (
        <EmptyState title="Dashboard unavailable" description="The dashboard API did not return data." />
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <Card className="rounded p-5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-sm flex items-center gap-4" key={s.label}>
                  <div className={`flex-shrink-0 h-12 w-12 flex items-center justify-center rounded ${s.bgColor} ${s.textColor}`}>
                    <Icon size={24} />
                  </div>
                  <div className="flex-1">
                    <span className="block text-xs font-medium text-gray-500 dark:text-gray-400">{s.label}</span>
                    <div className="flex items-end gap-2 mt-1">
                      <strong className="text-2xl font-bold text-gray-900 dark:text-white">
                        {s.isMoney ? money(s.value * 100) : Number(s.value).toLocaleString("en-IN")}
                      </strong>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* Left Column (Charts & Bookings) */}
            <div className="xl:col-span-2 space-y-6">
              
              {/* Financial Snapshot (Replacing Chart for now with API data) */}
              <Card className="rounded p-5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-sm">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Revenue Overview</h2>
                  <SelectField
                    className="w-32 text-xs py-1.5"
                    value={periodDays}
                    onChange={(event) => {
                      setLoading(true);
                      setPeriodDays(event.target.value);
                    }}
                  >
                    <option value="7">Last 7 Days</option>
                    <option value="30">Last 30 Days</option>
                  </SelectField>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="p-4 rounded border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#121620]">
                    <span className="block text-xs font-medium text-gray-500 dark:text-gray-400">Captured Payment Volume</span>
                    <strong className="block text-2xl mt-1 text-gray-900 dark:text-white">{money(data.capturedPaymentVolumePaise)}</strong>
                    <small className="block mt-1 text-[11px] text-gray-400">Gross customer payment volume.</small>
                  </div>
                  <div className="p-4 rounded border border-pink-100 dark:border-pink-900/30 bg-pink-50/50 dark:bg-pink-900/10">
                    <span className="block text-xs font-medium text-pink-600 dark:text-pink-400">Platform Commission</span>
                    <strong className="block text-2xl mt-1 text-gray-900 dark:text-white">{money(data.platformRevenuePaise)}</strong>
                    <small className="block mt-1 text-[11px] text-gray-400">Recorded commission earnings.</small>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-xs font-medium text-gray-500">Pending payout exposure</span>
                  <strong className="text-sm text-gray-900 dark:text-white">
                    {money(data.pendingPayoutPaise)} · {data.pendingPayoutCount || 0} payout(s)
                  </strong>
                </div>
              </Card>

              {/* Review Queue (Similar to Latest Bookings structure) */}
              <Card className="rounded p-5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Action Required</h2>
                  <Link href="/admin/applications" className="text-xs font-medium text-pink-600 dark:text-pink-400 flex items-center gap-1 hover:underline">
                    View Queue <ArrowRight size={12} />
                  </Link>
                </div>
                
                {Number(data.pendingApplications) > 0 ? (
                  <div className="flex items-center gap-4 p-4 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
                    <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 font-bold text-lg">
                      {data.pendingApplications}
                    </div>
                    <div className="flex-1">
                      <strong className="block text-sm text-amber-900 dark:text-amber-100">Applications need your attention</strong>
                      <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-0.5">Check documents and profiles before approval.</p>
                    </div>
                    <Link href="/admin/applications" className="px-3 py-1.5 bg-amber-100 dark:bg-amber-800 text-amber-800 dark:text-amber-100 text-xs font-medium rounded hover:bg-amber-200 dark:hover:bg-amber-700 transition">
                      Review
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-gray-800 rounded">
                    No pending applications at the moment.
                  </div>
                )}
              </Card>
            </div>

            {/* Right Column (Quick Actions & Activity) */}
            <div className="space-y-6">
              
              {/* Quick Actions */}
              <Card className="rounded p-5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-sm">
                <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/admin/applications" className="p-3 rounded border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#121620] hover:border-pink-200 dark:hover:border-pink-900/50 transition group">
                    <div className="h-8 w-8 rounded bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <FileCheck2 size={16} />
                    </div>
                    <strong className="block text-xs text-gray-900 dark:text-white">View Applications</strong>
                    <span className="block text-[10px] text-gray-500 mt-0.5 line-clamp-1">Review new profiles</span>
                  </Link>
                  <Link href="/admin/commissions" className="p-3 rounded border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#121620] hover:border-blue-200 dark:hover:border-blue-900/50 transition group">
                    <div className="h-8 w-8 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <SlidersHorizontal size={16} />
                    </div>
                    <strong className="block text-xs text-gray-900 dark:text-white">Manage Commissions</strong>
                    <span className="block text-[10px] text-gray-500 mt-0.5 line-clamp-1">Set platform rates</span>
                  </Link>
                  <Link href="/admin/payments" className="p-3 rounded border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#121620] hover:border-purple-200 dark:hover:border-purple-900/50 transition group">
                    <div className="h-8 w-8 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <CreditCard size={16} />
                    </div>
                    <strong className="block text-xs text-gray-900 dark:text-white">View Payments</strong>
                    <span className="block text-[10px] text-gray-500 mt-0.5 line-clamp-1">Track transactions</span>
                  </Link>
                  <Link href="/admin/reports" className="p-3 rounded border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#121620] hover:border-emerald-200 dark:hover:border-emerald-900/50 transition group">
                    <div className="h-8 w-8 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <Activity size={16} />
                    </div>
                    <strong className="block text-xs text-gray-900 dark:text-white">Generate Reports</strong>
                    <span className="block text-[10px] text-gray-500 mt-0.5 line-clamp-1">Platform analytics</span>
                  </Link>
                </div>
              </Card>

              {/* Marketplace Pulse (Matches Recent Activity visual style) */}
              <Card className="rounded p-5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Marketplace Pulse</h2>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400">
                      <Users size={14} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-900 dark:text-gray-200">
                        Total Customer Accounts: <strong className="font-semibold">{Number(data.customers || 0).toLocaleString("en-IN")}</strong>
                      </p>
                      <span className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5"><Clock size={10} /> Live data</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400">
                      <Activity size={14} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-900 dark:text-gray-200">
                        Open Matching Requests: <strong className="font-semibold">{Number(data.activeRequests || 0).toLocaleString("en-IN")}</strong>
                      </p>
                      <span className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5"><Clock size={10} /> Live data</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400">
                      <ShieldCheck size={14} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-900 dark:text-gray-200">
                        Platform Settings Version: <strong className="font-semibold">v{data.settings?.settingsVersion || 1}</strong>
                      </p>
                      <span className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5"><CheckCircle2 size={10} /> Active</span>
                    </div>
                  </div>
                </div>
              </Card>

            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ADMIN APPLICATIONS QUEUE                                                   */
/* -------------------------------------------------------------------------- */

export function AdminApplications() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("pending_review");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const d = await apiRequest<any>(`/api/admin/applications?status=${status}&limit=100`);
      setItems(unwrapItems(d));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load applications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [status]);

  async function action(item: any, kind: "approve" | "reject" | "request-changes") {
    let body: any = {};
    if (kind !== "approve") {
      const reason = window.prompt(kind === "reject" ? "Reason for rejection (minimum 3 characters):" : "What changes does this applicant need to make?");
      if (!reason || reason.trim().length < 3) return;
      body = { reason };
    }
    setBusy(String(item._id) + kind);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/api/admin/applications/${item._id}/${kind}`, {
        method: "POST",
        body: JSON.stringify(body)
      });
      setNotice(kind === "approve" ? "Professional approved." : kind === "reject" ? "Application rejected with a reason." : "Correction request sent.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update application.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400">Trust & Safety</p>
          <h1 className="text-xl font-bold font-serif text-gray-900 dark:text-white mt-0.5">Application Review Queue</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Verify documents, service listings, and availability before activation.</p>
        </div>
        <Button variant="secondary" onClick={load} loading={loading}>
          <RefreshCw size={14} className="mr-1.5" /> Refresh
        </Button>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#1a1f2b] p-3 rounded border border-gray-100 dark:border-gray-800 shadow-xs">
        <div className="w-full sm:w-64">
          <SelectField aria-label="Application status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="pending_review">Pending Review</option>
            <option value="needs_changes">Needs Changes</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All Applications</option>
          </SelectField>
        </div>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Showing <strong className="text-gray-900 dark:text-white">{items.length}</strong> application(s)
        </span>
      </div>

      {loading ? (
        <LoadingBlock />
      ) : items.length ? (
        <div className="space-y-3">
          {items.map((p) => {
            const hasIdProof = (p.documents || []).some((d: any) => d.documentType === "identity_proof");
            const hasAddrProof = (p.documents || []).some((d: any) => d.documentType === "address_proof");

            return (
              <Card className="rounded p-4 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs space-y-3" key={p._id}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-300 font-bold text-sm grid place-items-center">
                      {(p.displayName || p.userId?.name || "S").slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-snug">
                        {p.displayName || p.userId?.name || "New Professional"}
                      </h3>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-0.5">
                        <span>{p.userId?.email || "No email"}</span>
                        <span>•</span>
                        <span>{p.userId?.phone || "No phone"}</span>
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={p.applicationStatus} />
                </div>

                {/* Bio */}
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-2">
                  {p.bio || "No introduction provided."}
                </p>

                {/* Meta details & Checklists */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-gray-50 dark:bg-[#121620] p-2.5 rounded border border-gray-100 dark:border-gray-800/80">
                  <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                    <FileCheck2 size={13} className={hasIdProof ? "text-emerald-500" : "text-amber-500"} />
                    <span>ID Proof: <strong className="text-gray-800 dark:text-gray-200">{hasIdProof ? "Uploaded" : "Missing"}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                    <FileCheck2 size={13} className={hasAddrProof ? "text-emerald-500" : "text-amber-500"} />
                    <span>Address: <strong className="text-gray-800 dark:text-gray-200">{hasAddrProof ? "Uploaded" : "Missing"}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                    <Sparkles size={13} className={p.activeServiceCount ? "text-emerald-500" : "text-amber-500"} />
                    <span>Services: <strong className="text-gray-800 dark:text-gray-200">{p.activeServiceCount ?? "Review"}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                    <CalendarDays size={13} className={p.hasAvailability ? "text-emerald-500" : "text-amber-500"} />
                    <span>Availability: <strong className="text-gray-800 dark:text-gray-200">{p.hasAvailability ? "Set" : "Pending"}</strong></span>
                  </div>
                </div>

                {p.reviewReason && (
                  <Alert tone="warning">
                    Previous review note: {p.reviewReason}
                  </Alert>
                )}

                {/* Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-gray-400">
                    {[p.city, p.state].filter(Boolean).join(", ") || "Location incomplete"} • {p.experienceYears || 0} yrs exp
                  </span>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/applications/${p._id}`}
                      className="inline-flex items-center gap-1 rounded bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                    >
                      Open Application <ArrowRight size={13} />
                    </Link>

                    {["pending_review", "needs_changes"].includes(p.applicationStatus) && (
                      <Button loading={busy === String(p._id) + "approve"} onClick={() => action(p, "approve")}>
                        <BadgeCheck size={13} className="mr-1" /> Approve
                      </Button>
                    )}
                    {["pending_review", "needs_changes"].includes(p.applicationStatus) && (
                      <Button variant="secondary" loading={busy === String(p._id) + "request-changes"} onClick={() => action(p, "request-changes")}>
                        Request Changes
                      </Button>
                    )}
                    {["draft", "pending_review", "needs_changes"].includes(p.applicationStatus) && (
                      <Button variant="danger" loading={busy === String(p._id) + "reject"} onClick={() => action(p, "reject")}>
                        Reject
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="rounded p-8 text-center border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b]">
          <EmptyState
            title="No applications in this queue"
            description="There are no applications matching the selected status right now."
            icon={<FileCheck2 size={22} />}
          />
        </Card>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ADMIN APPLICATION DETAIL                                                   */
/* -------------------------------------------------------------------------- */

export function AdminApplicationDetail({ id }: { id: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [openingDocument, setOpeningDocument] = useState("");

  useEffect(() => {
    apiRequest<any>(`/api/admin/applications/${id}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const p = data?.profile || data;

  async function openDocument(doc: any) {
    const tab = window.open("about:blank", "_blank");
    setOpeningDocument(String(doc.id || doc._id || doc.documentType));
    setError("");
    try {
      const documentId = String(doc.id || doc._id || "");
      if (!documentId) throw new Error("Document identifier is unavailable.");
      const result = await apiRequest<any>(`/api/admin/applications/${id}/documents/${documentId}`);
      if (tab) {
        tab.opener = null;
        tab.location.href = result.url;
      } else {
        throw new Error("Your browser blocked the document tab. Allow pop-ups and try again.");
      }
    } catch (e) {
      tab?.close();
      setError(e instanceof Error ? e.message : "Could not open the private document.");
    } finally {
      setOpeningDocument("");
    }
  }

  async function action(kind: "approve" | "reject" | "request-changes") {
    let body: any = {};
    if (kind !== "approve") {
      const reason = window.prompt("Enter a clear reason or correction request (minimum 3 characters):");
      if (!reason || reason.trim().length < 3) return;
      body = { reason };
    }
    setBusy(true);
    setError("");
    try {
      await apiRequest(`/api/admin/applications/${id}/${kind}`, {
        method: "POST",
        body: JSON.stringify(body)
      });
      setNotice("Application status updated.");
      const updated = await apiRequest<any>(`/api/admin/applications/${id}`);
      setData(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update application.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400">Application Detail</p>
          <h1 className="text-xl font-bold font-serif text-gray-900 dark:text-white mt-0.5">{p?.displayName || "Professional Application"}</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Review applicant details, verification documents, and decision status.</p>
        </div>
        <Link
          href="/admin/applications"
          className="inline-flex items-center gap-1.5 rounded bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition self-start sm:self-auto"
        >
          ← Back to Queue
        </Link>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      {loading ? (
        <LoadingBlock />
      ) : !p ? (
        <Card className="rounded p-8 text-center border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b]">
          <EmptyState title="Application not found" description="This application may have been removed or is not accessible." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Main Info (Left 2 cols) */}
          <div className="xl:col-span-2 space-y-5">
            {/* Profile Overview Card */}
            <Card className="rounded p-5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded overflow-hidden bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-300 font-bold text-lg grid place-items-center shrink-0">
                    {p.profilePhoto?.url ? (
                      <img src={p.profilePhoto.url} alt={p.displayName} className="h-full w-full object-cover" />
                    ) : (
                      (p.displayName || "S").slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">{p.displayName || "—"}</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Submitted on {dateTime(p.applicationSubmittedAt)}</p>
                  </div>
                </div>
                <StatusBadge status={p.applicationStatus} />
              </div>

              {p.bio && (
                <div className="p-3 rounded bg-gray-50 dark:bg-[#121620] border border-gray-100 dark:border-gray-800/80">
                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{p.bio}</p>
                </div>
              )}

              {/* Grid Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 text-xs">
                <div className="p-2.5 rounded border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#121620]">
                  <span className="text-[10px] text-gray-400 block">Experience</span>
                  <strong className="text-gray-900 dark:text-white font-semibold">{p.experienceYears || 0} Years</strong>
                </div>
                <div className="p-2.5 rounded border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#121620]">
                  <span className="text-[10px] text-gray-400 block">Location</span>
                  <strong className="text-gray-900 dark:text-white font-semibold">{[p.city, p.state].filter(Boolean).join(", ") || "—"}</strong>
                </div>
                <div className="p-2.5 rounded border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#121620]">
                  <span className="text-[10px] text-gray-400 block">PIN Code</span>
                  <strong className="text-gray-900 dark:text-white font-semibold">{p.postalCode || "—"}</strong>
                </div>
              </div>

              {/* Categories */}
              {p.categories?.length > 0 && (
                <div className="pt-2">
                  <span className="text-[11px] font-semibold text-gray-500 block mb-1.5">Service Categories</span>
                  <div className="flex flex-wrap gap-1.5">
                    {p.categories.map((c: string) => (
                      <span key={c} className="rounded bg-pink-50 dark:bg-pink-900/30 px-2.5 py-0.5 text-[10px] font-semibold text-pink-600 dark:text-pink-400 border border-pink-200/50 dark:border-pink-800/40">
                        {humanize(c)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Portfolio Grid */}
              {p.portfolioImages?.length > 0 && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-[11px] font-semibold text-gray-500 block mb-2">Portfolio Samples</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {p.portfolioImages.map((img: any, i: number) => (
                      <div key={i} className="h-24 rounded overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200/60 dark:border-gray-800">
                        <img src={img.url} alt={img.altText || "Portfolio"} className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Submitted Documents Section */}
            <Card className="rounded p-5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-500" />
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white">Verification Documents</h3>
                </div>
                <span className="text-[10px] text-gray-400">Strictly confidential</span>
              </div>

              {(p.documents || []).length ? (
                <div className="space-y-2">
                  {p.documents.map((d: any) => (
                    <div key={d.id || d._id || d.documentType} className="flex items-center justify-between p-3 rounded border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#121620]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileCheck2 size={16} className="text-pink-500 shrink-0" />
                        <div className="min-w-0">
                          <strong className="block text-xs text-gray-900 dark:text-white">{humanize(d.documentType)}</strong>
                          <span className="block text-[10px] text-gray-400 truncate">{d.originalFileName || "Uploaded File"}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={d.status || "pending"} />
                        <Button
                          variant="secondary"
                          loading={openingDocument === String(d.id || d._id || d.documentType)}
                          onClick={() => openDocument(d)}
                        >
                          Review File <ArrowRight size={12} className="ml-1" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 py-3 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded">
                  No document files submitted yet.
                </p>
              )}
            </Card>
          </div>

          {/* Right Column (Account & Decision) */}
          <div className="space-y-5">
            {/* User Account Info */}
            <Card className="rounded p-5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2">
                Applicant Account Details
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800/60">
                  <span className="text-gray-400">Full Name</span>
                  <strong className="text-gray-800 dark:text-gray-200">{p.userId?.name || "—"}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800/60">
                  <span className="text-gray-400">Email</span>
                  <strong className="text-gray-800 dark:text-gray-200">{p.userId?.email || "—"}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800/60">
                  <span className="text-gray-400">Mobile</span>
                  <strong className="text-gray-800 dark:text-gray-200">{p.userId?.phone || "—"}</strong>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-400">Account Status</span>
                  <StatusBadge status={p.userId?.accountStatus} />
                </div>
              </div>
            </Card>

            {/* Decision Panel */}
            <Card className="rounded p-5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-gray-900 dark:text-white">Review Decision</h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                Confirm documents, categories, and schedule availability before approving.
              </p>

              <div className="space-y-2 pt-2">
                <Button onClick={() => action("approve")} loading={busy} disabled={p.applicationStatus !== "pending_review"} className="w-full justify-center">
                  <BadgeCheck size={14} className="mr-1.5" /> Approve Application
                </Button>
                <Button variant="secondary" onClick={() => action("request-changes")} loading={busy} className="w-full justify-center">
                  Request Changes
                </Button>
                <Button variant="danger" onClick={() => action("reject")} loading={busy} className="w-full justify-center">
                  Reject Application
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* PLATFORM CONTROL & SETTINGS                                                */
/* -------------------------------------------------------------------------- */

export function AdminSettings() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    apiRequest<any>("/api/admin/settings")
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function update(k: string, v: any) {
    setData((d: any) => ({ ...d, [k]: v }));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const payload = {
        defaultCommissionPercent: Number(data.defaultCommissionPercent),
        customerPlatformFeeEnabled: Boolean(data.customerPlatformFeeEnabled),
        customerPlatformFeeType: data.customerPlatformFeeType,
        customerPlatformFeePaise: Number(data.customerPlatformFeePaise || 0),
        customerPlatformFeePercent: Number(data.customerPlatformFeePercent || 0),
        maxOffersPerRequest: Number(data.maxOffersPerRequest),
        offerWindowMinutes: Number(data.offerWindowMinutes),
        paymentHoldMinutes: Number(data.paymentHoldMinutes),
        maxAdvanceBookingDays: Number(data.maxAdvanceBookingDays),
        defaultTravelBufferMinutes: Number(data.defaultTravelBufferMinutes),
        cancellationPolicy: data.cancellationPolicy,
      };
      const updated = await apiRequest<any>("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setData(updated);
      setNotice("Platform settings saved successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save settings.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingBlock />;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold font-serif text-gray-900 dark:text-white mt-0.5">Marketplace Settings</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">Configure marketplace response rules, commissions, fees, and cancellation policies.</p>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <form onSubmit={save} className="space-y-4">
        {/* Commission & Pricing */}
        <Card className="rounded p-5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs space-y-4">
          <div>
            <h2 className="text-xs font-bold text-gray-900 dark:text-white">Commission & Customer Pricing</h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Rules apply to new bookings only. Existing price snapshots remain intact.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <Field
              label="Default Professional Commission (%)"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={data?.defaultCommissionPercent ?? 12}
              onChange={(e) => update("defaultCommissionPercent", Number(e.target.value))}
              required
            />

            <div className="flex items-center justify-between p-3 rounded border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#121620] md:col-span-2">
              <div>
                <strong className="block text-xs font-bold text-gray-900 dark:text-white">Charge Customer Platform Fee</strong>
                <span className="block text-[10px] text-gray-500">Optional checkout platform fee.</span>
              </div>
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                checked={Boolean(data?.customerPlatformFeeEnabled)}
                onChange={(e) => update("customerPlatformFeeEnabled", e.target.checked)}
              />
            </div>

            {data?.customerPlatformFeeEnabled && (
              <>
                <SelectField label="Customer Fee Type" value={data?.customerPlatformFeeType || "fixed"} onChange={(e) => update("customerPlatformFeeType", e.target.value)}>
                  <option value="fixed">Fixed Amount</option>
                  <option value="percentage">Percentage</option>
                </SelectField>

                {data?.customerPlatformFeeType === "percentage" ? (
                  <Field
                    label="Customer Fee Percentage (%)"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={data?.customerPlatformFeePercent || 0}
                    onChange={(e) => update("customerPlatformFeePercent", Number(e.target.value))}
                  />
                ) : (
                  <Field
                    label="Fixed Customer Fee (₹)"
                    type="number"
                    min="0"
                    value={Number(data?.customerPlatformFeePaise || 0) / 100}
                    onChange={(e) => update("customerPlatformFeePaise", Math.round(Number(e.target.value || 0) * 100))}
                  />
                )}
              </>
            )}
          </div>
        </Card>

        {/* Fast Matching Rules */}
        <Card className="rounded p-5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs space-y-4">
          <div>
            <h2 className="text-xs font-bold text-gray-900 dark:text-white">Fast-Matching Rules</h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Control matching limits and offer response windows.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <Field label="Max Offers Per Request (1–10)" type="number" min="1" max="10" value={data?.maxOffersPerRequest || 10} onChange={(e) => update("maxOffersPerRequest", Number(e.target.value))} />
            <Field label="Offer Window (minutes)" type="number" min="1" max="10" value={data?.offerWindowMinutes || 10} onChange={(e) => update("offerWindowMinutes", Number(e.target.value))} />
            <Field label="Payment Hold Window (minutes)" type="number" min="1" max="60" value={data?.paymentHoldMinutes || 10} onChange={(e) => update("paymentHoldMinutes", Number(e.target.value))} />
            <Field label="Advance Booking Limit (days)" type="number" min="1" max="180" value={data?.maxAdvanceBookingDays || 30} onChange={(e) => update("maxAdvanceBookingDays", Number(e.target.value))} />
            <Field label="Travel Buffer (minutes)" type="number" min="0" max="240" value={data?.defaultTravelBufferMinutes || 15} onChange={(e) => update("defaultTravelBufferMinutes", Number(e.target.value))} />
          </div>
        </Card>

        {/* Cancellation Policy */}
        <Card className="rounded p-5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs space-y-4">
          <div>
            <h2 className="text-xs font-bold text-gray-900 dark:text-white">Cancellation Policy</h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Set cancellation cut-offs and refund modes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <Field
              label="Free Cancellation Cut-off (mins before booking)"
              type="number"
              min="0"
              max="10080"
              value={data?.cancellationPolicy?.customerFreeCancellationMinutesBefore ?? 1440}
              onChange={(e) =>
                update("cancellationPolicy", { ...data.cancellationPolicy, customerFreeCancellationMinutesBefore: Number(e.target.value) })
              }
            />

            <SelectField
              label="Refund Mode"
              value={data?.cancellationPolicy?.refundMode || "full_before_cutoff"}
              onChange={(e) => update("cancellationPolicy", { ...data.cancellationPolicy, refundMode: e.target.value })}
            >
              <option value="full_before_cutoff">Full Refund Before Cut-off</option>
              <option value="manual_review">Manual Review Required</option>
            </SelectField>

            <div className="flex items-center justify-between p-3 rounded border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#121620] md:col-span-2">
              <div>
                <strong className="block text-xs font-bold text-gray-900 dark:text-white">Allow Professional Cancellations</strong>
                <span className="block text-[10px] text-gray-500">Subject to cancellation penalty rules.</span>
              </div>
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                checked={data?.cancellationPolicy?.professionalCancellationAllowed !== false}
                onChange={(e) => update("cancellationPolicy", { ...data.cancellationPolicy, professionalCancellationAllowed: e.target.checked })}
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button loading={busy} type="submit">
              Save Settings <ShieldCheck size={14} className="ml-1" />
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* COMMISSION OVERRIDES                                                      */
/* -------------------------------------------------------------------------- */

export function AdminCommissionOverrides() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    try {
      const d = await apiRequest<any>("/api/admin/professionals?limit=100");
      const list = unwrapItems(d);
      setProfiles(list);
      setValues(
        Object.fromEntries(list.map((p: any) => [String(p._id), p.commissionOverridePercent == null ? "" : String(p.commissionOverridePercent)]))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load professional commissions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(p: any) {
    setBusy(String(p._id));
    setError("");
    try {
      await apiRequest("/api/admin/commissions", {
        method: "PATCH",
        body: JSON.stringify({
          professionalProfileId: String(p._id),
          commissionOverridePercent: values[String(p._id)] === "" ? null : Number(values[String(p._id)]),
        }),
      });
      setNotice(`Commission override saved for ${p.displayName || "professional"}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save commission.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400">Platform Revenue</p>
          <h1 className="text-xl font-bold font-serif text-gray-900 dark:text-white mt-0.5">Individual Commission Rules</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Override default platform commission rates for specific professionals.</p>
        </div>
        <Link
          href="/admin/settings"
          className="inline-flex items-center gap-1.5 rounded bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition self-start sm:self-auto"
        >
          <SlidersHorizontal size={13} /> Edit Platform Default
        </Link>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      {loading ? (
        <LoadingBlock />
      ) : profiles.length ? (
        <div className="space-y-2.5">
          {profiles.map((p) => (
            <Card className="rounded p-3.5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3" key={p._id}>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-300 font-bold text-xs grid place-items-center shrink-0">
                  {(p.displayName || "S").slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-xs font-bold text-gray-900 dark:text-white">{p.displayName || "Professional"}</strong>
                    <StatusBadge status={p.applicationStatus} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">{p.city || "Location not set"} • Leave empty for default rate</p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <div className="w-24">
                  <Field
                    aria-label={`Commission override for ${p.displayName}`}
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={values[String(p._id)] ?? ""}
                    placeholder="Default"
                    onChange={(e) => setValues((v) => ({ ...v, [String(p._id)]: e.target.value }))}
                  />
                </div>
                <span className="text-xs text-gray-400 font-bold">%</span>
                <Button loading={busy === String(p._id)} onClick={() => save(p)}>
                  Save
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="rounded p-8 text-center border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b]">
          <EmptyState title="No professional profiles found" description="Approved and pending profiles will appear here." icon={<SlidersHorizontal size={22} />} />
        </Card>
      )}
    </div>
  );
}