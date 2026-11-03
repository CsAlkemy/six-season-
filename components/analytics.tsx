import Script from "next/script";

import { PixelPageViews } from "./pixel-page-views";

const clean = (id: string | undefined, shape: RegExp) => (id && shape.test(id.trim()) ? id.trim() : undefined);

/**
 * Google Analytics 4 and the Meta Pixel, each loaded only when its ID is set (GA_MEASUREMENT_ID, META_PIXEL_ID), so
 * a store without them sends nothing. IDs are checked for their shape, so a pasted snippet can't end up in a script.
 *
 * The small inline parts run before the page hydrates (beforeInteractive, allowed in the root layout): they only set
 * up queues, so the very first event of a visit (often a product page opened from a Google or ad click) is kept and
 * sent once the real tag has loaded. The Google library itself loads after hydration.
 */
export function Analytics() {
  const ga = clean(process.env.GA_MEASUREMENT_ID, /^G-[A-Z0-9]{4,20}$/);
  const pixel = clean(process.env.META_PIXEL_ID, /^\d{8,20}$/);
  if (!ga && !pixel) return null;

  return (
    <>
      {ga && (
        <>
          <Script id="ga-queue" strategy="beforeInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${ga}');`}
          </Script>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
        </>
      )}
      {pixel && (
        <>
          <Script id="meta-pixel" strategy="beforeInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`}
          </Script>
          <noscript>
            <img height="1" width="1" alt="" style={{ display: "none" }} src={`https://www.facebook.com/tr?id=${pixel}&ev=PageView&noscript=1`} />
          </noscript>
          <PixelPageViews />
        </>
      )}
    </>
  );
}
