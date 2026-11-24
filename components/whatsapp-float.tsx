import { WhatsAppIcon } from "./icons";

/**
 * A round WhatsApp button that floats in the bottom-right corner of every store page, so a question is one tap away
 * wherever the shopper is. It keeps clear of the phone's home bar, and stays out of printed pages.
 */
export function WhatsAppFloat({ number, label }: { number: string; label: string }) {
  return (
    <a
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noopener"
      aria-label={label}
      title={label}
      className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 grid size-14 place-items-center rounded-full bg-whatsapp text-fg-on-whatsapp shadow-[0_2px_6px_#0000001f,0_14px_32px_-10px_#0000004d] transition duration-200 hover:scale-105 hover:bg-whatsapp-hover focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-fg-primary sm:right-6 sm:bottom-[max(1.5rem,env(safe-area-inset-bottom))] print:hidden"
    >
      <WhatsAppIcon className="size-7" />
    </a>
  );
}
