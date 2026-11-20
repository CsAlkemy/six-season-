import Link from "next/link";
import type { ReactNode } from "react";

import { t, taka } from "@/lib/i18n";
import type { Lang, Settings } from "@/lib/types";

import { CashIcon, PhoneIcon, PlusIcon, ShieldIcon } from "../icons";
import { storeFacts } from "./hero";

interface Item {
  id: string;
  question: string;
  answer: ReactNode;
}

/**
 * The questions people ask before ordering. The first four answer themselves from the settings, so they're never
 * out of date: where the store delivers and what it costs, how to pay, how an order is confirmed, and what happens
 * if something is wrong. Then the owner's own (Settings › Home page › Questions & answers).
 */
function items(lang: Lang, settings: Settings): Item[] {
  const d = t(lang);
  const zones = settings.delivery.zones.filter((z) => z.active);
  const methods = settings.payments.methods.filter((m) => m.enabled);
  const days = settings.returns.days;
  const free = (above: number) => (lang === "bn" ? `${taka(above, lang)} ${d.freeAbove}` : `${d.freeAbove} ${taka(above, lang)}`);
  const all: (Item | false)[] = [
    zones.length > 0 && {
      id: "delivery",
      question: d.faqDeliveryQ,
      answer: (
        <ul>
          {zones.map((z) => (
            <li key={z.id}>
              <strong>{z.name[lang]}:</strong> {taka(z.fee, lang)}, {z.time[lang]}
              {z.freeAbove > 0 && ` (${free(z.freeAbove)})`}
            </li>
          ))}
        </ul>
      ),
    },
    methods.length > 0 && {
      id: "payment",
      question: d.faqPaymentQ,
      answer: (
        <ul>
          {methods.map((m) => (
            <li key={m.id}>
              <strong>{m.name[lang]}:</strong> {m.instructions[lang]}
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: "confirm",
      question: d.faqConfirmQ,
      answer: (
        <p>
          {d.faqConfirmA} <Link href={`/track`}>{d.trackOrder}</Link>
        </p>
      ),
    },
    {
      id: "problem",
      question: d.faqProblemQ,
      answer: (
        <p>
          {d.faqProblemA} {days > 0 && d.faqProblemDays.replace("{n}", days.toLocaleString(lang === "bn" ? "bn-BD" : "en"))}{" "}
          <Link href={`/returns`}>{d.readReturns}</Link>
        </p>
      ),
    },
    ...settings.home.faq.map((f) => ({ id: f.id, question: f.question[lang], answer: <p className="whitespace-pre-line">{f.answer[lang]}</p> })),
  ];
  return all.filter((item): item is Item => item !== false && Boolean(item.question));
}

/**
 * Questions and answers as an accordion, one open at a time, the first open. Plain <details>, so it works before
 * any script loads and screen readers know what it is. `full` is the home page's band: a heading over it and, under
 * it, what every order comes with and the way to the products.
 */
export function Faq({ lang, settings, full = false }: { lang: Lang; settings: Settings; full?: boolean }) {
  const d = t(lang);
  const list = items(lang, settings);
  const { cash } = storeFacts(settings, lang);

  const accordion = (
    <div className="flex flex-col gap-3 sm:gap-4">
      {list.map((item, i) => (
        <details key={item.id} name="faq" open={i === 0} className="faq-item group rounded-xl bg-surface shadow-card open:bg-brand-soft">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 sm:px-8 sm:py-6 [&::-webkit-details-marker]:hidden">
            <h3 className="font-display text-body-lg font-semibold sm:text-h4">{item.question}</h3>
            <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-footer text-fg-footer transition-transform duration-200 group-open:rotate-45 group-open:bg-brand group-open:text-fg-inverse sm:size-11">
              <PlusIcon className="size-5" />
            </span>
          </summary>
          <div className="post-body faq-answer px-5 pb-5 text-body-lg sm:px-8 sm:pb-7">{item.answer}</div>
        </details>
      ))}
    </div>
  );

  if (!full) {
    return (
      <section aria-labelledby="faq-title" className="flex flex-col gap-6">
        <h2 id="faq-title" className="text-h3 sm:text-h2">{d.faqTitle}</h2>
        {accordion}
      </section>
    );
  }

  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-24 bg-soil-100 py-16 sm:py-24">
      <div className="container-page flex max-w-240 flex-col gap-10">
        <header className="flex flex-col items-center gap-3 text-center">
          <p className="font-display text-label-md text-soil-700">{d.faqEyebrow}</p>
          <h2 id="faq-title" className="text-h2 text-balance sm:text-h1">{d.faqTitle}</h2>
        </header>
        {accordion}
        <div className="flex flex-col items-center gap-6">
          <ul className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-body-md">
            {cash && (
              <li className="flex items-center gap-2">
                <CashIcon className="size-5 text-soil-700" />
                {d.codTitle}
              </li>
            )}
            <li className="flex items-center gap-2">
              <PhoneIcon className="size-5 text-soil-700" />
              {d.confirmCall}
            </li>
            <li className="flex items-center gap-2">
              <ShieldIcon className="size-5 text-soil-700" />
              {d.returnsShort}
            </li>
          </ul>
          <a href="#products" className="btn-primary h-13 min-w-64 text-label-md max-sm:w-full">
            {d.faqCta}
          </a>
          <Link href={`/returns`} className="text-body-md text-soil-700 underline underline-offset-4 hover:text-fg-brand">
            {d.readReturns}
          </Link>
        </div>
      </div>
    </section>
  );
}
