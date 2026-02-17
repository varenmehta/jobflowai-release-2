import Skeleton from "@/components/Skeleton";

export default function LoadingAnalytics() {
  return (
    <div className="list-stack">
      <Skeleton className="skeleton-md" lines={4} />
      <Skeleton className="skeleton-md" lines={4} />
      <Skeleton className="skeleton-lg" lines={4} />
    </div>
  );
}
