import type { Metadata } from "next";
import { notFound } from "next/navigation";

import "../globals.css";
import { CartProvider } from "@/components/cart-provider";
import { SiteFooter } from "@/components/site-footer";
import { SeasonScene } from "@/components/season-scene";
import { SiteHeader } from "@/components/site-header";
import { getSettings } from "@/lib/data";
import { fontVars } from "@/lib/fonts";
import { STORE_NAME, t } from "@/lib/i18n";
import { SEASON_SCRIPT, seasonAt } from "@/lib/season";
import { LANGS, type Lang } from "@/lib/types";

export const dynamicParams = false;
export const generateStaticParams = () => LANGS.map((lang) => ({ lang }));

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const lang = (await params).lang as Lang;
  const d = t(lang);
  return {
    metadataBase: new URL(
      process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000",
    ),
    title: { default: `${STORE_NAME[lang]} · ${d.tagline}`, template: `%s · ${STORE_NAME[lang]}` },
    description: d.about,
    alternates: { languages: { bn: "/bn", en: "/en" } },
    openGraph: { siteName: STORE_NAME[lang], images: ["/logo.svg"] },
  };
}

export default async function StoreLayout({ children, params }: LayoutProps<"/[lang]">) {
  const lang = (await params).lang as Lang;
  if (!LANGS.includes(lang)) notFound();
  const settings = await getSettings();

  return (
    // The head script sets the visitor's season and data-motion before paint (no JS: today's season, still); the DOM wins on hydration.
    <html lang={lang} className={fontVars} data-season={seasonAt(Date.now())} suppressHydrationWarning>
      <head>
        {/* text/plain on the client: React warns about rendering scripts, and <html> already holds the result. */}
        <script
          type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: SEASON_SCRIPT }}
        />
      </head>
      <body className="flex min-h-dvh flex-col">
        <SeasonScene />
        <CartProvider>
          <SiteHeader lang={lang} />
          <main className="flex-1">{children}</main>
          <SiteFooter lang={lang} settings={settings} />
        </CartProvider>
      </body>
    </html>
  );
}
