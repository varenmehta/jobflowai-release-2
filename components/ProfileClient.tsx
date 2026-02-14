"use client";

import { useState } from "react";

type Profile = {
  id: string;
  name: string;
  email: string;
  role: string;
  profileScore: number;
  headline: string;
  location: string;
  phone: string;
  linkedinUrl: string;
  portfolioUrl: string;
  bio: string;
  targetRoles: string[];
  onboardingCompleted: boolean;
};

type Stats = {
  applications: number;
  interviews: number;
  offers: number;
  resumes: number;
};

export default function ProfileClient({ initialProfile, stats }: { initialProfile: Profile; stats: Stats }) {
  const [profile, setProfile] = useState(initialProfile);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const update = (key: keyof Profile, value: string) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    setStatus("Saving...");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          headline: profile.headline,
          location: profile.location,
          phone: profile.phone,
          linkedinUrl: profile.linkedinUrl,
          portfolioUrl: profile.portfolioUrl,
          bio: profile.bio,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error ?? "Failed to save profile");
        return;
      }
      setProfile((prev) => ({ ...prev, ...data.profile }));
      setStatus("Profile updated.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="insight-grid">
        <div className="card highlight insight-card">
          <h3>Profile Score</h3>
          <p className="kpi-title">{profile.profileScore}% setup completeness</p>
        </div>
        <div className="card highlight insight-card">
          <h3>Role</h3>
          <p className="kpi-title">{profile.role}</p>
        </div>
        <div className="card highlight insight-card">
          <h3>Onboarding</h3>
          <p className="kpi-title">{profile.onboardingCompleted ? "Completed" : "Incomplete"}</p>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="card"><div className="kpi-title">Applications</div><div className="kpi-value">{stats.applications}</div></div>
        <div className="card"><div className="kpi-title">Interviews</div><div className="kpi-value">{stats.interviews}</div></div>
        <div className="card"><div className="kpi-title">Offers</div><div className="kpi-value">{stats.offers}</div></div>
        <div className="card"><div className="kpi-title">Resumes</div><div className="kpi-value">{stats.resumes}</div></div>
      </div>

      <div className="card">
        <h3>Personal Details</h3>
        <p className="kpi-title">Keep this updated so recommendations and workflows stay relevant.</p>
        <div className="form-grid">
          <input className="input" value={profile.name} onChange={(e) => update("name", e.target.value)} placeholder="Full name" />
          <input className="input" value={profile.email} disabled placeholder="Email" />
          <input className="input" value={profile.headline} onChange={(e) => update("headline", e.target.value)} placeholder="Headline" />
          <input className="input" value={profile.location} onChange={(e) => update("location", e.target.value)} placeholder="Location" />
          <input className="input" value={profile.phone} onChange={(e) => update("phone", e.target.value)} placeholder="Phone" />
          <input className="input" value={profile.linkedinUrl} onChange={(e) => update("linkedinUrl", e.target.value)} placeholder="LinkedIn URL" />
          <input className="input" value={profile.portfolioUrl} onChange={(e) => update("portfolioUrl", e.target.value)} placeholder="Portfolio URL" />
          <textarea className="input" rows={5} value={profile.bio} onChange={(e) => update("bio", e.target.value)} placeholder="Bio" />
        </div>
        {profile.targetRoles?.length ? (
          <p className="kpi-title" style={{ marginTop: "10px" }}>Target roles: {profile.targetRoles.join(", ")}</p>
        ) : null}
        <div className="form-actions" style={{ marginTop: "12px" }}>
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save profile"}
          </button>
        </div>
        {status ? <p className="status-text">{status}</p> : null}
      </div>
    </div>
  );
}
