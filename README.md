# Matir Taan · মাটির টান

A small storefront for ghee, mustard oil, gur and eggs. Bangla at `/bn` (default), English at `/en`, and an admin at `/admin`.

- **Next.js 16 + Tailwind 4.** Storefront pages are prerendered static HTML. The only client JS is the cart and checkout.
- **Vercel Blob** holds everything: `data/products.json`, `data/settings.json`, product photos and one JSON file per order under `orders/`. No database.
- **Admin** is server actions behind a password cookie (`proxy.ts` + `lib/session.ts`).
- **Design tokens** follow Motherhood's setup (`app/globals.css`): a raw palette, then semantic roles (`bg-brand`, `text-fg-secondary`…). The colours come from the logo: soil `#463121` and leaf `#02BF64`.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev                  # http://localhost:3000
```

With no `BLOB_READ_WRITE_TOKEN` the store still shows the starter products from `lib/defaults.ts`, but saving and ordering are off. To use the real store locally, run `vercel env pull .env.local`.

## Deploy on Vercel (free Hobby plan)

1. Push this folder to GitHub and import it in Vercel.
2. **Storage → Create → Blob**, then connect it to the project. This adds `BLOB_READ_WRITE_TOKEN`. Choose **public** access, because product photos are served straight from Blob.
3. Add the env vars `ADMIN_PASSWORD` and `ADMIN_SECRET` (`openssl rand -hex 32`).
4. Deploy. Then **Settings → Domains**: add your domain and set the DNS records Vercel shows.
5. Open `/admin`, fill in **Settings** (phone, WhatsApp, delivery areas, payments) and update the products and photos.

## Admin

| Page | What it does |
| --- | --- |
| Orders | Newest first, filter by status, change status inline |
| Products | Add, edit, reorder, hide, mark out of stock. Photos are resized to 1200px WebP in the browser before upload |
| Settings | Store contact info and announcement bar, delivery areas (fee, free-above, time), payment methods |

**Payments.** Cash on delivery is on by default, with an optional max order amount. bKash and Nagad (manual Send Money + TrxID) can be switched on once their wallet number is added. To add a method, extend `PaymentMethodId` in `lib/types.ts`, give it a default in `lib/defaults.ts` and a label in `lib/i18n.ts`.

Saving products or settings refreshes the static pages immediately.

## Notes

- The server re-prices every order from the stored products and settings, so whatever the browser sends can't change the price.
- Order files live in the same public Blob store under unguessable random paths. For stricter privacy, move orders to a separate **private** Blob store.
- Customer and product copy lives in `lib/i18n.ts` (UI text) and `lib/defaults.ts` (starter products).
