"use client";

import { useEffect, useState } from "react";

type Resume = {
  id: string;
  label: string;
  fileUrl: string;
  createdAt: string;
};

export default function ResumesPage() {
  const [status, setStatus] = useState<string>("");
  const [items, setItems] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const file = (form.elements.namedItem("resume") as HTMLInputElement).files?.[0];
    const label = (form.elements.namedItem("label") as HTMLInputElement).value;
    if (!file || !label.trim()) {
      setStatus("Please add a label and file.");
      return;
    }

    setStatus("Requesting upload URL...");
    const res = await fetch("/api/resumes/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: file.type || "application/pdf" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error ?? "Upload failed");
      return;
    }

    setStatus("Uploading...");
    const upload = await fetch(data.signedUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/pdf" },
      body: file,
    });
    if (!upload.ok) {
      setStatus("File upload failed.");
      return;
    }

    const fileUrl = data.publicUrl as string;
    if (!fileUrl) {
      setStatus("Upload URL generation failed.");
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
      setStatus(err.error ?? "Failed to save resume");
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
          <p className="kpi-title">No resumes yet. Upload your first version to unlock resume insights.</p>
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
    </div>
  );
}
