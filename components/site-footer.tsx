import Link from "next/link";
import type { ReactNode } from "react";

import type { Category } from "@/lib/categories";
import { STORE_NAME, t } from "@/lib/i18n";
import { type Lang, type Settings, SOCIAL_NAME, SOCIALS } from "@/lib/types";

import { Grass } from "./grass";

const HEADING = "text-overline text-fg-footer-accent uppercase";
const LINK = "text-fg-footer-muted underline-offset-4 transition-colors hover:text-fg-footer-accent hover:underline";

/** A titled column of footer links. Each is its own landmark, named by its heading. */
function LinkGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <nav aria-label={title} className="flex flex-col gap-4">
      <h2 className={HEADING}>{title}</h2>
      <ul className="flex flex-col gap-2.5 text-body-sm">{children}</ul>
    </nav>
  );
}

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <li>
      <Link href={href} className={LINK}>
        {children}
      </Link>
    </li>
  );
}

/**
 * The page ends in the field: grass and mustard flowers growing out of soil. On it, the brand, then four short
 * columns of the same make (what we sell, help with an order, about us, how to reach us), and the privacy policy beside
 * the copyright. On a wide screen they share one row; narrower, the brand sits above them. WhatsApp isn't here: it
 * floats on every page (whatsapp-float.tsx). The header carries no menu, so this is the one place every page links the
 * categories and the blog: they stay here for shoppers and for search engines alike.
 */
export function SiteFooter({ lang, settings, categories }: { lang: Lang; settings: Settings; categories: Category[] }) {
  const d = t(lang);
  const { phone, email, address, social } = settings.store;
  const socials = SOCIALS.filter((s) => social[s]);
  const hasContact = Boolean(phone || email || address[lang]);
  return (
    // content-visibility: the browser skips drawing the swaying field while the footer is off-screen.
    <footer className="mt-24 [contain-intrinsic-size:auto_40rem] [content-visibility:auto] sm:mt-32">
      {/* -mb-px hides the hairline seam between the SVG soil and the block below. */}
      <Grass className="-mb-px block h-32 w-full sm:h-48" />
      <div className="soil-texture bg-footer text-fg-footer">
        <div className="container-page grid grid-cols-2 gap-x-6 gap-y-12 pt-8 pb-14 md:pt-12 lg:grid-cols-4 lg:gap-x-10 xl:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))]">
          <div className="col-span-2 flex flex-col items-start gap-5 lg:col-span-4 xl:col-span-1">
            <img src="/logo-light.svg" alt={STORE_NAME[lang]} width={96} height={64} loading="lazy" className="h-16 w-auto" />
            <p className="max-w-sm text-body-md whitespace-pre-line text-fg-footer-muted">{d.footerTagline}</p>
          </div>

          {categories.length > 0 && (
            <LinkGroup title={d.shop}>
              {categories.map((c) => (
                <FooterLink key={c.id} href={`/c/${c.slug}`}>
                  {c.name[lang]}
                </FooterLink>
              ))}
            </LinkGroup>
          )}
          <LinkGroup title={d.help}>
            <FooterLink href={`/track`}>{d.trackOrder}</FooterLink>
            <FooterLink href={`/delivery`}>{d.deliveryPayment}</FooterLink>
            <FooterLink href={`/returns`}>{d.returnsRefunds}</FooterLink>
          </LinkGroup>
          <LinkGroup title={STORE_NAME[lang]}>
            <FooterLink href={`/about`}>{d.aboutUs}</FooterLink>
            <FooterLink href={`/blog`}>{d.blog}</FooterLink>
            <FooterLink href={`/contact`}>{d.contact}</FooterLink>
            {socials.map((s) => (
              <li key={s}>
                <a href={social[s]} target="_blank" rel="noopener me" className={LINK}>
                  {SOCIAL_NAME[s]}
                </a>
              </li>
            ))}
          </LinkGroup>
          {hasContact && (
            <div className="flex flex-col gap-4">
              <h2 className={HEADING}>{d.getInTouch}</h2>
              <address className="flex flex-col items-start gap-2.5 text-body-sm not-italic">
                {phone && (
                  <a href={`tel:${phone}`} className="font-semibold text-fg-footer transition-colors hover:text-fg-footer-accent">
                    {phone}
                  </a>
                )}
                {email && (
                  // Too long for half a phone's width: it may wrap before the @, never mid-word unless it must.
                  <a href={`mailto:${email}`} className={`${LINK} wrap-anywhere`}>
                    {email.includes("@") ? (
                      <>
                        {email.slice(0, email.indexOf("@"))}
                        <wbr />
                        {email.slice(email.indexOf("@"))}
                      </>
                    ) : (
                      email
                    )}
                  </a>
                )}
                {address[lang] && <span className="text-fg-footer-muted">{address[lang]}</span>}
              </address>
            </div>
          )}
        </div>
        <div className="container-page flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border-footer py-6 text-body-sm text-fg-footer-muted">
          <p>
            © {new Date().getFullYear()} {STORE_NAME[lang]}. {d.rights}.
          </p>
          <Link href={`/privacy`} className="underline-offset-4 transition-colors hover:text-fg-footer-accent hover:underline">
            {d.privacyPolicy}
          </Link>
        </div>
      </div>
    </footer>
  );
}
