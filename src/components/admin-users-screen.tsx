"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Search, UserRoundX, UserRoundCheck } from "lucide-react";
import { apiRequest, dateTime, humanize } from "@/components/api-client";
import { Alert, Button, Card, EmptyState, LoadingBlock, PageHeading, StatusBadge } from "@/components/ui";

type AdminUser = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: "customer" | "professional";
  accountStatus: string;
  emailVerifiedAt?: string | null;
  createdAt: string;
  lastLoginAt?: string | null;
  professionalProfile?: {
    displayName?: string;
    applicationStatus?: string;
    city?: string;
    state?: string;
  } | null;
};

type UsersResponse = {
  items: AdminUser[];
  page: number;
  total: number;
  totalPages: number;
};

export function AdminUsersScreen() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (role) params.set("role", role);
      if (status) params.set("status", status);
      if (query.trim()) params.set("q", query.trim());
      setLoading(true);
      setError("");
      apiRequest<UsersResponse>(`/api/admin/users?${params}`)
        .then((result) => {
          if (active) setData(result);
        })
        .catch((cause) => {
          if (active) setError(cause instanceof Error ? cause.message : "Could not load users.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 200);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [page, query, reload, role, status]);

  async function setSuspended(user: AdminUser, suspended: boolean) {
    const action = suspended ? "Suspend" : "Reactivate";
    const reason = window.prompt(`${action} ${user.name}. Enter a reason (at least 3 characters):`);
    if (!reason || reason.trim().length < 3) return;

    setBusy(user._id);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/api/admin/users/${user._id}/suspend`, {
        method: "PATCH",
        body: JSON.stringify({ suspended, reason: reason.trim() }),
      });
      setNotice(`${user.role === "customer" ? "Customer" : "Professional"} account ${suspended ? "suspended" : "reactivated"}.`);
      setReload((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Could not ${suspended ? "suspend" : "reactivate"} this account.`);
    } finally {
      setBusy("");
    }
  }

  const items = data?.items ?? [];
  const totalPages = Math.max(1, data?.totalPages ?? 1);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeading
        title="Users"
        description="Review customer and professional accounts. Administrator accounts are excluded and cannot be suspended here."
        action={
          <Button variant="secondary" onClick={() => setReload((value) => value + 1)} loading={loading}>
            <RefreshCw size={14} className="mr-1.5" /> Refresh
          </Button>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <Card className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded border border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-[#121620]">
          <Search size={16} className="shrink-0 text-gray-400" aria-hidden />
          <span className="sr-only">Search users</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search name, email or phone"
            className="w-full bg-transparent text-xs text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
          />
        </label>
        <label className="sr-only" htmlFor="admin-users-role">Filter by role</label>
        <select
          id="admin-users-role"
          value={role}
          onChange={(event) => {
            setRole(event.target.value);
            setPage(1);
          }}
          className="rounded border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 dark:border-gray-800 dark:bg-[#121620] dark:text-white"
        >
          <option value="">All roles</option>
          <option value="customer">Customers</option>
          <option value="professional">Professionals</option>
        </select>
        <label className="sr-only" htmlFor="admin-users-status">Filter by account status</label>
        <select
          id="admin-users-status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className="rounded border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 dark:border-gray-800 dark:bg-[#121620] dark:text-white"
        >
          <option value="">All account statuses</option>
          {["active", "pending_email", "suspended", "disabled"].map((item) => (
            <option key={item} value={item}>{humanize(item)}</option>
          ))}
        </select>
        <span className="shrink-0 text-xs text-gray-500">
          {Number(data?.total ?? 0).toLocaleString("en-IN")} total
        </span>
      </Card>

      {loading ? (
        <LoadingBlock />
      ) : items.length ? (
        <div className="space-y-2.5">
          {items.map((user) => {
            const profile = user.professionalProfile;
            const canSuspend = user.accountStatus === "active";
            const canReactivate = user.accountStatus === "suspended";
            return (
              <Card key={user._id} className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                      {profile?.displayName || user.name}
                    </h2>
                    <StatusBadge status={user.role} />
                    <StatusBadge status={user.accountStatus} />
                    {profile?.applicationStatus && <StatusBadge status={profile.applicationStatus} />}
                  </div>
                  <p className="break-all text-xs text-gray-600 dark:text-gray-300">{user.email}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-400">
                    {user.phone && <span>{user.phone}</span>}
                    {(profile?.city || profile?.state) && <span>{[profile.city, profile.state].filter(Boolean).join(", ")}</span>}
                    <span>Joined {dateTime(user.createdAt)}</span>
                    <span>{user.emailVerifiedAt ? "Email verified" : "Email not verified"}</span>
                    <span>Last login {dateTime(user.lastLoginAt ?? undefined)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {canSuspend && (
                    <Button variant="danger" loading={busy === user._id} onClick={() => void setSuspended(user, true)}>
                      <UserRoundX size={14} /> Suspend
                    </Button>
                  )}
                  {canReactivate && (
                    <Button variant="secondary" loading={busy === user._id} onClick={() => void setSuspended(user, false)}>
                      <UserRoundCheck size={14} /> Reactivate
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <EmptyState title="No users found" description="Try changing the role, status or search filters." />
        </Card>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</Button>
          <Button variant="secondary" disabled={page >= totalPages || loading} onClick={() => setPage((value) => value + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}
