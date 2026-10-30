"use client";

import { useState, type FormEvent } from "react";
import { apiRequest } from "@/components/api-client";
import { Alert, Button, Field, TextAreaField } from "@/components/ui";

export function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setLoading(true);
    setError("");
    setDone("");
    try {
      const result = await apiRequest<{ emailDelivery: "sent" | "failed" }>("/api/contact", {
        method: "POST",
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          subject: data.get("subject") || "General enquiry",
          message: data.get("message"),
        }),
      });
      setDone(result.emailDelivery === "sent"
        ? "Thanks! Your message has been sent to Styler support. Our team will get back to you."
        : "Your message has been received. Email forwarding is temporarily unavailable, but our team can still review it.");
      form.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send your message. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && <Alert tone="error">{error}</Alert>}
      {done && <Alert tone="success">{done}</Alert>}
      <Field
        label="Full name"
        name="name"
        placeholder="Enter your name"
        required
        minLength={2}
        maxLength={100}
        autoComplete="name"
        inputClassName="rounded-sm px-3 py-3 text-sm focus:ring-2 focus:ring-pink-500/20"
      />
      <Field
        label="Email address"
        name="email"
        type="email"
        placeholder="you@example.com"
        required
        maxLength={254}
        autoComplete="email"
        inputClassName="rounded-sm px-3 py-3 text-sm focus:ring-2 focus:ring-pink-500/20"
      />
      <Field
        label="Subject"
        name="subject"
        placeholder="What can we help you with?"
        minLength={3}
        maxLength={150}
        inputClassName="rounded-sm px-3 py-3 text-sm focus:ring-2 focus:ring-pink-500/20"
      />
      <TextAreaField
        label="Message"
        name="message"
        placeholder="Share the details that will help us understand your question."
        required
        minLength={10}
        maxLength={3000}
        rows={5}
        inputClassName="min-h-36 resize-y rounded-sm px-3 py-3 text-sm leading-6 focus:ring-2 focus:ring-pink-500/20"
      />
      <div className="flex flex-col gap-3 border-t border-styler-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-styler-muted">
          Please don&apos;t include passwords or sensitive payment details.
        </p>
        <Button type="submit" loading={loading} className="w-full sm:w-auto">
          Send message
        </Button>
      </div>
    </form>
  );
}
