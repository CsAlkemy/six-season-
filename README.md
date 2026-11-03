# Matir Taan · মাটির টান

A small storefront for ghee, mustard oil, gur and eggs. Bangla at `/bn` (default), English at `/en`, and an admin at `/admin`.

- **Next.js 16 + Tailwind 4.** Storefront pages are prerendered static HTML. The only client JS is the cart and checkout.
- **Vercel Blob** holds everything: `data/products.json`, `data/settings.json`, product photos and one JSON file per order under `orders/`. No database.
- **Admin** is server actions behind a password cookie (`proxy.ts` + `lib/session.ts`).
- **Customers** sign in with their mobile number (`/[lang]/account`): password, or a 6-digit SMS code. Guests verify their number by code before an order goes through, which also signs them in so they can track it. Profile, orders and tracking all live on the account page (`lib/customers.ts`, `lib/sms.ts`).
- **Design tokens** follow Motherhood's setup (`app/globals.css`): a raw palette, then semantic roles (`bg-brand`, `text-fg-secondary`…). The colours come from the logo: soil `#463121` and leaf `#02BF64`.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev                  # http://localhost:3000
```

With no `BLOB_READ_WRITE_TOKEN`, `npm run dev` keeps everything on disk instead: JSON in `.local-blob/` and uploaded photos in `public/local-uploads/` (both git-ignored), so products, settings, orders and the admin all work end to end. Production never does this and needs the Blob token. To use the real store locally, run `vercel env pull .env.local`.

## Deploy on Vercel (free Hobby plan)

1. Push this folder to GitHub and import it in Vercel.
2. **Storage → Create → Blob**, then connect it to the project. This adds `BLOB_READ_WRITE_TOKEN`. Choose **public** access, because product photos are served straight from Blob.
3. Add the env vars `ADMIN_PASSWORD`, `ADMIN_SECRET` (`openssl rand -hex 32`), and `SMS_API_KEY` + `SMS_SENDER_ID` from BulkSMSBD for OTP codes. For a demo without SMS, set `DEMO_OTP=555555` instead: no SMS goes out and that code verifies any number. Remove it before going live.
4. Deploy. Then **Settings → Domains**: add your domain and set the DNS records Vercel shows.
5. Open `/admin`, fill in **Settings** (phone, WhatsApp, delivery areas, payments) and update the products and photos.

## Admin

| Page | What it does |
| --- | --- |
| Orders | Newest first, filter by status, change status inline. A delivered order has an **Ask for a review** button: a WhatsApp message (in the customer's language) with a link to review each product |
| Products | Add, edit, reorder, hide, mark out of stock. Photos are resized to 1200px WebP in the browser before upload. Also a **Category**, **More about this product** (a rich-text section under the buy box: where it's from, how to use and keep it, FAQs) and the product's own search title and description |
| Blog | Write and publish posts for মাটির কথা with a rich text editor (see **Blog** below) |
| Settings | Store contact info, social pages, the home page's Google title and description, announcement bar, delivery areas (fee, free-above, time), **days to report a problem** (the returns promise), payment methods |

**Payments.** Cash on delivery is on by default, with an optional max order amount. bKash and Nagad (manual Send Money + TrxID) can be switched on once their wallet number is added. To add a method, extend `PaymentMethodId` in `lib/types.ts`, give it a default in `lib/defaults.ts` and a label in `lib/i18n.ts`.

Saving products or settings refreshes the static pages immediately.

## Search and sharing

Everything points at `https://www.matirtaan.com.bd` (`lib/site.ts`; set `SITE_URL` to move it), so Vercel previews and the bare domain never compete with it.

| What | Where |
| --- | --- |
| Canonical URL, and hreflang linking each page's Bangla and English versions (Bangla for everyone else) | `generateMetadata` on the home and product pages |
| Share images (1200×630 JPEG) for the home page and each product, with the photo, Bangla name and price | `app/[lang]/opengraph-image.ts`, `app/[lang]/p/[slug]/opengraph-image.ts`, drawn by `lib/og.ts` |
| Structured data: the store and site on the home page; each product's sizes, prices, stock, ratings, reviews and breadcrumb on its page | `lib/structured-data.ts` |
| The blog (মাটির কথা): each post's share image, `BlogPosting` data and breadcrumb, hreflang only for the languages it's written in | `app/[lang]/blog/`, see **Blog** below |
| Category pages (`/bn/c/ghee`, `/mustard-oil`, `/khejur-gur`, `/deshi-eggs`): intro text, the products, the posts about them. A category with nothing to buy is a 404 and is left out of the sitemap | `lib/categories.ts` (the wording; add a category here), `app/[lang]/c/[slug]/page.tsx`. A product joins one in the admin; the four starter products are in theirs by id |
| About, Contact, Delivery & returns, Privacy (`/bn/about` …), linked from the footer. Delivery fees and times, payment methods, contact details and the return window come from the admin's Settings, so they never go stale | `content/pages.tsx` (the wording: **read it once and change what isn't how the store works**), `app/[lang]/[page]/page.tsx` |
| The product's return policy for Google (`hasMerchantReturnPolicy`), only once Settings has a number of days above 0. Delivery isn't marked up: its charges depend on "inside Dhaka city", which schema.org can't say | `lib/structured-data.ts` |
| A Google Merchant Center product feed, one item per size: `/feeds/google` (English) or `/feeds/google?lang=bn` | `app/feeds/google/route.ts` |
| Each product's breadcrumb through its category, the posts that name it, and its own search title and description | `app/[lang]/p/[slug]/page.tsx` |
| `sitemap.xml` (both languages, with photos, posts dated) and `robots.txt` (everything but `/admin`) | `app/sitemap.ts`, `app/robots.ts` |
| App icons and `manifest.webmanifest` for "Add to Home screen" | `app/apple-icon.png`, `public/icon-*.png`, `app/manifest.ts` |

