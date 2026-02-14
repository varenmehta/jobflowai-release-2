import { prisma } from "@/lib/db";
import AdminPartnersClient from "@/components/AdminPartnersClient";
import AdminUsersClient from "@/components/AdminUsersClient";
import { getAuthContext } from "@/lib/auth-context";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const { user } = await getAuthContext();
  if (!user) redirect("/login?from=/admin");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const partners = await prisma.partnerCompany.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  return (
    <div>
      <h1 className="section-title">Admin Console</h1>
      <p className="section-subtitle">Approve companies, manage users, and audit activity.</p>
      <AdminPartnersClient partners={partners} />
      <AdminUsersClient
        users={users.map((user) => ({ ...user, createdAt: user.createdAt.toISOString() }))}
      />
    </div>
  );
}
