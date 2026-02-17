import Skeleton from "@/components/Skeleton";

export default function LoadingResumes() {
  return (
    <div className="list-stack">
      <Skeleton className="skeleton-md" lines={3} />
      <Skeleton className="skeleton-md" lines={4} />
    </div>
  );
}
