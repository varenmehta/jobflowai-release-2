"use client";

import { useMemo } from "react";
import { sankey, sankeyCenter } from "d3-sankey";
import { ApplicationStatus } from "@prisma/client";

type SankeyCounts = Record<ApplicationStatus, number>;

const format = (value: number) => new Intl.NumberFormat().format(value);

export default function SankeyChart({ counts }: { counts: SankeyCounts }) {
  const data = useMemo(() => {
    const applied = counts.APPLIED ?? 0;
    const screening = counts.SCREENING ?? 0;
    const interview = counts.INTERVIEW ?? 0;
    const offer = counts.OFFER ?? 0;
    const rejected = counts.REJECTED ?? 0;
    const withdrawn = counts.WITHDRAWN ?? 0;

    const toScreening = Math.max(screening + interview + offer, 0);
    const toInterview = Math.max(interview + offer, 0);
    const toOffer = Math.max(offer, 0);

    return {
      nodes: [
        { name: "Applied" },
        { name: "Screening" },
        { name: "Interview" },
        { name: "Offer" },
        { name: "Rejected" },
        { name: "Withdrawn" },
      ],
      links: [
        { source: 0, target: 1, value: toScreening },
        { source: 1, target: 2, value: toInterview },
        { source: 2, target: 3, value: toOffer },
        { source: 0, target: 4, value: rejected },
        { source: 0, target: 5, value: withdrawn },
        { source: 0, target: 3, value: Math.max(offer - toOffer, 0) },
      ],
      totals: { applied, screening, interview, offer, rejected, withdrawn },
    };
  }, [counts]);

  const { nodes, links } = useMemo(() => {
    const layout = sankey<{ name: string }, { source: number; target: number; value: number }>()
      .nodeWidth(16)
      .nodePadding(24)
      .nodeAlign(sankeyCenter)
      .extent([
        [12, 10],
        [588, 190],
      ]);

    return layout({
      nodes: data.nodes.map((node) => ({ ...node })),
      links: data.links.map((link) => ({ ...link })),
    });
  }, [data]);

  return (
    <div style={{ width: "100%", height: "220px" }}>
      <svg viewBox="0 0 600 200" style={{ width: "100%", height: "100%" }}>
        <defs>
          <linearGradient id="flow" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#24d1ff" />
            <stop offset="100%" stopColor="#5df2ff" />
          </linearGradient>
        </defs>

        {links.map((link, index) => {
          const path = link as any;
          const width = Math.max(2, path.width);
          return (
            <path
              key={index}
              d={path.path}
              stroke="url(#flow)"
              strokeWidth={width}
              fill="none"
              opacity={0.4}
            />
          );
        })}

        {nodes.map((node, index) => {
          const n = node as any;
          const height = Math.max(8, n.y1 - n.y0);
          return (
            <g key={index}>
              <rect
                x={n.x0}
                y={n.y0}
                width={n.x1 - n.x0}
                height={height}
                rx="8"
                fill="#101826"
                stroke="#1b2436"
              />
              <text
                x={n.x0 < 300 ? n.x1 + 8 : n.x0 - 8}
                y={n.y0 + height / 2}
                textAnchor={n.x0 < 300 ? "start" : "end"}
                fill="#eef3fb"
                fontSize="11"
                dominantBaseline="middle"
              >
                {n.name}
              </text>
              <text
                x={n.x0 < 300 ? n.x1 + 8 : n.x0 - 8}
                y={n.y0 + height / 2 + 14}
                textAnchor={n.x0 < 300 ? "start" : "end"}
                fill="#8a97ad"
                fontSize="10"
                dominantBaseline="middle"
              >
                {format(n.value ?? 0)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
