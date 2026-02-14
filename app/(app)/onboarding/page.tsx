"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type OnboardingState = {
  targetRoles: string[];
  locations: string[];
  salaryMin?: number;
  salaryMax?: number;
  linkedinUrl?: string;
  portfolioUrl?: string;
  bio?: string;
  primaryResumeId?: string;
  onboardingCompleted?: boolean;
};

type Resume = { id: string; label: string };

const steps = ["Career", "Profile", "Resume"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<OnboardingState>({
    targetRoles: [],
    locations: [],
  });
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [profileScore, setProfileScore] = useState(0);
  const [status, setStatus] = useState("");
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [onboardingRes, resumeRes] = await Promise.all([
        fetch("/api/onboarding"),
        fetch("/api/resumes"),
      ]);
      if (onboardingRes.ok) {
        const data = await onboardingRes.json();
        setForm(data.onboarding);
        setProfileScore(data.profileScore ?? 0);
        setCompleted(data.completed === true);
      }
      if (resumeRes.ok) {
        const data = await resumeRes.json();
        setResumes((data.resumes ?? []).map((r: Resume) => ({ id: r.id, label: r.label })));
      }
    };
    load();
  }, []);

  const completion = useMemo(() => Math.min(100, Math.round(((step + 1) / steps.length) * 100)), [step]);

  const save = async (completeSetup = false) => {
    setStatus("Saving...");
    const payload = {
      ...form,
      targetRoles: (form.targetRoles ?? []).filter(Boolean),
      locations: (form.locations ?? []).filter(Boolean),
      salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
      salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
      completeSetup,
    };
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error ?? "Save failed");
      return;
    }
    setProfileScore(data.profileScore ?? 0);
    setCompleted(data.completed === true);
    if (data.completed) {
      setStatus("Setup complete. Opening your dashboard...");
      router.push("/dashboard");
      return;
    }
    setStatus("Saved as draft.");
  };

  const setList = (key: "targetRoles" | "locations", value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: value
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    }));
  };

  return (
    <div>
      <h1 className="section-title">Onboarding Wizard</h1>
      <p className="section-subtitle">
        Complete account setup once to unlock your full dashboard and job pipeline.
      </p>

      <div className="card">
        <div className="onboarding-head">
          <div>
            <h3>Profile completeness</h3>
            <p className="kpi-title">Current score: {profileScore}%</p>
            {completed ? <p className="kpi-title">Setup completed</p> : null}
          </div>
          <span className="badge subtle">{steps[step]}</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${completion}%` }} />
        </div>

        {step === 0 && (
          <div className="form-grid">
            <input
              className="input"
              placeholder="Target roles (comma-separated)"
              value={(form.targetRoles ?? []).join(", ")}
              onChange={(e) => setList("targetRoles", e.target.value)}
            />
            <input
              className="input"
              placeholder="Preferred locations (comma-separated)"
              value={(form.locations ?? []).join(", ")}
              onChange={(e) => setList("locations", e.target.value)}
            />
            <div className="grid-two">
              <input
                className="input"
                placeholder="Salary min"
                type="number"
                value={form.salaryMin ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, salaryMin: Number(e.target.value) || undefined }))}
              />
              <input
                className="input"
                placeholder="Salary max"
                type="number"
                value={form.salaryMax ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, salaryMax: Number(e.target.value) || undefined }))}
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="form-grid">
            <input
              className="input"
              placeholder="LinkedIn URL"
              value={form.linkedinUrl ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, linkedinUrl: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Portfolio URL"
              value={form.portfolioUrl ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, portfolioUrl: e.target.value }))}
            />
            <textarea
              className="input"
              placeholder="Short bio (what roles and teams you want)"
              rows={5}
              value={form.bio ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
            />
          </div>
        )}

        {step === 2 && (
          <div className="form-grid">
            <p className="kpi-title">
              Set your primary resume. Upload one first on the Resumes page if needed.
            </p>
            <select
              className="select"
              value={form.primaryResumeId ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, primaryResumeId: e.target.value }))}
            >
              <option value="">Select primary resume</option>
              {resumes.map((resume) => (
                <option key={resume.id} value={resume.id}>
                  {resume.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            Back
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={step === steps.length - 1}
            onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
          >
            Next
          </button>
          <button type="button" className="btn btn-primary" onClick={() => save()}>
            Save draft
          </button>
          {step === steps.length - 1 && !completed ? (
            <button type="button" className="btn btn-primary" onClick={() => save(true)}>
              Complete setup
            </button>
          ) : null}
        </div>
        {status && <p className="status-text">{status}</p>}
      </div>
    </div>
  );
}
