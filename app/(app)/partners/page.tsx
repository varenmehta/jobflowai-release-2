"use client";

import { useEffect, useState } from "react";

export default function PartnersPage() {
  const [message, setMessage] = useState<string>("");
  const [jobMsg, setJobMsg] = useState<string>("");
  const [partner, setPartner] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  const loadPartner = async () => {
    const res = await fetch("/api/partners");
    if (!res.ok) return;
    const data = await res.json();
    setPartner(data.partner);
    setStats(data.stats);
  };

  useEffect(() => {
    loadPartner();
  }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value;
    const website = (form.elements.namedItem("website") as HTMLInputElement).value;

    const res = await fetch("/api/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, website }),
    });

    const data = await res.json();
    setMessage(res.ok ? "Partner profile created." : data.error ?? "Failed");
    if (res.ok) loadPartner();
  };

  const postJob = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const title = (form.elements.namedItem("title") as HTMLInputElement).value;
    const companyName = (form.elements.namedItem("company") as HTMLInputElement).value;
    const url = (form.elements.namedItem("url") as HTMLInputElement).value;

    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, companyName, url, source: "Partner" }),
    });
    const data = await res.json();
    setJobMsg(res.ok ? "Job posted." : data.error ?? "Failed");
    if (res.ok) loadPartner();
  };

  return (
    <div>
      <h1 className="section-title">Partners</h1>
      <p className="section-subtitle">Manage company postings and applicant pipeline.</p>
      {partner && (
        <div className="grid-three" style={{ marginBottom: "16px" }}>
          <div className="card">
            <div className="kpi-title">Approval status</div>
            <div className="kpi-value">{partner.verified ? "Verified" : "Pending"}</div>
            <div className="kpi-title">{partner.name}</div>
          </div>
          <div className="card">
            <div className="kpi-title">Company-level stats</div>
            <div className="kpi-value">{stats?.jobs ?? 0}</div>
            <div className="kpi-title">Jobs posted</div>
          </div>
          <div className="card">
            <div className="kpi-title">Pipeline reach</div>
            <div className="kpi-value">{stats?.applicants ?? 0}</div>
            <div className="kpi-title">Total applicants</div>
          </div>
        </div>
      )}
      <div className="grid-two">
        <div className="card">
          <h3>Create Partner Profile</h3>
          <form onSubmit={submit} className="form-grid">
            <input className="input" name="name" placeholder="Company name" />
            <input className="input" name="website" placeholder="Website" />
            <button className="btn btn-primary">Submit</button>
          </form>
          {message && <p className="status-text">{message}</p>}
        </div>
        <div className="card">
          <h3>Post a Job</h3>
          <form onSubmit={postJob} className="form-grid">
            <input className="input" name="title" placeholder="Job title" />
            <input className="input" name="company" placeholder="Company name" />
            <input className="input" name="url" placeholder="Job URL" />
            <button className="btn btn-primary">Post</button>
          </form>
          {jobMsg && <p className="status-text">{jobMsg}</p>}
        </div>
      </div>
    </div>
  );
}
