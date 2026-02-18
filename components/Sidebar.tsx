"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Route,
  BarChart3,
  Briefcase,
  FileText,
  Sparkles,
  Settings,
  Zap,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Pipeline", href: "/pipeline", icon: Route },
  { label: "Job Board", href: "/jobs", icon: Briefcase },
  { label: "Resumes", href: "/resumes", icon: FileText },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Services", href: "/services", icon: Sparkles },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-badge">
          <Zap size={16} />
        </div>
        JobFlow AI
      </div>
      <nav>
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`nav-item ${pathname === item.href ? "active" : ""}`}
          >
            <item.icon size={17} />
            {item.label}
          </Link>
        ))}
      </nav>
      <button className="sidebar-footer" type="button">
        <Settings size={16} />
        Settings
      </button>
    </aside>
  );
}
