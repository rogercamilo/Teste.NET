import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageSkeleton, PageHeaderSkeleton, StatCardsSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton action={false} />
      <StatCardsSkeleton count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <Card key={i}>
            <CardContent className="p-5 space-y-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-48 w-full rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>
    </PageSkeleton>
  );
}
