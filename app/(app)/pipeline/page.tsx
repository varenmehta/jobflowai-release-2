import { prisma } from "@/lib/db";
import PipelineClient from "@/components/PipelineClient";
import { getAuthContext } from "@/lib/auth-context";
import { redirect } from "next/navigation";

export default async function PipelinePage() {
  const { user } = await getAuthContext();
  if (!user) redirect("/login?from=/pipeline");
  if (user.status !== "ACTIVE") redirect("/suspended");

  const applications = await prisma.application.findMany({
    where: { userId: user.id },
    include: { job: { include: { company: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <h1 className="section-title">Application Pipeline</h1>
      <p className="section-subtitle">Drag cards between stages to update status.</p>
      <PipelineClient applications={applications} />
      <button type="button" className="floating-action" aria-label="Quick add">+</button>
    </div>
  );
}
