import { PageSkeleton, PageHeaderSkeleton, ListSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />
      <ListSkeleton rows={6} />
    </PageSkeleton>
  );
}
