import { PageBody, Skeleton } from "@/components/admin/ui";

/** Shown while any admin page loads: the page's own shape in grey, as Motherhood does. */
export default function Loading() {
  return (
    <PageBody>
      <div aria-busy className="flex flex-col gap-6">
        <div className="flex flex-col gap-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-10 w-64" /></div>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}</div>
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>
    </PageBody>
  );
}
