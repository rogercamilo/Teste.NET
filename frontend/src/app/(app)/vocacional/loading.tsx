import { PageSkeleton, PageHeaderSkeleton, CardGridSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />
      <CardGridSkeleton count={6} />
    </PageSkeleton>
  );
}
