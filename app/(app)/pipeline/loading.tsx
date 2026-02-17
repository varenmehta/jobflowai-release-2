import Skeleton from "@/components/Skeleton";

export default function LoadingPipeline() {
  return (
    <div>
      <Skeleton className="skeleton" />
      <div className="pipeline-board" style={{ marginTop: 16 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <section key={i} className="pipeline-column">
            <div className="pipeline-column-head"><h3>Loading...</h3><span>0</span></div>
            <div className="pipeline-column-body">
              <Skeleton className="skeleton-md" lines={3} />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
