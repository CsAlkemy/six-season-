/**
 * schema.org data for Google (https://developers.google.com/search/docs/appearance/structured-data): the store
 * and site on the home page, each product with its sizes, ratings and place in the store on its own page, and
 * the blog and its posts.
 */
import { type Post, postDescription } from "./blog";
import { otherLang, STORE_NAME, t } from "./i18n";
import type { RatingSummary } from "./reviews";
import { absolute, homeSeo, intlPhone, SITE_URL } from "./site";
import { type Lang, type Product, type Review, type Settings, SOCIALS } from "./types";
import { photosOf, variantsOf } from "./variants";

const STORE_ID = `${SITE_URL}/#store`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const BLOG_ID = `${SITE_URL}/#blog`;

export function storeJsonLd(lang: Lang, settings: Settings) {
  const { phone, whatsapp, email, address, social, seo } = settings.store;
  const sameAs = SOCIALS.map((s) => social[s]).filter(Boolean);
  const contactPhone = phone || whatsapp;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "OnlineStore",
        "@id": STORE_ID,
        name: STORE_NAME[lang],
        alternateName: STORE_NAME[otherLang(lang)],
        url: absolute(`/${lang}`),
        logo: absolute("/logo.png"),
        description: homeSeo(lang, seo).description,
        areaServed: { "@type": "Country", name: "Bangladesh" },
        ...(phone && { telephone: intlPhone(phone) }),
        ...(email && { email }),
        ...(address[lang] && { address: { "@type": "PostalAddress", streetAddress: address[lang], addressCountry: "BD" } }),
        ...(contactPhone && {
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer service",
            telephone: intlPhone(contactPhone),
            ...(email && { email }),
            areaServed: "BD",
            availableLanguage: ["Bengali", "English"],
          },
        }),
        ...(sameAs.length && { sameAs }),
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: `${SITE_URL}/`,
        name: STORE_NAME[lang],
        alternateName: STORE_NAME[otherLang(lang)],
        inLanguage: lang,
        publisher: { "@id": STORE_ID },
      },
    ],
  };
}

export function productJsonLd(product: Product, lang: Lang, reviews: Review[], summary: RatingSummary) {
  const url = absolute(`/${lang}/p/${product.slug}`);
  const offers = variantsOf(product).map((v) => ({
    "@type": "Offer",
    url,
    sku: `${product.id}-${v.id}`,
    name: `${product.name[lang]} · ${v.label[lang]}`,
    price: v.price,
    priceCurrency: "BDT",
    availability: `https://schema.org/${v.inStock ? "InStock" : "OutOfStock"}`,
    itemCondition: "https://schema.org/NewCondition",
    seller: { "@id": STORE_ID },
  }));
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${url}#product`,
        name: product.name[lang],
        description: product.description[lang] || undefined,
        url,
        sku: product.id,
        image: photosOf(product).map(absolute),
        brand: { "@type": "Brand", name: STORE_NAME[lang] },
        offers: offers.length === 1 ? offers[0] : offers,
        ...(summary.count > 0 && {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number(summary.average.toFixed(1)),
            reviewCount: summary.count,
            bestRating: 5,
            worstRating: 1,
          },
          review: reviews.slice(0, 10).map((r) => ({
            "@type": "Review",
            author: { "@type": "Person", name: r.name },
            datePublished: r.createdAt.slice(0, 10),
            reviewBody: r.text || undefined,
            reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
          })),
        }),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: STORE_NAME[lang], item: absolute(`/${lang}`) },
          { "@type": "ListItem", position: 2, name: product.name[lang], item: url },
        ],
      },
    ],
  };
}

const blogRef = (lang: Lang) => ({ "@type": "Blog", "@id": BLOG_ID, name: t(lang).blog, url: absolute(`/${lang}/blog`) });

/** The blog's front page: the blog and the posts on it. */
export function blogJsonLd(lang: Lang, posts: Post[]) {
  return {
    "@context": "https://schema.org",
    ...blogRef(lang),
    description: t(lang).blogLead,
    inLanguage: lang,
    publisher: { "@id": STORE_ID },
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.text[lang].title,
      url: absolute(`/${lang}/blog/${post.slug}`),
      datePublished: post.published,
    })),
  };
}

/** A post, written by the store, about the products it names; and where it sits: store › blog › post. */
export function postJsonLd(post: Post, lang: Lang, products: Product[], cover?: string) {
  const url = absolute(`/${lang}/blog/${post.slug}`);
  const title = post.text[lang].title;
  const description = postDescription(post, lang);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${url}#post`,
        headline: title,
        description,
        url,
        mainEntityOfPage: url,
        datePublished: post.published,
        dateModified: post.updated ?? post.published,
        inLanguage: lang,
        ...(cover && { image: [absolute(cover)] }),
        author: { "@type": "Organization", "@id": STORE_ID, name: STORE_NAME[lang], url: absolute(`/${lang}`) },
        publisher: { "@id": STORE_ID },
        isPartOf: blogRef(lang),
        about: products.map((p) => ({ "@type": "Product", name: p.name[lang], url: absolute(`/${lang}/p/${p.slug}`) })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: STORE_NAME[lang], item: absolute(`/${lang}`) },
          { "@type": "ListItem", position: 2, name: t(lang).blog, item: absolute(`/${lang}/blog`) },
          { "@type": "ListItem", position: 3, name: title, item: url },
        ],
      },
    ],
  };
}
