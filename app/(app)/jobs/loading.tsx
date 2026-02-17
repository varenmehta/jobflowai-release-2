import Skeleton from "@/components/Skeleton";

export default function LoadingJobs() {
  return (
    <div className="list-stack">
      <Skeleton className="skeleton-md" lines={3} />
      <div className="job-masonry">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="skeleton-md" lines={3} />
        ))}
      </div>
    </div>
  );
}
