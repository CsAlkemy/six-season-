import type { Metadata } from "next";
import Link from "next/link";

import { CustomerReset } from "@/components/admin/customer-reset";
import { Callout, ContentCard, Labelled, PageBody, PageHeader, StatusPill } from "@/components/admin/ui";
import { isAccount, listCustomerOrders, loadCustomer, numberProven } from "@/lib/customers";
import { dhakaTime } from "@/lib/orders";
import { normalizePhone } from "@/lib/pricing";

export const metadata: Metadata = { title: "Customers" };

/**
 * A customer's account by their mobile number: whether they have one, whether the number is proven theirs, and a
 * password reset link to send them on WhatsApp. Accounts are filed under a keyed hash of the number, so there's no
 * list to browse; look one up when a customer asks.
 */
export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  const { phone: raw = "" } = (await searchParams) as { phone?: string };
  const phone = normalizePhone(raw);
  const [customer, orders] = phone ? await Promise.all([loadCustomer(phone).catch(() => null), listCustomerOrders(phone).catch(() => [])]) : [null, []];
  const account = isAccount(customer);
  const locked = (customer?.lockedUntil ?? 0) > Date.now();

  return (
    <PageBody>
      <PageHeader title="Customers" description="Look up a customer's account by their mobile number, and send a password reset link." />
      <form className="flex max-w-xl gap-3" role="search">
        <input name="phone" type="tel" inputMode="tel" defaultValue={raw} placeholder="01XXXXXXXXX" aria-label="Mobile number" className="field flex-1" />
        <button className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand px-6 py-3 text-label-button text-fg-inverse hover:bg-brand-hover">Look up</button>
      </form>

      {raw && !phone && <Callout tone="error">That isn't a Bangladeshi mobile number. Type it like 01712345678.</Callout>}

      {phone && (
        <div className="flex items-start gap-4 max-lg:flex-col">
          <ContentCard
            title={customer?.name || phone}
            className="min-w-0 flex-1 max-lg:w-full"
            action={account ? <StatusPill tone={numberProven(customer) ? "success" : "pending"}>{numberProven(customer) ? "Account, number proven" : "Account, number not proven"}</StatusPill> : <StatusPill tone="neutral">No account</StatusPill>}
          >
            <dl className="grid gap-4 sm:grid-cols-2">
              <Labelled label="Mobile">{phone}</Labelled>
              <Labelled label="Email">{customer?.email || "—"}</Labelled>
              <Labelled label="Since">{customer ? dhakaTime(customer.createdAt, "date") : "—"}</Labelled>
              <Labelled label="Orders with this number">
                {orders.length ? <Link href={`/admin/orders?q=${phone}`} className="text-fg-brand underline-offset-4 hover:underline">{orders.length}</Link> : "None"}
              </Labelled>
            </dl>
            {!account && <p className="text-body-sm text-fg-secondary">{customer ? "Only the details from their guest orders are saved; they haven't made an account." : "Nothing is saved for this number."} A reset link starts an account for them.</p>}
            {account && !numberProven(customer) && <p className="text-body-sm text-fg-secondary">Made without an SMS code, so their account shows only the orders placed while signed in to it, or proven by order number. A reset link sent to this number proves it.</p>}
            {locked && <Callout tone="error">Locked after too many wrong passwords until {dhakaTime(new Date(customer!.lockedUntil!).toISOString())}. A reset unlocks it.</Callout>}
          </ContentCard>
          <div className="w-100 shrink-0 max-lg:w-full">
            <CustomerReset phone={phone} hasAccount={account} />
          </div>
        </div>
      )}
    </PageBody>
  );
}
