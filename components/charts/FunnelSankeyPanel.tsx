"use client";

import { useState } from "react";
import FunnelSankey from "@/components/charts/FunnelSankey";

type Payload = {
  nodes: { name: string }[];
  links: { source: number; target: number; value: number }[];
};

type FunnelSankeyPanelProps = {
  initialData: Payload;
  initialInsight: string | null;
};

export default function FunnelSankeyPanel({ initialData, initialInsight }: FunnelSankeyPanelProps) {
  const [data, setData] = useState(initialData);
  const [insight, setInsight] = useState<string | null>(initialInsight);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const retry = async () => {
    try {
      setLoading(true);
      setError(undefined);
      const res = await fetch("/api/analytics/funnel", { cache: "no-store" });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error ?? "Failed to refresh funnel");
      }
      setData(payload.sankey);
      setInsight(payload.insight ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load funnel data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {insight ? <p className="kpi-title" style={{ marginBottom: 10 }}>{insight}</p> : null}
      <FunnelSankey data={data} loading={loading} error={error} onRetry={retry} />
    </>
  );
}
