"use client";

type Point = {
  label: string;
  applied: number;
  interview: number;
};

export default function TrendLineChart({ points }: { points: Point[] }) {
  const max = Math.max(1, ...points.map((p) => Math.max(p.applied, p.interview)));
  const width = 640;
  const height = 220;
  const pad = 24;

  const mapX = (i: number) => pad + (i * (width - pad * 2)) / Math.max(1, points.length - 1);
  const mapY = (v: number) => height - pad - (v / max) * (height - pad * 2);

  const poly = (key: "applied" | "interview") =>
    points.map((p, i) => `${mapX(i)},${mapY(p[key])}`).join(" ");

  return (
    <div style={{ width: "100%", height: "240px", marginTop: "10px" }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "100%" }}>
        <polyline fill="none" stroke="#44c8ff" strokeWidth="3" points={poly("applied")} />
        <polyline fill="none" stroke="#1fa26b" strokeWidth="3" points={poly("interview")} />
        {points.map((p, i) => (
          <g key={p.label}>
            <circle cx={mapX(i)} cy={mapY(p.applied)} r="3" fill="#44c8ff" />
            <circle cx={mapX(i)} cy={mapY(p.interview)} r="3" fill="#1fa26b" />
            <text x={mapX(i)} y={height - 6} textAnchor="middle" fontSize="10" fill="#6f85a8">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
      <div className="form-actions" style={{ marginTop: "4px" }}>
        <span className="badge subtle">Applied trend</span>
        <span className="badge subtle">Interview trend</span>
      </div>
    </div>
  );
}
