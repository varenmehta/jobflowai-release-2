"use client";

type SourceStat = {
  source: string;
  total: number;
  success: number;
};

export default function SuccessBySourceChart({ data }: { data: SourceStat[] }) {
  const max = Math.max(...data.map((item) => item.total), 1);
  return (
    <div className="bar-chart">
      {data.map((item) => {
        const totalHeight = Math.max(8, Math.round((item.total / max) * 100));
        const successHeight = Math.max(8, Math.round((item.success / max) * 100));
        return (
          <div key={item.source} className="bar-group">
            <div className="bar-pair">
              <div className="bar total" style={{ height: `${totalHeight}%` }} />
              <div className="bar success" style={{ height: `${successHeight}%` }} />
            </div>
            <div className="bar-label">
              <span>{item.source}</span>
              <small>
                {item.success}/{item.total}
              </small>
            </div>
          </div>
        );
      })}
    </div>
  );
}
