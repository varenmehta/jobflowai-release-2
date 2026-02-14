"use client";

import { useState } from "react";

type Partner = {
  id: string;
  name: string;
  website?: string | null;
  verified: boolean;
  user?: { email?: string | null } | null;
};

export default function AdminPartnersClient({ partners }: { partners: Partner[] }) {
  const [items, setItems] = useState(partners);
  const [message, setMessage] = useState<string>("");
  const pending = items.filter((p) => !p.verified);
  const approved = items.filter((p) => p.verified);

  const update = async (partnerId: string, verified: boolean) => {
    setMessage("Updating...");
    const res = await fetch("/api/admin/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partnerId, verified }),
    });
    const data = await res.json();
    if (res.ok) {
      setItems((prev) =>
        prev.map((item) => (item.id === partnerId ? { ...item, verified } : item))
      );
      setMessage("Updated.");
    } else {
      setMessage(data.error ?? "Failed");
    }
  };

  return (
    <div className="list-stack">
      <div className="card">
        <h3>Approval Queue</h3>
        <p className="kpi-title">Pending: {pending.length} · Approved: {approved.length}</p>
      </div>

      <div className="card">
        <h3>Pending approvals</h3>
        <div className="list-stack">
          {pending.length === 0 && <p className="kpi-title">No pending partner requests.</p>}
          {pending.map((partner) => (
            <div className="list-row" key={partner.id}>
              <div className="list-row-head">
                <strong>{partner.name}</strong>
                <span className="badge subtle">Pending</span>
              </div>
              <p className="kpi-title">{partner.website ?? "No website provided"}</p>
              <p className="kpi-title">Owner: {partner.user?.email ?? "No owner email"}</p>
              <div className="list-row-actions">
                <button type="button" className="btn btn-primary btn-sm" onClick={() => update(partner.id, true)}>
                  Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Approved partners</h3>
        <div className="list-stack">
          {approved.length === 0 && <p className="kpi-title">No approved partners yet.</p>}
          {approved.map((partner) => (
            <div className="list-row" key={partner.id}>
              <div className="list-row-head">
                <strong>{partner.name}</strong>
                <span className="badge">Verified</span>
              </div>
              <p className="kpi-title">{partner.website ?? "No website provided"}</p>
              <p className="kpi-title">Owner: {partner.user?.email ?? "No owner email"}</p>
              <div className="list-row-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => update(partner.id, false)}>
                  Revoke
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {message && <p className="status-text">{message}</p>}
    </div>
  );
}
