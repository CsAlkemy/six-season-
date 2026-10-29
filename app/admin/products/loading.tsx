import { PageBody, Skeleton } from "@/components/admin/ui";

export default function Loading() {
  return (
    <PageBody>
      <div aria-busy className="flex flex-col gap-6">
        <div className="flex items-end justify-between"><Skeleton className="h-10 w-48" /><Skeleton className="h-11 w-36 rounded-full" /></div>
        <Skeleton className="h-9 w-full max-w-xl" />
        <Skeleton className="h-12 w-full" />
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      </div>
    </PageBody>
  );
}
