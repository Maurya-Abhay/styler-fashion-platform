"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { apiRequest, dateTime } from "@/components/api-client";
import { Alert, Button, Card, Field, LoadingBlock } from "@/components/ui";

type Message = {
  _id: string;
  body: string;
  senderRole: "customer" | "professional";
  senderUserId: { _id?: string; name?: string } | string;
  createdAt: string;
};

export function BookingChat({ bookingId }: { bookingId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [draft, setDraft] = useState("");
  const [canSend, setCanSend] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const result = await apiRequest<{ items: Message[]; canSend: boolean; currentUserId: string }>(
        `/api/bookings/${bookingId}/messages`,
      );
      setMessages(result.items || []);
      setCurrentUserId(result.currentUserId);
      setCanSend(Boolean(result.canSend));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load booking chat.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (active) await refresh(true);
    };
    void load();
    const timer = window.setInterval(() => {
      if (active && !document.hidden) void refresh();
    }, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [refresh]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending || !canSend) return;
    setSending(true);
    setError("");
    try {
      await apiRequest(`/api/bookings/${bookingId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      setDraft("");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send this message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <div className="flex items-center gap-2 border-b border-styler-line pb-3">
        <MessageCircle size={17} className="text-styler-accent" aria-hidden />
        <div>
          <h2 className="text-sm font-bold text-styler-ink">Booking chat</h2>
          <p className="text-[11px] text-styler-muted">Chat with the other person on this accepted booking.</p>
        </div>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {loading ? (
        <LoadingBlock label="Loading conversation…" />
      ) : (
        <div ref={listRef} className="max-h-80 space-y-3 overflow-y-auto rounded border border-styler-line bg-styler-canvas p-3" aria-live="polite">
          {messages.length ? messages.map((message) => {
            const senderId = typeof message.senderUserId === "string"
              ? message.senderUserId
              : message.senderUserId?._id;
            const ownMessage = senderId === currentUserId;
            return (
              <div key={message._id} className={`flex ${ownMessage ? "justify-end" : "justify-start"}`}>
                <article className={`max-w-[85%] rounded-lg px-3 py-2 ${ownMessage ? "bg-styler-accent text-white" : "bg-styler-surface text-styler-ink"}`}>
                  <p className="whitespace-pre-wrap break-words text-xs">{message.body}</p>
                  <p className={`mt-1 text-[9px] ${ownMessage ? "text-white/70" : "text-styler-muted"}`}>
                    {message.senderUserId && typeof message.senderUserId === "object"
                      ? message.senderUserId.name || message.senderRole
                      : message.senderRole}
                    {" · "}{dateTime(message.createdAt)}
                  </p>
                </article>
              </div>
            );
          }) : (
            <p className="py-8 text-center text-xs text-styler-muted">No messages yet. Send a message to coordinate the service.</p>
          )}
        </div>
      )}
      {canSend ? (
        <form onSubmit={send} className="flex items-end gap-2">
          <Field
            aria-label="Message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Write a message…"
            maxLength={2000}
            className="flex-1"
          />
          <Button type="submit" disabled={!draft.trim()} loading={sending} aria-label="Send message">
            <Send size={14} />
          </Button>
        </form>
      ) : (
        <p className="text-xs text-styler-muted">This booking is closed; the conversation is read-only.</p>
      )}
    </Card>
  );
}
