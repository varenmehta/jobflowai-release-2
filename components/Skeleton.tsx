"use client";

import UISkeleton from "@/components/ui/Skeleton";

type SkeletonProps = {
  className?: string;
  lines?: number;
};

export default function Skeleton({ className = "", lines = 1 }: SkeletonProps) {
  return <UISkeleton className={className} lines={lines} />;
}
