import type { Metadata } from "next";

import { Checkout } from "@/components/checkout";
import { storeFacts } from "@/lib/store-facts";
import { CashIcon, TruckIcon } from "@/components/icons";
import { currentCustomer } from "@/lib/customers";
import { getProducts, getSettings } from "@/lib/data";
import { type Dict, t } from "@/lib/i18n";
import { smsEnabled } from "@/lib/sms";
import type { Lang, Settings } from "@/lib/types";
import { STORE_LANG } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/cart">): Promise<Metadata> {
  return { title: t(STORE_LANG).checkout, robots: { index: false } };
}

/**
 * The band's promises, each only when the settings back it, the same facts as the home page's: paying at the door
 * while a cash method is on, and the quickest delivery area's time.
 */
function promises(settings: Settings, lang: Lang, d: Dict) {
  const { cash, quickest } = storeFacts(settings, lang);
  return [cash && { icon: CashIcon, text: d.codBody }, quickest && { icon: TruckIcon, text: quickest }].filter((p) => !!p);
}

export default async function CartPage({ params }: PageProps<"/cart">) {
  const lang = STORE_LANG;
  const d = t(lang);
  const [products, settings, customer] = await Promise.all([getProducts(), getSettings(), currentCustomer()]);
  const lines = promises(settings, lang, d);

  return (
    <>
      <header className="border-b border-border bg-sage-soft">
        <div className="container-page flex flex-col gap-3 py-6 sm:py-10">
          <h1 className="text-h2 sm:text-h1">{d.checkout}</h1>
          {lines.length > 0 && (
            <ul className="flex flex-wrap gap-x-6 gap-y-1.5 font-display text-body-md font-medium text-fg-sage">
              {lines.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2">
                  <Icon className="size-5 shrink-0" />
                  {text}
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>
      <div className="container-page pt-6 sm:pt-10">
        <Checkout
          lang={lang}
          products={products.map(({ blur: _blur, ...product }) => product)}
          delivery={settings.delivery}
          methods={settings.payments.methods}
          customer={customer && { name: customer.name, phone: customer.phone, address: customer.address }}
          sms={smsEnabled()}
        />
      </div>
    </>
  );
}
