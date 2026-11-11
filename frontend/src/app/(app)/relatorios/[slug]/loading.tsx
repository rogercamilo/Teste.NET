import { PageSkeleton, PageHeaderSkeleton, StatCardsSkeleton, TableSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />
      <StatCardsSkeleton count={5} />
      <TableSkeleton rows={8} cols={5} />
    </PageSkeleton>
  );
}
