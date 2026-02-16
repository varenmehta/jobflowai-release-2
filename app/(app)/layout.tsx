import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import AppExperienceLayer from "@/components/AppExperienceLayer";
import "./app-ui.css";
import { getAuthContext } from "@/lib/auth-context";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();

  if (!ctx.user) {
    redirect("/login?from=/dashboard");
  }
  if (ctx.user.status !== "ACTIVE") {
    redirect("/suspended");
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <Topbar />
        {children}
      </main>
      <AppExperienceLayer />
    </div>
  );
}
