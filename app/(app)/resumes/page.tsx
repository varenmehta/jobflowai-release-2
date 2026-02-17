"use client";

import { useEffect, useState } from "react";
import Skeleton from "@/components/Skeleton";

type Resume = {
  id: string;
  label: string;
  fileUrl: string;
  createdAt: string;
};

function getErrorMessage(error: unknown, fallback = "Upload failed") {
  if (typeof error === "string" && error.trim()) return error;
  if (!error || typeof error !== "object") return fallback;
  const obj = error as Record<string, unknown>;
  const fieldErrors = obj.fieldErrors;
  if (fieldErrors && typeof fieldErrors === "object") {
    for (const value of Object.values(fieldErrors as Record<string, unknown>)) {
      if (Array.isArray(value) && value.length && typeof value[0] === "string") {
        return value[0];
      }
    }
  }
  if (Array.isArray(obj.formErrors) && obj.formErrors.length && typeof obj.formErrors[0] === "string") {
    return obj.formErrors[0];
  }
  return fallback;
}

export default function ResumesPage() {
  const [status, setStatus] = useState<string>("");
  const [items, setItems] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSkill, setActiveSkill] = useState<{ name: string; score: number } | null>(null);
  const [coachFeed, setCoachFeed] = useState<string[]>([
    "Scanning resume signals...",
    "Aligning role clusters with response history...",
  ]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/resumes");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.resumes ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const handler = () => setStatus("AI Coach: generating new resume draft from your strongest signal set...");
    window.addEventListener("jobflow:resume-generate", handler);
    return () => window.removeEventListener("jobflow:resume-generate", handler);
  }, []);

  useEffect(() => {
    const lines = [
      "Suggestion: Move measurable outcomes into first 2 bullets for recruiter scan speed.",
      "Suggestion: For product roles, emphasize cross-functional launch ownership.",
      "Suggestion: Add one quantified fintech case line for higher domain confidence.",
      "Suggestion: Keep ATS keyword density between 2% and 3% for priority terms.",
    ];
    let index = 0;
    const timer = window.setInterval(() => {
      setCoachFeed((prev) => {
        const next = [...prev, lines[index % lines.length]];
        return next.slice(-4);
      });
      index += 1;
    }, 2600);
    return () => window.clearInterval(timer);
  }, []);

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const file = (form.elements.namedItem("resume") as HTMLInputElement).files?.[0];
    const label = (form.elements.namedItem("label") as HTMLInputElement).value;
    if (!file || !label.trim()) {
      setStatus("Please add a label and file.");
      return;
    }

    setStatus("Uploading...");
    const uploadForm = new FormData();
    uploadForm.append("file", file);
    const res = await fetch("/api/resumes/upload", {
      method: "POST",
      body: uploadForm,
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(getErrorMessage(data.error));
      return;
    }

    const fileUrl = data.publicUrl as string;
    if (!fileUrl) {
      setStatus("File upload failed.");
      return;
    }

    setStatus("Saving resume...");
    const save = await fetch("/api/resumes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, fileUrl }),
    });
    if (!save.ok) {
      const err = await save.json();
      setStatus(getErrorMessage(err.error, "Failed to save resume"));
      return;
    }

    setStatus("Done!");
    form.reset();
    await load();
  };

  return (
    <div>
      <h1 className="section-title">Resumes</h1>
      <p className="section-subtitle">Upload multiple versions and track performance.</p>
      <div className="card">
        <h3>Resume Library</h3>
        <p className="kpi-title">Upload PDF or DOCX files.</p>
        <form onSubmit={handleUpload} className="form-grid">
          <input name="label" placeholder="Resume label (e.g. SWE v3)" className="input" />
          <input name="resume" type="file" accept=".pdf,.doc,.docx" className="input" />
          <button className="btn btn-primary">
            Upload
          </button>
        </form>
        {status && <p className="status-text">{status}</p>}
      </div>

      <div className="card" style={{ marginTop: "16px" }}>
        <div className="list-row-head">
          <h3>Your Resume Versions</h3>
          <button type="button" className="btn btn-secondary btn-sm" onClick={load}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        {items.length === 0 ? (
          loading ? (
            <Skeleton className="skeleton-md" lines={3} />
          ) : (
            <p className="kpi-title">No resumes yet. Upload your first version to unlock resume insights.</p>
          )
        ) : (
          <div className="list-stack">
            {items.map((resume) => (
              <div key={resume.id} className="list-row">
                <strong>{resume.label}</strong>
                <span className="kpi-title">Added {new Date(resume.createdAt).toLocaleDateString()}</span>
                <a href={resume.fileUrl} target="_blank" rel="noreferrer" className="kpi-title">
                  Open file
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid-two" style={{ marginTop: "16px" }}>
        <div className="card elevated-card">
          <div className="list-row-head">
            <h3>Performance Heat Map</h3>
            <span className="badge subtle">Skills x response impact</span>
          </div>
          <div className="heat-grid">
            {[
              ["System Design", 82],
              ["Product Thinking", 76],
              ["React/Next.js", 88],
              ["Data Fluency", 65],
              ["Leadership", 71],
              ["Fintech Domain", 58],
            ].map(([skill, score]) => (
              <div
                key={String(skill)}
                className={`heat-row ${activeSkill?.name === String(skill) ? "active" : ""}`}
                onMouseEnter={() => setActiveSkill({ name: String(skill), score: Number(score) })}
                onMouseLeave={() => setActiveSkill((current) => (current?.name === String(skill) ? null : current))}
              >
                <span className="kpi-title">{skill}</span>
                <div className="heat-track">
                  <div className="heat-fill" style={{ width: `${score}%` }} />
                </div>
                <span className="kpi-title">{score}%</span>
              </div>
            ))}
          </div>
          <p className="kpi-title" style={{ marginTop: "10px" }}>
            {activeSkill
              ? `${activeSkill.name} currently contributes an estimated ${activeSkill.score}% response impact.`
              : "Hover a skill to inspect response impact."}
          </p>
        </div>

        <div className="card glass-card">
          <div className="list-row-head">
            <h3>AI Resume Coach</h3>
            <span className="badge subtle">Actionable</span>
          </div>
          <div className="list-stack">
            <button type="button" className="command-item" onClick={() => setStatus("Coach: prioritized product-role bullet improvements generated.")}>
              <span>Improve for product roles</span>
            </button>
            <button type="button" className="command-item" onClick={() => setStatus("Coach: fintech-targeted keywords and metrics pack generated.")}>
              <span>Optimize for fintech</span>
            </button>
            <button type="button" className="command-item" onClick={() => setStatus("Coach: ATS score optimization checklist prepared for this role.")}>
              <span>Increase ATS score for this job</span>
            </button>
          </div>
          <div className="ai-stream-panel">
            {coachFeed.map((line) => (
              <p key={line} className="kpi-title ai-stream-line">{line}</p>
            ))}
          </div>
          <p className="kpi-title" style={{ marginTop: "10px" }}>
            Tip: keep one resume variant per role cluster and track response rate weekly.
          </p>
        </div>
      </div>
    </div>
  );
}
