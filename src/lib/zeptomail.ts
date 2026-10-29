import nodemailer from "nodemailer";

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface SendEmailInput {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  html: string;
  text?: string;
  /** Optional per-message sender display name. Defaults to ZEPTOMAIL_FROM_NAME. */
  name?: string;
  replyTo?: EmailRecipient;
}

export interface SendEmailResult {
  messageId?: string;
  raw: unknown;
}

type SmtpTransporter = ReturnType<typeof nodemailer.createTransport>;

let cachedTransporter: SmtpTransporter | null = null;
let cachedConfigKey = "";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} must be configured to send email.`);
  return value;
}

function getTransporter(): SmtpTransporter {
  const host = process.env.ZEPTOMAIL_SMTP_HOST?.trim() || "smtp.zeptomail.in";
  const port = Number(process.env.ZEPTOMAIL_SMTP_PORT || 587);
  const user = requiredEnv("ZEPTOMAIL_SMTP_USER");
  const pass = requiredEnv("ZEPTOMAIL_SMTP_PASSWORD");

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("ZEPTOMAIL_SMTP_PORT must be a valid TCP port number.");
  }

  // Reuse the transporter within a running server process. If local environment
  // values change during development, create a transporter for the new settings.
  const configKey = `${host}|${port}|${user}|${pass}`;
  if (cachedTransporter && cachedConfigKey === configKey) return cachedTransporter;
  if (cachedTransporter) cachedTransporter.close();

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // Implicit TLS is for port 465. Port 587 uses STARTTLS.
    requireTLS: port === 587,
    auth: { user, pass },
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    tls: { minVersion: "TLSv1.2" },
  });
  cachedConfigKey = configKey;
  return cachedTransporter;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });
}

function validateHeaderValue(value: string, field: string, maxLength = 250): string {
  const clean = value.trim();
  if (!clean || clean.length > maxLength || /[\r\n]/.test(clean)) {
    throw new Error(`${field} is invalid.`);
  }
  return clean;
}

function normalizeRecipient(recipient: EmailRecipient): { name?: string; address: string } {
  const address = recipient.email.trim().toLowerCase();
  if (address.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
    throw new Error("A recipient email address is invalid.");
  }
  if (recipient.name && /[\r\n]/.test(recipient.name)) {
    throw new Error("A recipient name is invalid.");
  }
  return { address, ...(recipient.name?.trim() ? { name: recipient.name.trim().slice(0, 100) } : {}) };
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const fromEmail = requiredEnv("ZEPTOMAIL_FROM_EMAIL").toLowerCase();
  const defaultFromName = process.env.ZEPTOMAIL_FROM_NAME?.trim() || "Styler";
  const fromName = validateHeaderValue(input.name || defaultFromName, "Sender name", 100);
  const subject = validateHeaderValue(input.subject, "Email subject");
  const recipients = (Array.isArray(input.to) ? input.to : [input.to]).map(normalizeRecipient);

  if (recipients.length === 0 || recipients.length > 50) {
    throw new Error("Provide between 1 and 50 email recipients per message.");
  }
  if (!input.html?.trim() && !input.text?.trim()) {
    throw new Error("Email must include an HTML or plain-text body.");
  }
  const replyTo = input.replyTo ? normalizeRecipient(input.replyTo) : undefined;

  const info = await getTransporter().sendMail({
    from: { name: fromName, address: fromEmail },
    to: recipients,
    ...(replyTo ? { replyTo } : {}),
    subject,
    ...(input.html ? { html: input.html } : {}),
    ...(input.text ? { text: input.text } : {}),
  });

  return { messageId: info.messageId, raw: info };
}

export async function sendOtpEmail(input: {
  email: string;
  name: string;
  otp: string;
  purpose: "email_verification" | "password_reset";
  expiresMinutes?: number;
}): Promise<SendEmailResult> {
  if (!/^\d{6}$/.test(input.otp)) throw new Error("OTP must contain exactly six digits.");

  const greeting = escapeHtml(input.name || "there");
  const subject = input.purpose === "email_verification"
    ? "Verify your Styler email"
    : "Reset your Styler password";
  const action = input.purpose === "email_verification"
    ? "verify your email address"
    : "reset your Styler password";

  const configuredTtl = Number(process.env.OTP_TTL_MINUTES || 10);
  const ttlCandidate = input.expiresMinutes ?? configuredTtl;
  const ttl = Number.isFinite(ttlCandidate) && ttlCandidate > 0 ? Math.floor(ttlCandidate) : 10;

  const html = [
    '<div style="font-family:Arial,sans-serif;line-height:1.6">',
    '<h2>Styler</h2>',
    `<p>Hello ${greeting},</p>`,
    `<p>Use this one-time code to ${action}:</p>`,
    `<p style="font-size:28px;font-weight:bold;letter-spacing:6px">${input.otp}</p>`,
    `<p>This code expires in ${ttl} minutes. Never share it with anyone.</p>`,
    '<p>If you did not request this, you can ignore this email.</p>',
    '</div>',
  ].join("");

  return sendEmail({
    to: { email: input.email, name: input.name },
    subject,
    html,
    text: `Your Styler code is ${input.otp}. It expires in ${ttl} minutes. Never share this code.`,
  });
}

export async function sendBookingEmail(input: {
  email: string;
  name: string;
  subject: string;
  message: string;
}): Promise<SendEmailResult> {
  const html = [
    '<div style="font-family:Arial,sans-serif;line-height:1.6">',
    '<h2>Styler</h2>',
    `<p>Hello ${escapeHtml(input.name)},</p>`,
    `<p>${escapeHtml(input.message).replace(/\n/g, "<br>")}</p>`,
    '</div>',
  ].join("");

  return sendEmail({
    to: { email: input.email, name: input.name },
    subject: input.subject,
    html,
    text: input.message,
  });
}

/** Optional helper for a future website contact form. */
export async function sendContactFormEmail(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<SendEmailResult> {
  const fromEmail = requiredEnv("ZEPTOMAIL_FROM_EMAIL");
  const recipient = process.env.ZEPTOMAIL_CONTACT_TO?.trim() || fromEmail;
  return sendEmail({
    to: { email: recipient },
    replyTo: { email: input.email, name: input.name },
    subject: `[Styler Contact] ${validateHeaderValue(input.subject, "Contact subject", 180)}`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>New Styler contact message</h2><p><strong>Name:</strong> ${escapeHtml(input.name)}</p><p><strong>Email:</strong> ${escapeHtml(input.email)}</p><p>${escapeHtml(input.message).replace(/\n/g, "<br>")}</p></div>`,
    text: `Name: ${input.name}\nEmail: ${input.email}\n\n${input.message}`,
  });
}
