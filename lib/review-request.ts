import { STORE_NAME } from "./i18n";
import { absolute, waNumber } from "./site";
import { smsEnabled } from "./sms";
import type { Order, Product } from "./types";

/**
 * The WhatsApp message that asks a customer for a review once their order has arrived, in the language they ordered
 * in, with a link to each product's reviews. Reviews come from buyers who've received the product, so this is the
 * main way the store gets the star ratings Google can show. `null` when there's no mobile number WhatsApp can open
 * or none of the products is still on sale.
 */
export function reviewRequest(order: Order, products: Product[]): { url: string; text: string } | null {
  const phone = waNumber(order.customer.phone);
  if (!/^8801\d{9}$/.test(phone)) return null;
  const { lang } = order;
  const links = [...new Set(order.items.map((item) => item.productId))].flatMap((id) => {
    const product = products.find((p) => p.id === id && p.active);
    return product ? [`${product.name[lang]}: ${absolute(`/p/${product.slug}`)}#reviews`] : [];
  });
  if (!links.length) return null;

  // With SMS codes they log in with their number; without, the page asks for the order number and mobile instead.
  const how = smsEnabled()
    ? { bn: "রিভিউ লিখতে আপনার মোবাইল নম্বর দিয়ে লগইন করতে হবে:", en: "You'll log in with your mobile number to write it:" }
    : { bn: `রিভিউ লিখতে পেজে অর্ডার নম্বর ${order.no} আর এই মোবাইল নম্বরটি দিন:`, en: `To write it, enter your order number ${order.no} and this mobile number on the page:` };
  const text =
    lang === "bn"
      ? `প্রিয় ${order.customer.name}, আশা করি ${STORE_NAME.bn}-এর অর্ডার ${order.no} ঠিকমতো পৌঁছেছে। পণ্য কেমন লাগল জানালে আমাদের আর অন্য ক্রেতাদের অনেক উপকার হয়। ${how.bn}\n\n${links.join("\n")}\n\nধন্যবাদ!\n${STORE_NAME.bn}`
      : `Hi ${order.customer.name}, we hope your ${STORE_NAME.en} order ${order.no} arrived well. If you have a minute, telling us how it was helps us and other shoppers a lot. ${how.en}\n\n${links.join("\n")}\n\nThank you!\n${STORE_NAME.en}`;
  return { url: `https://wa.me/${phone}?text=${encodeURIComponent(text)}`, text };
}
