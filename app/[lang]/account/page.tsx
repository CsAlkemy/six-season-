import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForms } from "@/components/account/auth-forms";
import { ProfileForm } from "@/components/account/profile-form";
import { ResetForm } from "@/components/account/reset-form";
import { OrderDetail, OrderList } from "@/components/account/orders";
import { accessibleOrders, currentCustomer, openReset, RESET_COOKIE } from "@/lib/customers";
import { getSettings } from "@/lib/data";
import { t } from "@/lib/i18n";
import { phoneHint } from "@/lib/reviews";
import { waNumber } from "@/lib/site";
import { smsEnabled } from "@/lib/sms";
import type { Lang, Order } from "@/lib/types";
import { langOf } from "@/lib/lang";

import { logout } from "./actions";

export async function generateMetadata({ params }: PageProps<"/[lang]/account">): Promise<Metadata> {
  return { title: t(langOf((await params).lang)).account, robots: { index: false } };
}

const safeNext = (raw: unknown, lang: Lang) => (typeof raw === "string" && raw.startsWith(`/${lang}/`) && !/\/\/|\\|\.\./.test(raw) ? raw.slice(0, 200) : undefined);

/**
 * Log in, sign up, password resets, profile, order history and tracking all live here; the footer stays free of account
 * links. An order opens by its number (`?order=MT-…`), never its id: the id is the key to its file, and page addresses
 * reach analytics. Older links with the id still work, and either way only for orders this visitor may see.
 *
 * `?next=/bn/cart` comes back there after logging in; `?mode=signup` opens on signing up; `?reset=1` follows a reset
 * link (/r/[token] put its token in a cookie).
 */
export default async function AccountPage({ params, searchParams }: PageProps<"/[lang]/account">) {
  const lang = langOf((await params).lang);
  const query = (await searchParams) as { order?: string; reset?: string; next?: string; mode?: string };
  const wanted = query.order;
  const next = safeNext(query.next, lang);
  const d = t(lang);

  if (query.reset === "1") {
    const reset = await openReset((await cookies()).get(RESET_COOKIE)?.value).catch(() => null);
    if (reset) {
      return (
        <div className="container-page pt-8 sm:pt-12">
          <h1 className="mb-8 text-center text-h2 sm:text-h1">{d.account}</h1>
          <div className="mx-auto max-w-md">
            <ResetForm lang={lang} phone={phoneHint(reset.phone)} />
          </div>
        </div>
      );
    }
  }

  const customer = await currentCustomer();
  if (customer && next) redirect(next);
  const orders = await accessibleOrders(customer).catch(() => [] as Order[]);

  const order = wanted ? orders.find((o) => o.no === wanted || o.id === wanted) : undefined;
  if (order) {
    return (
      <div className="container-page pt-8 sm:pt-12">
        <OrderDetail order={order} lang={lang} d={d} back={{ href: `/${lang}/account`, label: d.backToOrders }} />
      </div>
    );
  }

  if (!customer) {
    const { store } = await getSettings();
    return (
      <div className="container-page pt-8 sm:pt-12">
        <h1 className="mb-8 text-center text-h2 sm:text-h1">{d.account}</h1>
        {orders.length > 0 && (
          <section className="mx-auto mb-10 max-w-3xl">
            <h2 className="mb-4 text-h4">{d.deviceOrders}</h2>
            <OrderList orders={orders} lang={lang} d={d} base="account" />
          </section>
        )}
        <div className="mx-auto max-w-md space-y-6">
          {query.reset && <p className="rounded-md bg-error-soft p-3 text-body-sm text-fg-error" role="alert">{d.errResetExpired}</p>}
          <AuthForms lang={lang} sms={smsEnabled()} next={next} start={query.mode === "signup" ? "signup" : "login"} whatsapp={waNumber(store.whatsapp)} phone={store.phone} />
          {/* Guests find their orders on the tracking page (also linked from the footer). */}
          <p className="text-center text-body-sm text-fg-secondary">
            {d.orderedAsGuest}{" "}
            <Link href={`/${lang}/track`} className="font-semibold text-fg-brand underline underline-offset-4">{d.trackOrder}</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page pt-8 sm:pt-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h2 sm:text-h1">{customer.name || d.account}</h1>
          <p className="mt-1 text-fg-secondary tabular-nums">{customer.phone}</p>
        </div>
        <form action={logout}>
          <input type="hidden" name="lang" value={lang} />
          <button className="btn-secondary">{d.logout}</button>
        </form>
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_380px]">
        <section>
          <h2 className="mb-4 text-h4">{d.myOrders}</h2>
          {orders.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-fg-secondary">{d.noOrders}</p>
              <Link href={`/${lang}#products`} className="btn-primary mt-6">
                {d.continueShopping}
              </Link>
            </div>
          ) : (
            <OrderList orders={orders} lang={lang} d={d} base="account" />
          )}
        </section>

        <ProfileForm lang={lang} name={customer.name} address={customer.address} email={customer.email ?? ""} hasPassword={Boolean(customer.password)} />
      </div>
    </div>
  );
}
