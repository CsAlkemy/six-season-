import { z } from "zod";

import type { Dict } from "./i18n";
import { normalizePhone } from "./pricing";

/** Messages are dictionary keys so the checkout shows them in the shopper's language. */
type Message = keyof Dict & `err${string}`;
const msg = (key: Message) => ({ error: key });

/** The customer's side of an order, checked on the checkout form and again in placeOrder. */
export const orderFormSchema = z
  .object({
    name: z.string().trim().min(1, msg("errRequired")).max(80, msg("errTooLong")),
    phone: z
      .string()
      .trim()
      .min(1, msg("errRequired"))
      .refine((value) => normalizePhone(value) !== null, msg("errPhone"))
      .transform((value) => normalizePhone(value) ?? value),
    address: z.string().trim().min(1, msg("errRequired")).min(10, msg("errAddress")).max(400, msg("errTooLong")),
    note: z.string().trim().max(300, msg("errTooLong")),
    zoneId: z.string().min(1, msg("errRequired")),
    method: z.string().trim().min(1, msg("errRequired")).max(40),
    trxId: z.string().trim().toUpperCase().max(40, msg("errTooLong")),
    /** Honeypot: people never see it, bots fill it. */
    website: z.string(),
  });

// A wallet or bank method also needs a transaction ID. Only the settings know which methods those are, so the
// checkout form and placeOrder check that part themselves.

export type OrderFormInput = z.input<typeof orderFormSchema>;
export type OrderFormValues = z.output<typeof orderFormSchema>;
