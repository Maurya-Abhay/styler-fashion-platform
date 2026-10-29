"use client";

import { useEffect, useState } from "react";
import { Mail, RefreshCw } from "lucide-react";
import { apiRequest, dateTime, humanize } from "@/components/api-client";
import { Alert, Button, Card, EmptyState, LoadingBlock, PageHeading, StatusBadge } from "@/components/ui";

type ContactMessage = {
  _id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "new" | "in_progress" | "resolved";
  emailDeliveryStatus: "pending" | "sent" | "failed";
  emailDeliveryError?: string;
  createdAt: string;
};

export function AdminContactMessagesScreen() {
  const [items, setItems] = useState<ContactMessage[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ limit: "50" });
    if (status) params.set("status", status);
    setLoading(true);
    setError("");
    apiRequest<{ items: ContactMessage[] }>(`/api/admin/contact-messages?${params}`)
      .then((result) => {
        if (active) setItems(result.items || []);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load contact messages.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reload, status]);

  async function updateStatus(item: ContactMessage, nextStatus: ContactMessage["status"]) {
    setBusy(item._id);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/api/admin/contact-messages/${item._id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setNotice(`Message marked ${humanize(nextStatus).toLowerCase()}.`);
      setReload((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update message status.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeading
        title="Contact Inbox"
        description="Customer contact-form submissions are saved here, even if email forwarding is unavailable."
        action={
          <Button variant="secondary" onClick={() => setReload((value) => value + 1)} loading={loading}>
            <RefreshCw size={14} className="mr-1.5" /> Refresh
          </Button>
        }
      />
      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}
      <div className="flex items-center justify-between gap-3">
        <label className="sr-only" htmlFor="contact-status">Filter contact messages</label>
        <select
          id="contact-status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded border border-styler-line bg-styler-surface px-3 py-2 text-xs text-styler-ink"
        >
          <option value="">All messages</option>
          <option value="new">New</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
        </select>
        <span className="text-xs text-styler-muted">{items.length} message(s)</span>
      </div>
      {loading ? (
        <LoadingBlock />
      ) : items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item._id} className="space-y-3 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-styler-ink">{item.subject}</h2>
                  <p className="mt-1 text-xs text-styler-ink-soft">{item.name} · <a className="underline" href={`mailto:${item.email}`}>{item.email}</a></p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={item.status} />
                  <StatusBadge status={`email_${item.emailDeliveryStatus}`} />
                </div>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-styler-ink-soft">{item.message}</p>
              {item.emailDeliveryError && <p className="text-xs text-amber-700 dark:text-amber-300">Email forwarding issue: {item.emailDeliveryError}</p>}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-styler-line pt-3">
                <span className="text-[11px] text-styler-muted">Received {dateTime(item.createdAt)}</span>
                <div className="flex gap-2">
                  <a href={`mailto:${item.email}?subject=${encodeURIComponent(`Re: ${item.subject}`)}`} className="inline-flex items-center gap-1 rounded border border-styler-line px-3 py-2 text-xs font-semibold text-styler-ink-soft">
                    <Mail size={13} /> Reply
                  </a>
                  {item.status !== "resolved" && (
                    <Button
                      variant={item.status === "new" ? "secondary" : "primary"}
                      loading={busy === item._id}
                      onClick={() => void updateStatus(item, item.status === "new" ? "in_progress" : "resolved")}
                    >
                      Mark {item.status === "new" ? "in progress" : "resolved"}
                    </Button>
                  )}
                  {item.status === "resolved" && (
                    <Button variant="secondary" loading={busy === item._id} onClick={() => void updateStatus(item, "in_progress")}>
                      Reopen
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <EmptyState title="No contact messages" description="New submissions from the public contact form will appear here." icon={<Mail size={22} />} />
        </Card>
      )}
    </div>
  );
}
