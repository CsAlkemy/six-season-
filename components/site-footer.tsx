import Link from "next/link";

import { STORE_NAME, t } from "@/lib/i18n";
import { type Lang, type Settings, SOCIAL_NAME, SOCIALS } from "@/lib/types";

import { Grass } from "./grass";
import { WhatsAppIcon } from "./icons";

const LINK = "underline-offset-4 hover:text-fg-footer-accent hover:underline";

/** The page ends in the field: grass and mustard flowers growing out of soil, the brand and contact on it. */
export function SiteFooter({ lang, settings }: { lang: Lang; settings: Settings }) {
  const d = t(lang);
  const { phone, whatsapp, email, address, social } = settings.store;
  const socials = SOCIALS.filter((s) => social[s]);
  const hasContact = Boolean(phone || email || whatsapp || address[lang]);
  return (
    // content-visibility: the browser skips drawing the swaying field while the footer is off-screen.
    <footer className="mt-24 [contain-intrinsic-size:auto_40rem] [content-visibility:auto] sm:mt-32">
      {/* -mb-px hides the hairline seam between the SVG soil and the block below. */}
      <Grass className="-mb-px block h-32 w-full sm:h-48" />
      <div className="soil-texture bg-footer text-fg-footer">
        <div className="container-page grid gap-12 pt-8 pb-14 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] md:pt-12">
          <div className="flex flex-col items-start gap-6">
            <img src="/logo-light.svg" alt={STORE_NAME[lang]} width={96} height={64} className="h-16 w-auto" />
            <p className="max-w-xl text-body-lg whitespace-pre-line text-fg-footer-muted">{d.footerTagline}</p>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-label-md">
              <li>
                <Link href={`/${lang}/blog`} className={LINK}>
                  {d.blog}
                </Link>
              </li>
              {socials.map((s) => (
                <li key={s}>
                  <a href={social[s]} target="_blank" rel="noopener me" className={LINK}>
                    {SOCIAL_NAME[s]}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          {hasContact && (
            <address className="flex flex-col items-start gap-4 text-body-lg not-italic md:pt-24">
              <h2 className="text-overline text-fg-footer-accent uppercase">{d.contact}</h2>
              {address[lang] && <span className="text-fg-footer-muted">{address[lang]}</span>}
              {phone && <a href={`tel:${phone}`} className="font-display text-h3 hover:text-fg-footer-accent">{phone}</a>}
              {email && <a href={`mailto:${email}`} className="hover:text-fg-footer-accent">{email}</a>}
              {whatsapp && (
                <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener" className="btn mt-2 bg-whatsapp text-fg-on-whatsapp hover:bg-whatsapp-hover">
                  <WhatsAppIcon className="size-5" />
                  {d.whatsapp}
                </a>
              )}
            </address>
          )}
        </div>
        <p className="container-page border-t border-border-footer py-6 text-body-sm text-fg-footer-muted">
          © {new Date().getFullYear()} {STORE_NAME[lang]}. {d.rights}.
        </p>
      </div>
    </footer>
  );
}
