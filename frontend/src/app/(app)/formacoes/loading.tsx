import { PageSkeleton, PageHeaderSkeleton, FiltersSkeleton, CardGridSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />
      <FiltersSkeleton count={2} />
      <CardGridSkeleton count={8} />
    </PageSkeleton>
  );
}
