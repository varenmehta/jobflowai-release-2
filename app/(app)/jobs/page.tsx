import { prisma } from "@/lib/db";
import JobBoardClient from "@/components/JobBoardClient";

export default async function JobsPage() {
  const jobs = await prisma.job.findMany({
    include: { company: true },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return (
    <div>
      <h1 className="section-title">Job Board</h1>
      <p className="section-subtitle">
        Pull targeted jobs from multiple sources and curated company pages, then apply in one place.
      </p>
      <JobBoardClient jobs={jobs} />
    </div>
  );
}
