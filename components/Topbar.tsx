"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { appModeLabel } from "@/lib/config";
import { Search } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

function getInitials(name?: string | null, email?: string | null) {
  const source = (name && name.trim()) || (email ? email.split("@")[0] : "");
  if (!source) return "U";
  const parts = source
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export default function Topbar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [initials, setInitials] = useState("JF");

  const items = useMemo(
    () => [
      { label: "Dashboard", href: "/dashboard", hint: "Overview" },
      { label: "Pipeline", href: "/pipeline", hint: "Track stages" },
      { label: "Analytics", href: "/analytics", hint: "See trends" },
      { label: "Job Board", href: "/jobs", hint: "Find roles" },
      { label: "Resumes", href: "/resumes", hint: "Manage versions" },
      { label: "Services", href: "/services", hint: "Plans" },
    ],
    [],
  );

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/auth/session");
      if (!res.ok) return;
      const data = await res.json();
      setInitials(getInitials(data?.user?.name, data?.user?.email));
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items.slice(0, 5);
    return items
      .filter((item) => item.label.toLowerCase().includes(term) || item.hint.toLowerCase().includes(term))
      .slice(0, 6);
  }, [query, items]);

  const openFirst = () => {
    if (!filtered.length) return;
    router.push(filtered[0].href);
    setFocused(false);
    setQuery("");
  };

  return (
    <div className="topbar">
      <div className="search-wrap">
        <label className="search-field" aria-label="Search pages">
          <Search size={16} />
          <input
            placeholder="Search pages, flows, tools..."
            value={query}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 120)}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") openFirst();
            }}
          />
        </label>
        {focused && filtered.length > 0 && (
          <div className="search-menu">
            {filtered.map((item) => (
              <button
                key={item.href}
                type="button"
                className="search-menu-item"
                onClick={() => {
                  router.push(item.href);
                  setFocused(false);
                  setQuery("");
                }}
              >
                <span>{item.label}</span>
                <small>{item.hint}</small>
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => window.dispatchEvent(new CustomEvent("jobflow:command-open"))}
      >
        Command Bar
        <span className="badge subtle">⌘K</span>
      </button>
      <span className="mode-pill">{appModeLabel()}</span>
      <div className="profile-chip">
        <NotificationBell />
        <button type="button" className="avatar avatar-btn" onClick={() => router.push("/profile")}>
          {initials}
        </button>
      </div>
    </div>
  );
}
