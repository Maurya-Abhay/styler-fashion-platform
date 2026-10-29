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
        ? "Thanks! Your message is in the Styler support inbox. Our team will get back to you."
        : "Your message reached the Styler support inbox. Email forwarding is temporarily unavailable.");
      form.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send your message. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate={false}>
      {error && <Alert tone="error">{error}</Alert>}
      {done && <Alert tone="success">{done}</Alert>}
      <Field label="Full Name" name="name" placeholder="Enter your name" required minLength={2} autoComplete="name" />
      <Field label="Email Address" name="email" type="email" placeholder="Enter your email" required autoComplete="email" />
      <Field label="Subject" name="subject" placeholder="How can we help?" />
      <TextAreaField label="Message" name="message" placeholder="Type your message here..." required minLength={10} rows={5} />
      <Button type="submit" loading={loading} className="w-full">Send Message</Button>
    </form>
  );
}
