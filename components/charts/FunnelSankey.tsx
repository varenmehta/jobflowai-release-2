"use client";

import { useMemo, useState } from "react";
import { sankey, sankeyCenter, sankeyLinkHorizontal } from "d3-sankey";
import UISkeleton from "@/components/ui/Skeleton";
import Button from "@/components/ui/Button";
import { designTokens } from "@/lib/design/tokens";

type SankeyPayload = {
  nodes: { name: string }[];
  links: { source: number; target: number; value: number }[];
};

type FunnelSankeyProps = {
  data: SankeyPayload;
  loading: boolean;
  error?: string;
  onRetry?: () => void;
};

const stageColors = [
  designTokens.colors.applied,
  designTokens.colors.screening,
  designTokens.colors.interview,
  designTokens.colors.offer,
  designTokens.colors.risk,
  designTokens.colors.muted,
];

export default function FunnelSankey({ data, loading, error, onRetry }: FunnelSankeyProps) {
  const [hoverLabel, setHoverLabel] = useState<string | null>(null);

  const total = useMemo(() => data.links.reduce((sum, link) => sum + link.value, 0), [data.links]);

  const graph = useMemo(() => {
    const generator = sankey()
      .nodeWidth(14)
      .nodePadding(20)
      .nodeAlign(sankeyCenter)
      .extent([
        [16, 16],
        [760, 260],
      ]);

    return generator({
      nodes: data.nodes.map((node) => ({ ...node })) as any[],
      links: data.links.map((link) => ({ ...link })) as any[],
    }) as any;
  }, [data.nodes, data.links]);

  if (loading) return <UISkeleton className="sankey-skeleton" lines={4} />;

  if (error) {
    return (
      <div className="sankey-state">
        <p className="kpi-title">{error}</p>
        <Button variant="secondary" onClick={onRetry}>Retry</Button>
      </div>
    );
  }

  if (total < 3) {
    return (
      <div className="sankey-state">
        <p className="kpi-title">Not enough data yet. Track more applications to unlock funnel flow.</p>
      </div>
    );
  }

  return (
    <div className="sankey-wrap">
      <svg viewBox="0 0 780 280" className="sankey-svg" role="img" aria-label="Application funnel Sankey chart">
        {graph.links.map((link: any, index: number) => {
          const path = sankeyLinkHorizontal()(link as any);
          if (!path) return null;
          const source = link.source as { index?: number; name?: string };
          const target = link.target as { index?: number; name?: string };
          return (
            <path
              key={`${index}-${source.index ?? index}-${target.index ?? index}`}
              d={path}
              stroke={stageColors[source.index ?? 0] ?? designTokens.colors.brand1}
              strokeWidth={Math.max(2, (link as { width?: number }).width || 0)}
              strokeOpacity={0.35}
              fill="none"
              onMouseEnter={() => setHoverLabel(`${source.name ?? "Source"} -> ${target.name ?? "Target"}: ${link.value}`)}
              onMouseLeave={() => setHoverLabel(null)}
            />
          );
        })}

        {graph.nodes.map((node: any, index: number) => (
          <g key={`${node.name}-${index}`}>
            <rect
              x={node.x0}
              y={node.y0}
              width={Math.max(8, (node.x1 ?? 0) - (node.x0 ?? 0))}
              height={Math.max(10, (node.y1 ?? 0) - (node.y0 ?? 0))}
              rx="8"
              fill={stageColors[index] ?? designTokens.colors.brand1}
              fillOpacity={0.88}
              onMouseEnter={() => setHoverLabel(`${node.name}: ${Math.round(node.value ?? 0)}`)}
              onMouseLeave={() => setHoverLabel(null)}
            />
            <text x={(node.x0 ?? 0) + 18} y={(node.y0 ?? 0) - 6} fontSize="11" fill={designTokens.colors.text}>
              {node.name}
            </text>
          </g>
        ))}
      </svg>

      <div className="sankey-meta-row">
        <span className="kpi-title">Hover for values.</span>
        {hoverLabel ? <span className="badge subtle">{hoverLabel}</span> : null}
      </div>
    </div>
  );
}
