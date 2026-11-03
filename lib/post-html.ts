import sanitizeHtml from "sanitize-html";

import { isOwnPhoto } from "./blog";

/**
 * Cleans a post body from the admin's editor before it's saved: only the tags the editor makes, links to the web,
 * mail and phone (or this site), and photos uploaded to the store. The storefront then renders it as is.
 * A product's details take no photos (`photos: false`): its pictures go in the gallery.
 */
export function cleanPostHtml(html: string, { photos = true }: { photos?: boolean } = {}): string {
  return sanitizeHtml(html, {
    allowedTags: ["p", "h2", "h3", "strong", "em", "u", "s", "a", "ul", "ol", "li", "blockquote", "img", "hr", "br"].filter((tag) => photos || tag !== "img"),
    // ol's start keeps "3." steps numbered 3 when the list carries on after a paragraph.
    allowedAttributes: { a: ["href", "target", "rel"], ol: ["start"], img: ["src", "alt", "width", "height", "loading", "decoding"] },
    allowedSchemes: ["https", "http", "mailto", "tel"],
    allowedSchemesByTag: { img: ["https"] },
    allowProtocolRelative: false,
    transformTags: {
      // The page's own title is the only h1, so a pasted h1 becomes a section heading; the deeper ones, a smaller one.
      h1: "h2",
      h4: "h3",
      h5: "h3",
      h6: "h3",
      b: "strong",
      i: "em",
      a: (tagName, { href = "" }) => {
        const attribs: sanitizeHtml.Attributes = { href };
        if (/^https?:\/\//i.test(href)) Object.assign(attribs, { target: "_blank", rel: "noopener" });
        return { tagName, attribs };
      },
      img: (tagName, { src = "", alt = "", width, height }) => {
        const attribs: sanitizeHtml.Attributes = { src, alt, loading: "lazy", decoding: "async" };
        if (width) attribs.width = width;
        if (height) attribs.height = height;
        return { tagName, attribs };
      },
    },
    // Photos must be the store's own uploads (no hotlinking pasted pictures); empty paragraphs go.
    exclusiveFilter: (frame) => (frame.tag === "img" && !isOwnPhoto(frame.attribs.src ?? "")) || (frame.tag === "p" && !frame.text.trim() && !frame.mediaChildren.length),
  }).trim();
}

/** Every image a post body shows, so ones taken out can be deleted from the store. */
export const htmlImages = (html: string) => [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]!);