Cart and account pages are `noindex`. The admin's **Settings › Store details** feeds Google too: contact details and address, social pages (also linked in the footer), and an optional title and description for the home page.

**Share images and Bangla.** `next/og` can't shape Bangla (vowel signs land after their consonant, conjuncts come apart), so `lib/og.ts` shapes text with HarfBuzz (`harfbuzzjs`) into SVG paths and `sharp` rasterises the card. The fonts are in `assets/fonts/` (SIL Open Font License). `harfbuzzjs` is in `serverExternalPackages` so it can find its `.wasm` at runtime.

**After a deploy that changes the domain or launches the store:**

1. [Google Search Console](https://search.google.com/search-console): add a **Domain** property for `matirtaan.com.bd` (a TXT record at the DNS host), or a URL-prefix one verified with `GOOGLE_SITE_VERIFICATION`. Submit `https://www.matirtaan.com.bd/sitemap.xml`.
2. [Bing Webmaster Tools](https://www.bing.com/webmasters): import the site from Search Console, or verify with `BING_SITE_VERIFICATION`.
3. Check a product URL in Google's [Rich Results Test](https://search.google.com/test/rich-results), and a shared link in Facebook's [Sharing Debugger](https://developers.facebook.com/tools/debug/) (use **Scrape Again** after changing a product).
4. Create a [Google Business Profile](https://business.google.com) for the store with the website, and link the Facebook page back to the site.
5. [Google Merchant Center](https://merchants.google.com) (free listings in Google Shopping): confirm Bangladesh is offered when you sign up, claim the website, then **Products › Add › Scheduled fetch** with `https://www.matirtaan.com.bd/feeds/google` and set delivery charges for Dhaka and outside under **Shipping and returns**. Set **Days to report a problem** in the admin first so the return policy is on the product pages.

## Analytics and ads

Google Analytics 4 and the Meta (Facebook) Pixel, off until their IDs are set: `GA_MEASUREMENT_ID` (`G-…`) and `META_PIXEL_ID` (digits) in Vercel's environment variables, then redeploy. With neither set, no tag loads and nothing is sent. The admin is never tracked (it has its own layout).

| Shopper does | GA4 event | Pixel event | Fired from |
| --- | --- | --- | --- |
| Opens any page | `page_view` (GA4's own, on history changes) | `PageView` | `components/analytics.tsx`, `components/pixel-page-views.tsx` |
| Opens a product | `view_item` | `ViewContent` | `components/track-product-view.tsx` |
| Add to cart or Buy now | `add_to_cart` | `AddToCart` | `components/add-to-cart.tsx` |
| Opens checkout with items in the cart | `begin_checkout` | `InitiateCheckout` | `components/checkout.tsx` |
| Places an order | `purchase` | `Purchase` | `components/checkout.tsx` |

All events are in `lib/analytics.ts`: prices in BDT, product ids and sizes, and the order number (also the Pixel's event ID). No name, phone number or address is ever sent. The tags' small inline parts run before the page hydrates, so the first event of a visit isn't lost; the Google library loads after.

In GA4 keep **Enhanced measurement › Page changes based on browser history events** on (it is by default): the store changes pages without reloading. Mark `purchase` as a key event (**Admin › Events**), and add your own office or home IP under **Data filters** so your visits aren't counted. Check events live in GA4 **DebugView** and Meta's **Test events** tab (Events Manager) before running ads.

## Blog: মাটির কথা

`/bn/blog` and `/en/blog` (Notes from the soil), linked from the footer. Posts answer what people search for about the products ("খাঁটি ঘি চেনার উপায়"), and each ends with the cards of the products it's about, so a reader can order from the post.

**Writing a post:** Admin › Blog › New post.

| Part | What it does |
| --- | --- |
| Banner | Atop the post, on its card and in its share image. Without one, the first product's photo is used |
| Title, summary, text | Per language (বাংলা / English tabs). English is optional: a post with no English shows on the Bangla blog only |
| Text editor | Section and smaller headings, bold, italic, underline, lists, notes (the green box), divider, links and photos. Photos upload as they go in (button, paste or drop), shrunk to WebP; "Describe photo" sets the alt text Google Images reads |
| Products in this post | Their cards follow the post |
| Published | Off keeps it a draft only the admin sees. It's dated the day it first goes out; later edits mark it updated for Google |
| URL | English letters; empty uses the English title. Give Bangla-only posts one (e.g. `ilish-fry`) |

Posts are saved in `data/posts.json` beside the products, so a new post goes live without a deploy. The four in `content/blog/` show until the first save; after that the saved list is the blog. The editor is Tiptap (`components/admin/rich-text-editor.tsx`) and shows text with the storefront's own `.post-body` styles (`app/globals.css`), so it looks as it will on the blog. On save the HTML is cleaned on the server (`lib/post-html.ts`): only the editor's tags, safe links, and photos uploaded to the store (pasted pictures from other sites are dropped, so nothing is hotlinked). Photos a save or delete leaves unused are deleted from Blob.

Avoid health claims you can't source, and say where a home test isn't proof. Google ranks careful pages higher, and readers trust them more.

## Notes

- The server re-prices every order from the stored products and settings, so whatever the browser sends can't change the price.
- Order files live in the same public Blob store under unguessable random paths. For stricter privacy, move orders to a separate **private** Blob store.
- Customer and product copy lives in `lib/i18n.ts` (UI text) and `lib/defaults.ts` (starter products).
