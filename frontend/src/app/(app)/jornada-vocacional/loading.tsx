import { PageSkeleton, PageHeaderSkeleton, FiltersSkeleton, ListSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />
      <FiltersSkeleton count={2} />
      <ListSkeleton rows={5} />
    </PageSkeleton>
  );
}
