import { PageSkeleton, PageHeaderSkeleton, FiltersSkeleton, TableSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />
      <FiltersSkeleton count={2} />
      <TableSkeleton rows={8} cols={4} />
    </PageSkeleton>
  );
}
