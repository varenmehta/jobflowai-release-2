"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type OnboardingState = {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  primaryResumeId: string;
  onboardingCompleted?: boolean;
};

type Resume = { id: string; label: string; fileUrl?: string; createdAt?: string };

function getErrorMessage(error: unknown) {
  if (typeof error === "string" && error.trim()) return error;
  if (!error || typeof error !== "object") return "Save failed";
  const obj = error as Record<string, unknown>;
  if (typeof obj.error === "string") return obj.error;
  const fieldErrors = obj.fieldErrors;
  if (fieldErrors && typeof fieldErrors === "object") {
    for (const value of Object.values(fieldErrors as Record<string, unknown>)) {
      if (Array.isArray(value) && value.length && typeof value[0] === "string") {
        return value[0];
      }
    }
  }
  return "Save failed";
}

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState<OnboardingState>({
    firstName: "",
    lastName: "",
    email: "",
    dateOfBirth: "",
    primaryResumeId: "",
  });
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [profileScore, setProfileScore] = useState(0);
  const [status, setStatus] = useState("");
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [onboardingRes, resumeRes] = await Promise.all([fetch("/api/onboarding"), fetch("/api/resumes")]);
      if (onboardingRes.ok) {
        const data = await onboardingRes.json();
        setForm((prev) => ({
          ...prev,
          firstName: data.onboarding?.firstName ?? "",
          lastName: data.onboarding?.lastName ?? "",
          email: data.onboarding?.email ?? "",
          dateOfBirth: data.onboarding?.dateOfBirth ?? "",
          primaryResumeId: data.onboarding?.primaryResumeId ?? "",
        }));
        setProfileScore(data.profileScore ?? 0);
        setCompleted(data.completed === true);
      }
      if (resumeRes.ok) {
        const data = await resumeRes.json();
        setResumes(data.resumes ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const uploadResume = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formEl = event.currentTarget;
    const file = (formEl.elements.namedItem("resume") as HTMLInputElement).files?.[0];
    const label = (formEl.elements.namedItem("label") as HTMLInputElement).value.trim();

    if (!file || !label) {
      setStatus("Add a resume label and file.");
      return;
    }

    setStatus("Uploading resume...");
    const payload = new FormData();
    payload.append("file", file);

    const uploadRes = await fetch("/api/resumes/upload", {
      method: "POST",
      body: payload,
    });

    const uploadData = await uploadRes.json().catch(() => ({}));
    if (!uploadRes.ok) {
      setStatus(getErrorMessage(uploadData.error ?? uploadData));
      return;
    }

    const fileUrl = uploadData.publicUrl as string | undefined;
    if (!fileUrl) {
      setStatus("Upload failed. Missing file URL.");
      return;
    }

    const saveRes = await fetch("/api/resumes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, fileUrl }),
    });
    const saveData = await saveRes.json().catch(() => ({}));

    if (!saveRes.ok) {
      setStatus(getErrorMessage(saveData.error ?? saveData));
      return;
    }

    const resumeId = saveData.resume?.id as string | undefined;
    if (resumeId) {
      setForm((prev) => ({ ...prev, primaryResumeId: resumeId }));
    }

    formEl.reset();
    setStatus("Resume uploaded.");
    await load();
  };

  const completeSetup = async () => {
    setStatus("Saving...");
    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      dateOfBirth: form.dateOfBirth,
      primaryResumeId: form.primaryResumeId,
      completeSetup: true,
    };

    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(getErrorMessage(data.error ?? data));
      return;
    }

    setProfileScore(data.profileScore ?? 0);
    setCompleted(data.completed === true);
    setStatus("Setup complete. Opening your dashboard...");
    router.push("/dashboard");
  };

  return (
    <div>
      <h1 className="section-title">Onboarding</h1>
      <p className="section-subtitle">
        Complete your profile to start tracking applications, CRM workflow, analytics, and Gmail-driven updates.
      </p>

      <div className="card">
        <div className="onboarding-head">
          <div>
            <h3>Setup profile</h3>
            <p className="kpi-title">Profile score: {profileScore}%</p>
            {completed ? <p className="kpi-title">Setup completed</p> : null}
          </div>
        </div>

        <div className="form-grid" style={{ marginTop: 12 }}>
          <div className="grid-two">
            <input
              className="input"
              placeholder="First name"
              value={form.firstName}
              onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Last name"
              value={form.lastName}
              onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
            />
          </div>

          <input
            className="input"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          />

          <input
            className="input"
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => setForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))}
          />
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <h3>Resume Upload</h3>
          <p className="kpi-title">Upload one resume to finish onboarding.</p>
          <form onSubmit={uploadResume} className="form-grid">
            <input name="label" className="input" placeholder="Resume label (e.g. Primary Resume)" />
            <input name="resume" type="file" accept=".pdf,.doc,.docx" className="input" />
            <button className="btn btn-primary" type="submit">Upload resume</button>
          </form>

          {resumes.length ? (
            <div className="list-stack" style={{ marginTop: 10 }}>
              {resumes.slice(0, 5).map((resume) => (
                <div key={resume.id} className="list-row">
                  <strong>{resume.label}</strong>
                  <span className="kpi-title">{resume.createdAt ? new Date(resume.createdAt).toLocaleDateString() : ""}</span>
                </div>
              ))}
            </div>
          ) : loading ? (
            <p className="kpi-title">Loading resumes...</p>
          ) : (
            <p className="kpi-title">No resume uploaded yet.</p>
          )}
        </div>

        <div className="form-actions" style={{ marginTop: 14 }}>
          <button type="button" className="btn btn-primary" onClick={completeSetup}>
            Complete setup
          </button>
        </div>

        {status ? <p className="status-text">{status}</p> : null}
      </div>
    </div>
  );
}
