import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";
import ProfileClient from "@/components/ProfileClient";

export default async function ProfilePage() {
  const { user } = await getAuthContext();
  if (!user) redirect("/login?from=/profile");
  if (user.status !== "ACTIVE") redirect("/suspended");

  const [record, applications, interviews, offers, resumes] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, email: true, role: true, profileScore: true, preferences: true },
    }),
    prisma.application.count({ where: { userId: user.id } }),
    prisma.application.count({ where: { userId: user.id, status: "INTERVIEW" } }),
    prisma.application.count({ where: { userId: user.id, status: "OFFER" } }),
    prisma.resume.count({ where: { userId: user.id } }),
  ]);

  const prefs = (record?.preferences ?? {}) as Record<string, unknown>;

  return (
    <div>
      <h1 className="section-title">Profile</h1>
      <p className="section-subtitle">Manage your account details, goals, and public profile links.</p>
      <ProfileClient
        initialProfile={{
          id: record?.id ?? user.id,
          name: record?.name ?? "",
          email: record?.email ?? "",
          role: record?.role ?? user.role,
          profileScore: record?.profileScore ?? 0,
          headline: typeof prefs.headline === "string" ? prefs.headline : "",
          location: typeof prefs.location === "string" ? prefs.location : "",
          phone: typeof prefs.phone === "string" ? prefs.phone : "",
          linkedinUrl: typeof prefs.linkedinUrl === "string" ? prefs.linkedinUrl : "",
          portfolioUrl: typeof prefs.portfolioUrl === "string" ? prefs.portfolioUrl : "",
          bio: typeof prefs.bio === "string" ? prefs.bio : "",
          targetRoles: Array.isArray(prefs.targetRoles) ? (prefs.targetRoles as string[]) : [],
          onboardingCompleted: prefs.onboardingCompleted === true,
        }}
        stats={{ applications, interviews, offers, resumes }}
      />
    </div>
  );
}
