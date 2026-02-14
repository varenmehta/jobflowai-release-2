import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";
import SankeyChart from "@/components/SankeyChart";
import { ApplicationStatus } from "@prisma/client";
import SuccessBySourceChart from "@/components/SuccessBySourceChart";
import TrendLineChart from "@/components/TrendLineChart";
import { redirect } from "next/navigation";

export default async function AnalyticsPage() {
  const { user } = await getAuthContext();
  if (!user) redirect("/login?from=/analytics");
  if (user.status !== "ACTIVE") redirect("/suspended");
  const userId = user.id;

  const totalApplied = await prisma.application.count({ where: { userId } });
  const offers = await prisma.application.count({ where: { userId, status: "OFFER" } });
  const interviews = await prisma.application.count({ where: { userId, status: "INTERVIEW" } });
  const responseRate = totalApplied ? Math.round((interviews / totalApplied) * 100) : 0;

  const resumePerf = await prisma.resume.findMany({
    where: { userId },
    include: { applications: true },
  });

  const applications = await prisma.application.findMany({
    where: { userId },
    select: {
      status: true,
      createdAt: true,
      job: { select: { source: true } },
    },
  });

  const sourceMap = applications.reduce<Record<string, { total: number; success: number }>>(
    (acc, app) => {
      const source = app.job.source ?? "Direct";
      if (!acc[source]) {
        acc[source] = { total: 0, success: 0 };
      }
      acc[source].total += 1;
      if (app.status === "INTERVIEW" || app.status === "OFFER") {
        acc[source].success += 1;
      }
      return acc;
    },
    {},
  );

  const sourceStats = Object.entries(sourceMap)
    .map(([source, stats]) => ({ source, ...stats }))
    .sort((a, b) => b.total - a.total);

  const statusCounts = await prisma.application.groupBy({
    by: ["status"],
    where: { userId },
    _count: { status: true },
  });

  const counts = statusCounts.reduce<Record<ApplicationStatus, number>>(
    (acc, entry) => {
      acc[entry.status] = entry._count.status;
      return acc;
    },
    {
      APPLIED: 0,
      SCREENING: 0,
      INTERVIEW: 0,
      OFFER: 0,
      REJECTED: 0,
      WITHDRAWN: 0,
    },
  );

  const screeningOrAbove = counts.SCREENING + counts.INTERVIEW + counts.OFFER;
  const interviewToOffer = counts.INTERVIEW ? Math.round((counts.OFFER / counts.INTERVIEW) * 100) : 0;
  const rejectRate = totalApplied ? Math.round((counts.REJECTED / totalApplied) * 100) : 0;

  const now = new Date();
  const weekKeys = Array.from({ length: 8 }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (7 - i) * 7);
    return `${date.getFullYear()}-${date.getMonth() + 1}-${Math.ceil(date.getDate() / 7)}`;
  });
  const weekMap = weekKeys.reduce<Record<string, { applied: number; interview: number }>>((acc, key) => {
    acc[key] = { applied: 0, interview: 0 };
    return acc;
  }, {});

  for (const app of applications) {
    const d = app.createdAt;
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${Math.ceil(d.getDate() / 7)}`;
    if (!weekMap[key]) continue;
    weekMap[key].applied += 1;
    if (app.status === "INTERVIEW" || app.status === "OFFER") {
      weekMap[key].interview += 1;
    }
  }

  const trendPoints = weekKeys.map((key, i) => ({
    label: `W${i + 1}`,
    applied: weekMap[key].applied,
    interview: weekMap[key].interview,
  }));

  return (
    <div>
      <h1 className="section-title">Analytics</h1>
      <p className="section-subtitle">Track funnel performance and resume impact.</p>

      <div className="kpi-grid">
        <div className="card">
          <div className="kpi-title">Total Applied</div>
          <div className="kpi-value">{totalApplied}</div>
          <div className="kpi-title">All time</div>
        </div>
        <div className="card">
          <div className="kpi-title">Response Rate</div>
          <div className="kpi-value">{responseRate}%</div>
          <div className="kpi-title">Interview rate</div>
        </div>
        <div className="card">
          <div className="kpi-title">Interviews</div>
          <div className="kpi-value">{interviews}</div>
          <div className="kpi-title">Active</div>
        </div>
        <div className="card">
          <div className="kpi-title">Offers</div>
          <div className="kpi-value">{offers}</div>
          <div className="kpi-title">Total</div>
        </div>
      </div>

      <div className="grid-three" style={{ marginTop: "18px" }}>
        <div className="card">
          <div className="kpi-title">Screening Conversion</div>
          <div className="kpi-value">
            {totalApplied ? Math.round((screeningOrAbove / totalApplied) * 100) : 0}%
          </div>
          <div className="kpi-title">Applied → Screening+</div>
        </div>
        <div className="card">
          <div className="kpi-title">Interview to Offer</div>
          <div className="kpi-value">{interviewToOffer}%</div>
          <div className="kpi-title">Interview → Offer</div>
        </div>
        <div className="card">
          <div className="kpi-title">Rejection Rate</div>
          <div className="kpi-value">{rejectRate}%</div>
          <div className="kpi-title">Total rejected share</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: "18px" }}>
        <h3>Resume Performance</h3>
        <p className="kpi-title">Response rate by resume version</p>
        <div className="resume-bars">
          {resumePerf.map((resume) => {
            const count = resume.applications.length;
            const rate = count ? Math.round((count / Math.max(totalApplied, 1)) * 100) : 0;
            return (
              <div key={resume.id} className="resume-bar-row">
                <span className="kpi-title">{resume.label}</span>
                <div className="resume-bar-track">
                  <div style={{ width: `${rate}%` }} className="resume-bar-fill" />
                </div>
                <span className="kpi-title">{rate}%</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid-two" style={{ marginTop: "18px" }}>
        <div className="card">
          <h3>Success by Source</h3>
          <p className="kpi-title">Which channels get the most responses</p>
          {sourceStats.length ? (
            <SuccessBySourceChart data={sourceStats} />
          ) : (
            <div className="chart-placeholder" />
          )}
        </div>
        <div className="card">
          <h3>Application Flow</h3>
          <p className="kpi-title">Applied → Screening → Interview</p>
          <SankeyChart counts={counts} />
        </div>
      </div>

      <div className="card" style={{ marginTop: "18px" }}>
        <h3>Weekly Trend</h3>
        <p className="kpi-title">8-week application and interview trend snapshot</p>
        <TrendLineChart points={trendPoints} />
      </div>

      <button type="button" className="floating-action" aria-label="Quick add">+</button>
    </div>
  );
}
