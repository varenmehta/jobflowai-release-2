"use client";

type SkeletonProps = {
  className?: string;
  lines?: number;
};

export default function Skeleton({ className = "", lines = 1 }: SkeletonProps) {
  if (lines <= 1) return <div className={`skeleton ${className}`.trim()} aria-hidden />;
  return (
    <div className={`skeleton-stack ${className}`.trim()} aria-hidden>
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className="skeleton" />
      ))}
    </div>
  );
}

