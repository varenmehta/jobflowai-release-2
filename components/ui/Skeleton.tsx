import clsx from "clsx";

type SkeletonProps = {
  className?: string;
  lines?: number;
};

export default function UISkeleton({ className, lines = 1 }: SkeletonProps) {
  if (lines <= 1) {
    return <div aria-hidden className={clsx("ui-skeleton", className)} />;
  }

  return (
    <div aria-hidden className={clsx("ui-skeleton-stack", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className="ui-skeleton" />
      ))}
    </div>
  );
}
