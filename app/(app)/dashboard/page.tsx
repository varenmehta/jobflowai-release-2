import dynamic from "next/dynamic";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";
import EmailSyncClient from "@/components/EmailSyncClient";
import Skeleton from "@/components/Skeleton";
import ProgressiveReveal from "@/components/ProgressiveReveal";

const TrendLineChart = dynamic(() => import("@/components/TrendLineChart"), {
  loading: () => <Skeleton className="skeleton-lg" lines={3} />,
});

type TrendPoint = {
  label: string;
  applied: number;
  interview: number;
};

export default async function DashboardPage() {
  const { user } = await getAuthContext();
  if (!user) redirect("/login?from=/dashboard");
  if (user.status !== "ACTIVE") redirect("/suspended");
  if (!user.onboardingCompleted) redirect("/onboarding");

  const userId = user.id;
  const [
    totalApplied,
    offers,
    interviews,
    resumeCount,
    profile,
    staleApps,
    unreadCount,
    resumes,
    recentApps,
    applications,
  ] = await Promise.all([
    prisma.application.count({ where: { userId } }),
    prisma.application.count({ where: { userId, status: "OFFER" } }),
    prisma.application.count({ where: { userId, status: "INTERVIEW" } }),
    prisma.resume.count({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { profileScore: true } }),
    prisma.application.count({
      where: {
        userId,
        status: { in: ["APPLIED", "SCREENING"] },
        updatedAt: { lt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10) },
      },
    }),
    prisma.notification.count({ where: { userId, read: false } }),
    prisma.resume.findMany({
      where: { userId },
      include: { applications: { select: { status: true } } },
    }),
    prisma.application.findMany({
      where: { userId },
      include: { job: { include: { company: true } } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    prisma.application.findMany({
      where: { userId },
      select: { createdAt: true, status: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const responseRate = totalApplied ? Math.round((interviews / totalApplied) * 100) : 0;

  const topResume = resumes
    .map((resume) => {
      const total = resume.applications.length;
      const positive = resume.applications.filter(
        (application) => application.status === "INTERVIEW" || application.status === "OFFER",
      ).length;
      const rate = total ? Math.round((positive / total) * 100) : 0;
      return { label: resume.label, rate, total };
    })
    .sort((a, b) => b.rate - a.rate)[0];

  const stageWeight: Record<string, number> = {
    APPLIED: 20,
    SCREENING: 48,
    INTERVIEW: 78,
    OFFER: 95,
    REJECTED: 2,
    WITHDRAWN: 0,
  };

  const highestProbability = recentApps
    .map((app) => ({
      label: `${app.job.company?.name ?? "Company"} — ${app.job.title}`,
      score: stageWeight[app.status] ?? 20,
    }))
    .sort((a, b) => b.score - a.score)[0];

  const todayFocus = [
    {
      title: staleApps > 0 ? "Follow up stale applications" : "No stale applications",
      detail: staleApps > 0 ? `${staleApps} opportunities need outreach today.` : "Your pipeline is fresh this week.",
      href: "/pipeline",
    },
    {
      title: resumeCount ? "Tune your best resume" : "Upload your first resume",
      detail: resumeCount
        ? `Current best performer: ${topResume?.label ?? "Resume"}`
        : "Resume variants unlock conversion insights.",
      href: "/resumes",
    },
    {
      title: unreadCount > 0 ? "Review unread updates" : "Hunt for next role",
      detail: unreadCount > 0 ? `${unreadCount} updates waiting in your inbox.` : "Add 3 strong jobs to maintain momentum.",
      href: unreadCount > 0 ? "/dashboard" : "/jobs",
    },
  ];

  const now = new Date();
  const points: TrendPoint[] = Array.from({ length: 6 }, (_, index) => {
    const from = new Date(now);
    from.setDate(now.getDate() - (5 - index) * 5);
    const to = new Date(from);
    to.setDate(from.getDate() + 4);

    const bucket = applications.filter((app) => app.createdAt >= from && app.createdAt <= to);
    return {
      label: `D${index + 1}`,
      applied: bucket.length,
      interview: bucket.filter((app) => app.status === "INTERVIEW" || app.status === "OFFER").length,
    };
  });

  const insights = [
    topResume
      ? `You get stronger outcomes with ${topResume.label}. Current response lift is ${topResume.rate}% across tracked submissions.`
      : "Upload resume variants to unlock response lift insights by role and source.",
    highestProbability
      ? `Highest probability opportunity today is ${highestProbability.label} at an estimated ${highestProbability.score}% interview likelihood.`
      : "No active opportunities yet. Add jobs to let Copilot rank your best next move.",
    `Your overall interview response rate is ${responseRate}%. ${responseRate >= 30 ? "Momentum is strong this week." : "Focus on higher-fit roles and follow-up cadence."}`,
  ];

  return (
    <div className="dashboard-v2">
      <div className="dashboard-head reveal">
        <h1 className="section-title">Today Execution Panel</h1>
        <p className="section-subtitle">A calm, high-signal operating view for the next 24 hours.</p>
      </div>

      <ProgressiveReveal>
        <section className="grid-two">
          <article className="glass-card today-focus-card">
            <div className="list-row-head">
              <h3>3 Next Best Actions</h3>
              <span className="badge subtle">Priority</span>
            </div>
            <div className="list-stack">
              {todayFocus.map((item) => (
                <Link key={item.title} href={item.href} className="focus-item">
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </Link>
              ))}
            </div>
            <div className="focus-risk">
              <span className="kpi-title">Pipeline risk alert</span>
              <strong>{staleApps > 0 ? `${staleApps} aging stage alerts` : "No current risk"}</strong>
            </div>
          </article>

          <article className="elevated-card probability-card">
            <h3>Highest Probability Job</h3>
            <p className="kpi-title">AI-ranked from stage progress, recency, and response pattern.</p>
            <div className="probability-value">{highestProbability?.score ?? 0}%</div>
            <p className="kpi-title">{highestProbability?.label ?? "No active applications yet"}</p>
            <div className="form-actions" style={{ marginTop: "12px" }}>
              <Link href="/pipeline" className="btn btn-primary btn-sm">
                Open Pipeline
              </Link>
              <Link href="/jobs" className="btn btn-secondary btn-sm">
                Find Better Matches
              </Link>
            </div>
          </article>
        </section>
      </ProgressiveReveal>

      <ProgressiveReveal>
        <section className="card" style={{ marginTop: "18px" }}>
          <div className="list-row-head">
            <h3>Your Momentum</h3>
            <span className="kpi-title">Last 30 days</span>
          </div>
          <TrendLineChart points={points} />
        </section>
      </ProgressiveReveal>

      <ProgressiveReveal>
        <section className="card" style={{ marginTop: "18px" }}>
          <div className="list-row-head">
            <h3>AI Insights</h3>
            <span className="badge subtle">Text-first</span>
          </div>
          <div className="ai-insight-stack">
            {insights.map((insight) => (
              <p key={insight} className="ai-insight-line">
                {insight}
              </p>
            ))}
          </div>
          <p className="kpi-title" style={{ marginTop: "12px" }}>
            Snapshot: {totalApplied} applied, {interviews} interviews, {offers} offers, profile score{" "}
            {profile?.profileScore ?? "N/A"}.
          </p>
        </section>
      </ProgressiveReveal>

      <ProgressiveReveal>
        <section style={{ marginTop: "18px" }}>
          <EmailSyncClient />
        </section>
      </ProgressiveReveal>
    </div>
  );
}
