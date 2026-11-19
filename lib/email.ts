import { maskSecret, openVault, readVault, writeVault } from "./vault";

/**
 * Email alerts to the store's own team, sent through Resend (resend.com: free for 3,000 emails a month, 100 a day).
 * Set up in Admin › Settings › Notifications; the key and addresses are kept in the vault, never in settings.json.
 */

export const EMAIL_EVENTS = ["orders", "stock", "reviews", "couriers"] as const;
export type EmailEvent = (typeof EMAIL_EVENTS)[number];

export interface EmailConfig {
  /** Resend API key, `re_…`. */
  apiKey: string;
  /** "Matir Taan <orders@matirtaan.com.bd>"; Resend's onboarding@resend.dev until a domain is verified there. */
  from: string;
  /** Who gets the alerts. */
  to: string[];
  events: Record<EmailEvent, boolean>;
}

/** When the last alert went out, and the last one that didn't, for the settings page. */
export interface EmailStatus {
  lastSent?: { at: string; subject: string };
  lastError?: { at: string; subject: string; message: string };
}

/** What the settings page gets: everything but the key itself. */
export interface EmailView {
  hasKey: boolean;
  keyHint: string;
  from: string;
  to: string[];
  events: Record<EmailEvent, boolean>;
  /** Saved, but ADMIN_SECRET has changed since, so it can't be read. */
  unreadable: boolean;
  status: EmailStatus;
}

export const DEFAULT_FROM = "Matir Taan <onboarding@resend.dev>";
export const MAX_RECIPIENTS = 5;
const DEFAULT_EVENTS: Record<EmailEvent, boolean> = { orders: true, stock: true, reviews: true, couriers: true };

const CONFIG = "email";
const STATUS = "email-status";

export const EMAIL_ADDRESS = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[a-z]{2,}$/i;
/** "orders@shop.com" or "Shop name <orders@shop.com>". */
export const validFrom = (from: string) => EMAIL_ADDRESS.test(from) || /^[^<>@\n]{1,60} <[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}>$/i.test(from);

export async function loadEmailConfig(): Promise<EmailConfig | null> {
  const saved = await readVault<EmailConfig>(CONFIG);
  return saved && { ...saved, events: { ...DEFAULT_EVENTS, ...saved.events } };
}

export const saveEmailConfig = (config: EmailConfig) => writeVault(CONFIG, config);

export async function emailView(): Promise<EmailView> {
  const [{ value, unreadable }, status] = await Promise.all([openVault<EmailConfig>(CONFIG), readVault<EmailStatus>(STATUS)]);
  return {
    hasKey: Boolean(value?.apiKey),
    keyHint: maskSecret(value?.apiKey ?? ""),
    from: value?.from || DEFAULT_FROM,
    to: value?.to ?? [],
    events: { ...DEFAULT_EVENTS, ...value?.events },
    unreadable,
    status: status ?? {},
  };
}

async function record(patch: EmailStatus) {
  try {
    await writeVault(STATUS, { ...(await readVault<EmailStatus>(STATUS)), ...patch });
  } catch (error) {
    console.error("email: status", error);
  }
}

export interface Email {
  /** Someone other than the team, e.g. a shopper's reset link. Needs a domain verified at Resend. */
  to?: string[];
  subject: string;
  html: string;
  text: string;
  /** Resend sends one email per key in 24 hours, so a retried alert doesn't arrive twice. */
  idempotencyKey?: string;
}

export type SendResult = { ok: true } | { ok: false; error: string };

/** Sends one email, to the team unless it names someone. Never throws; a failure is returned and remembered for the settings page. */
export async function sendEmail(config: EmailConfig, email: Email): Promise<SendResult> {
  const to = email.to ?? config.to;
  if (!config.apiKey || !to.length) return { ok: false, error: "Email alerts aren't set up." };
  let error: string;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        ...(email.idempotencyKey && { "Idempotency-Key": email.idempotencyKey.slice(0, 256) }),
      },
      body: JSON.stringify({ from: config.from || DEFAULT_FROM, to, subject: email.subject, html: email.html, text: email.text }),
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) {
      await record({ lastSent: { at: new Date().toISOString(), subject: email.subject } });
      return { ok: true };
    }
    const body = (await res.json().catch(() => null)) as { message?: string; name?: string } | null;
    error = resendError(res.status, body?.message ?? "");
  } catch (caught) {
    error = caught instanceof Error && caught.name === "TimeoutError" ? "Resend didn't answer in time." : "Couldn't reach Resend.";
  }
  console.error("sendEmail", error);
  await record({ lastError: { at: new Date().toISOString(), subject: email.subject, message: error } });
  return { ok: false, error };
}

/** Resend's errors, with what to do about the common ones. */
function resendError(status: number, message: string): string {
  if (status === 401 || /api key is invalid/i.test(message)) return "Resend didn't accept the API key. Create a new one with sending access and save it here.";
  if (/only send testing emails to your own email/i.test(message)) return "With onboarding@resend.dev as the sender, Resend only delivers to the email you signed up with. Send to that address, or verify your domain at resend.com/domains and send from it.";
  if (/domain is not verified/i.test(message)) return "The sender's domain isn't verified at Resend yet. Verify it at resend.com/domains, or send from onboarding@resend.dev for now.";
  if (status === 429) return "Resend's sending limit was reached (100 a day on the free plan). Alerts resume when it resets.";
  return message ? `Resend: ${message}` : `Resend answered with error ${status}.`;
}

/* Building the emails */

export const esc = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** A plain, table-based layout most mail apps show the same way: a heading, rows of content, and a button. */
export function layout({ title, intro, body, button }: { title: string; intro?: string; body: string; button?: { label: string; href: string } }): string {
  return `<!doctype html><html><body style="margin:0;background:#f6f3ee;font-family:Arial,Helvetica,sans-serif;color:#2b2118">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;padding:28px">
<tr><td style="font-size:13px;color:#7a6a5c;padding-bottom:6px">Matir Taan</td></tr>
<tr><td style="font-size:22px;font-weight:bold;padding-bottom:${intro ? 6 : 18}px">${esc(title)}</td></tr>
${intro ? `<tr><td style="font-size:14px;color:#5c4d40;padding-bottom:18px">${esc(intro)}</td></tr>` : ""}
<tr><td style="font-size:14px;line-height:1.5">${body}</td></tr>
${button ? `<tr><td style="padding-top:22px"><a href="${esc(button.href)}" style="display:inline-block;background:#463121;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:bold">${esc(button.label)}</a></td></tr>` : ""}
</table></td></tr></table></body></html>`;
}

/** Label and value rows. Values are escaped here, except those passed as `{ html }`. */
export function rows(items: [string, string | { html: string } | null | undefined][]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">${items
    .filter(([, value]) => value)
    .map(([label, value]) => `<tr><td style="padding:4px 12px 4px 0;color:#7a6a5c;vertical-align:top;white-space:nowrap">${esc(label)}</td><td style="padding:4px 0">${typeof value === "string" ? esc(value).replace(/\n/g, "<br>") : value!.html}</td></tr>`)
    .join("")}</table>`;
}

export const section = (title: string, html: string) => `<p style="margin:22px 0 8px;font-size:15px;font-weight:bold">${esc(title)}</p>${html}`;
