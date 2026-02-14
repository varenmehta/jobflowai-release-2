import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";
import CompanyCRMClient from "@/components/CompanyCRMClient";
import { redirect } from "next/navigation";

export default async function CompanyPage() {
  const { user } = await getAuthContext();
  if (!user) redirect("/login?from=/company");
  if (user.role !== "PARTNER" && user.role !== "ADMIN") redirect("/dashboard");

  const partner = await prisma.partnerCompany.findUnique({
    where: { userId: user.id },
  });

  const applicants = partner
    ? await prisma.application.findMany({
        where: { job: { partnerCompanyId: partner.id } },
        include: { job: { include: { company: true } }, user: true },
        orderBy: { updatedAt: "desc" },
      })
    : [];

  const stats = partner
    ? {
        total: applicants.length,
        screening: applicants.filter((a) => a.status === "SCREENING").length,
        interviews: applicants.filter((a) => a.status === "INTERVIEW").length,
        offers: applicants.filter((a) => a.status === "OFFER").length,
      }
    : null;

  return (
    <div>
      <h1 className="section-title">Company CRM</h1>
      <p className="section-subtitle">Manage applicants and update their pipeline status.</p>
      {stats && (
        <div className="grid-four" style={{ marginBottom: "16px" }}>
          <div className="card">
            <div className="kpi-title">Total Applicants</div>
            <div className="kpi-value">{stats.total}</div>
          </div>
          <div className="card">
            <div className="kpi-title">Screening</div>
            <div className="kpi-value">{stats.screening}</div>
          </div>
          <div className="card">
            <div className="kpi-title">Interviews</div>
            <div className="kpi-value">{stats.interviews}</div>
          </div>
          <div className="card">
            <div className="kpi-title">Offers</div>
            <div className="kpi-value">{stats.offers}</div>
          </div>
        </div>
      )}
      {partner ? (
        <CompanyCRMClient applicants={applicants} />
      ) : (
        <div className="card">
          <h3>Create Partner Profile</h3>
          <p className="kpi-title">Use the Partners page to become a verified company.</p>
        </div>
      )}
    </div>
  );
}
