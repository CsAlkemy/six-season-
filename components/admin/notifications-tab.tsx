"use client";

import { useState, useTransition } from "react";

import { saveEmailSettings, sendTestEmail } from "@/app/admin/actions";
import type { EmailEvent, EmailView } from "@/lib/email";
import { dhakaTime } from "@/lib/orders";

import { SwitchRow, toast } from "./controls";
import { Input } from "./fields";
import { Button, Callout, ContentCard, StatusPill } from "./ui";

/** The alerts the store can send, in the order the switches show them. */
const EVENTS: { id: EmailEvent; label: string; description: string }[] = [
  { id: "orders", label: "New orders", description: "From the store, and the ones the team creates. Wallet and bank orders come with their transaction ID to check." },
  { id: "stock", label: "Stock running low", description: "When an order takes a size to its low-stock level, or sells it out." },
  { id: "reviews", label: "New reviews", description: "A buyer's review, waiting for your approval." },
];

const link = "text-fg-brand underline underline-offset-4";

/**
 * Email alerts, saved on their own (not with the rest of Settings), because the key is a secret: it goes to the server
 * once and only its last characters ever come back.
 */
export function NotificationsTab({ initial, onSaved }: { initial: EmailView; onSaved: (view: EmailView) => void }) {
  const [view, setViewHere] = useState(initial);
  const setView = (next: EmailView) => {
    setViewHere(next);
    onSaved(next);
  };
  const [apiKey, setApiKey] = useState("");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to.join(", "));
  const [events, setEvents] = useState(initial.events);
  const [saving, startSave] = useTransition();
  const [testing, startTest] = useTransition();

  const dirty = apiKey.trim() !== "" || from !== view.from || to !== view.to.join(", ") || JSON.stringify(events) !== JSON.stringify(view.events);
  const reset = (next: EmailView) => {
    setView(next);
    setApiKey("");
    setFrom(next.from);
    setTo(next.to.join(", "));
    setEvents(next.events);
  };

  const save = (removeKey = false) =>
    startSave(async () => {
      const r = await saveEmailSettings({ apiKey, removeKey, from, to, events });
      if (!r.ok) return toast.error(r.error);
      reset(r.view);
      toast.success(removeKey ? "Key removed. No emails will go out." : "Saved");
    });

  const test = () =>
    startTest(async () => {
      const r = await sendTestEmail();
      if (r.ok) {
        setView(r.view);
        toast.success(`Sent to ${view.to.join(", ")}. Check the inbox, and the spam folder the first time.`);
      } else toast.error(r.error);
    });

  const status = view.unreadable
    ? <StatusPill tone="failed">Enter the key again</StatusPill>
    : !view.hasKey
      ? <StatusPill tone="neutral">Off</StatusPill>
      : view.status.lastError && (!view.status.lastSent || view.status.lastError.at > view.status.lastSent.at)
        ? <StatusPill tone="failed">Last email failed</StatusPill>
        : <StatusPill tone="success">On</StatusPill>;

  return (
    <div className="flex flex-col gap-4">
      <ContentCard padding="md" title="Email alerts" subtitle="New orders and other news, emailed to you as they happen." action={status}>
        {view.unreadable && <Callout tone="error">The saved key can't be read, because ADMIN_SECRET has changed since it was saved. Paste the key again and save.</Callout>}
        <Input
          label="Resend API key"
          type="password"
          value={apiKey}
          onChange={setApiKey}
          placeholder={view.hasKey ? `Saved (${view.keyHint}). Paste a new one to replace it.` : "re_…"}
          hint={<>Free at <a href="https://resend.com/api-keys" target="_blank" rel="noopener" className={link}>resend.com</a> (3,000 emails a month, 100 a day). Create a key with “Sending access”.</>}
        />
        <Input
          label="Send alerts to"
          value={to}
          onChange={setTo}
          placeholder="you@example.com"
          hint={`Up to 5 addresses, separated by commas. While the sender is onboarding@resend.dev, Resend only delivers to the email you signed up with.`}
        />
        <Input
          label="Sender"
          value={from}
          onChange={setFrom}
          hint={<>Once your domain is verified at <a href="https://resend.com/domains" target="_blank" rel="noopener" className={link}>resend.com/domains</a>, send from it, e.g. Matir Taan &lt;orders@matirtaan.com.bd&gt;.</>}
        />
      </ContentCard>

      <ContentCard padding="md" title="What to email">
        {EVENTS.map((e) => (
          <SwitchRow key={e.id} label={e.label} description={e.description} checked={events[e.id]} onCheckedChange={(on) => setEvents((cur) => ({ ...cur, [e.id]: on }))} />
        ))}
      </ContentCard>

      <ContentCard padding="md" title="Check it works">
        <dl className="flex flex-col gap-2 text-body-sm">
          <div className="flex flex-wrap justify-between gap-2"><dt className="text-fg-secondary">Last sent</dt><dd className="text-fg-primary">{view.status.lastSent ? `${dhakaTime(view.status.lastSent.at)} · ${view.status.lastSent.subject}` : "Nothing yet"}</dd></div>
          {view.status.lastError && <div className="flex flex-wrap justify-between gap-2"><dt className="text-fg-secondary">Last failure</dt><dd className="text-fg-error">{dhakaTime(view.status.lastError.at)} · {view.status.lastError.message}</dd></div>}
        </dl>
        <Button variant="outline" loading={testing} disabled={dirty || !view.hasKey || view.unreadable} onClick={test} className="self-start">Send a test email</Button>
        {dirty && view.hasKey && <p className="text-caption text-fg-tertiary">Save your changes first; the test uses what's saved.</p>}
      </ContentCard>

      <div className="flex flex-wrap justify-end gap-3">
        {view.hasKey && <Button variant="outline" disabled={saving} onClick={() => confirm("Remove the key? No more emails will go out until you add one again.") && save(true)}>Remove key</Button>}
        <Button variant="outline" disabled={!dirty || saving} onClick={() => reset(view)}>Discard</Button>
        <Button loading={saving} disabled={!dirty} onClick={() => save()}>Save notifications</Button>
      </div>
    </div>
  );
}
