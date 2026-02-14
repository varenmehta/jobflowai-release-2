import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";
import EmailSyncClient from "@/components/EmailSyncClient";
import { redirect } from "next/navigation";
import Link from "next/link";

const stageOrder = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER"] as const;
type Stage = (typeof stageOrder)[number];
type KanbanItem = { id: string; company: string; title: string };
type KanbanData = Record<Stage, KanbanItem[]>;

const stageLabel: Record<Stage, string> = {
  APPLIED: "Applied",
  SCREENING: "Screening",
  INTERVIEW: "Interview",
  OFFER: "Offer",
};

const sampleKanban: KanbanData = {
  APPLIED: [
    { id: "s1", company: "Figma", title: "Frontend Engineer" },
    { id: "s2", company: "Datadog", title: "UI Engineer" },
  ],
  SCREENING: [{ id: "s3", company: "Vercel", title: "Staff Engineer" }],
  INTERVIEW: [{ id: "s4", company: "Stripe", title: "Senior Frontend Engineer" }],
  OFFER: [{ id: "s5", company: "Linear", title: "Frontend Engineer" }],
};

export default async function DashboardPage() {
  const { user } = await getAuthContext();
  if (!user) redirect("/login?from=/dashboard");
  if (user.status !== "ACTIVE") redirect("/suspended");
  if (!user.onboardingCompleted) redirect("/onboarding");
  const userId = user.id;

  const [totalApplied, offers, interviews, resumeCount, profile, staleApps, unreadCount, resumes, recentApps] =
    await Promise.all([
      prisma.application.count({ where: { userId } }),
      prisma.application.count({ where: { userId, status: "OFFER" } }),
      prisma.application.count({ where: { userId, status: "INTERVIEW" } }),
      prisma.resume.count({ where: { userId } }),
      prisma.user.findUnique({ where: { id: userId }, select: { profileScore: true } }),
      prisma.application.count({
        where: {
          userId,
          status: { in: ["APPLIED", "SCREENING"] },
          updatedAt: { lt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14) },
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
        take: 8,
      }),
    ]);

  const responseRate = totalApplied ? Math.round((interviews / totalApplied) * 100) : 0;
  const activeCount = totalApplied - offers;

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

  const kpis = [
    { title: "Total Applied", value: `${totalApplied}`, note: "All tracked applications" },
    { title: "Response Rate", value: `${responseRate}%`, note: "Interview or offer outcomes" },
    { title: "Avg Time to Interview", value: "12d", note: "From application" },
    { title: "Offers", value: `${offers}`, note: `${activeCount} active` },
  ];

  const steps = [
    { done: (profile?.profileScore ?? 0) >= 70, label: "Complete onboarding profile", href: "/onboarding" },
    { done: resumeCount > 0, label: "Upload at least one resume", href: "/resumes" },
    { done: totalApplied > 0, label: "Apply to your first role", href: "/jobs" },
    { done: totalApplied > 2, label: "Start managing your pipeline", href: "/pipeline" },
  ];

  const grouped: KanbanData = {
    APPLIED: [],
    SCREENING: [],
    INTERVIEW: [],
    OFFER: [],
  };

  for (const application of recentApps) {
    const stage = application.status as Stage;
    if (!stageOrder.includes(stage)) continue;
    if (grouped[stage].length >= 2) continue;
    grouped[stage].push({
      id: application.id,
      company: application.job.company?.name ?? "Company",
      title: application.job.title,
    });
  }

  const hasRealKanban = stageOrder.some((stage) => grouped[stage].length > 0);
  const kanban: KanbanData = hasRealKanban ? grouped : sampleKanban;

  return (
    <div className="dashboard-page">
      <h1 className="section-title">Good morning</h1>
      <p className="section-subtitle">You have {activeCount} active applications. Here&apos;s your overview.</p>

      <div className="insight-grid">
        <div className="card highlight insight-card">
          <h3>Pipeline Health</h3>
          <p className="kpi-title">{staleApps} applications need attention with no response in 14+ days.</p>
        </div>
        <div className="card highlight insight-card">
          <h3>Top Resume</h3>
          <p className="kpi-title">
            {topResume ? `${topResume.label} has a ${topResume.rate}% response rate` : "Upload resumes to see top performance"}
          </p>
        </div>
        <div className="card highlight insight-card">
          <h3>Inbox Updates</h3>
          <p className="kpi-title">{unreadCount} unread notifications and status updates.</p>
        </div>
      </div>

      <div className="kpi-grid">
        {kpis.map((kpi) => (
          <div className="card" key={kpi.title}>
            <div className="kpi-title">{kpi.title}</div>
            <div className="kpi-value">{kpi.value}</div>
            <div className="kpi-title">{kpi.note}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="list-row-head">
          <h3>Getting Started Checklist</h3>
          <span className="badge subtle">{steps.filter((step) => step.done).length}/{steps.length} complete</span>
        </div>
        <div className="journey-grid">
          {steps.map((step) => (
            <Link key={step.label} href={step.href} className={`journey-item ${step.done ? "done" : ""}`}>
              <div className="journey-dot" aria-hidden />
              <span>{step.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid-two">
        <div className="card">
          <div className="list-row-head">
            <h3>Pipeline Preview</h3>
            <Link href="/pipeline" className="kpi-title">Open full board</Link>
          </div>
          <div className="mini-kanban">
            {stageOrder.map((stage) => (
              <div key={stage} className="mini-stage">
                <div className="mini-stage-head">
                  <strong>{stageLabel[stage]}</strong>
                  <span>{kanban[stage].length}</span>
                </div>
                <div className="mini-cards">
                  {kanban[stage].map((item) => (
                    <article key={item.id} className="mini-card">
                      <strong>{item.company}</strong>
                      <span>{item.title}</span>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3>Success by Source</h3>
          <p className="kpi-title">Which channels get the most responses</p>
          <div className="chart-placeholder" />
        </div>
      </div>

      <div>
        <EmailSyncClient />
      </div>

      <button type="button" className="floating-action" aria-label="Quick add">+</button>
    </div>
  );
}
