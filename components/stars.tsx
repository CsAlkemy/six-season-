import { StarIcon } from "./icons";

/** Five stars, filled up to the rounded rating; the label carries the number for screen readers. */
export function Stars({ value, label, className = "size-4.5" }: { value: number; label: string; className?: string }) {
  const filled = Math.round(value);
  return (
    <span role="img" aria-label={label} className="inline-flex items-center gap-0.5 text-mustard-500">
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} filled={n <= filled} className={`${className} ${n <= filled ? "" : "text-border-strong"}`} />
      ))}
    </span>
  );
}
