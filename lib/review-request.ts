import { STORE_NAME } from "./i18n";
import { absolute, intlPhone } from "./site";
import type { Order, Product } from "./types";

/**
 * The WhatsApp message that asks a customer for a review once their order has arrived, in the language they ordered
 * in, with a link to each product's reviews. Reviews come from buyers who've received the product, so this is the
 * main way the store gets the star ratings Google can show. `null` when there's no mobile number WhatsApp can open
 * or none of the products is still on sale.
 */
export function reviewRequest(order: Order, products: Product[]): { url: string; text: string } | null {
  const phone = intlPhone(order.customer.phone).replace(/\D/g, "");
  if (!/^8801\d{9}$/.test(phone)) return null;
  const { lang } = order;
  const links = [...new Set(order.items.map((item) => item.productId))].flatMap((id) => {
    const product = products.find((p) => p.id === id && p.active);
    return product ? [`${product.name[lang]}: ${absolute(`/${lang}/p/${product.slug}`)}#reviews`] : [];
  });
  if (!links.length) return null;

  const text =
    lang === "bn"
      ? `প্রিয় ${order.customer.name}, আশা করি ${STORE_NAME.bn}-এর অর্ডার ${order.no} ঠিকমতো পৌঁছেছে। পণ্য কেমন লাগল জানালে আমাদের আর অন্য ক্রেতাদের অনেক উপকার হয়। রিভিউ লিখতে আপনার মোবাইল নম্বর দিয়ে লগইন করতে হবে:\n\n${links.join("\n")}\n\nধন্যবাদ!\n${STORE_NAME.bn}`
      : `Hi ${order.customer.name}, we hope your ${STORE_NAME.en} order ${order.no} arrived well. If you have a minute, telling us how it was helps us and other shoppers a lot. You'll log in with your mobile number to write it:\n\n${links.join("\n")}\n\nThank you!\n${STORE_NAME.en}`;
  return { url: `https://wa.me/${phone}?text=${encodeURIComponent(text)}`, text };
}
