"use client";

import { useEffect, useState } from "react";

type SyncInfo = {
  sync: {
    status: "ACTIVE" | "PAUSED" | "ERROR";
    lastSyncedAt: string | null;
  } | null;
  count: number;
};

export default function EmailSyncClient() {
  const [message, setMessage] = useState<string>("");
  const [info, setInfo] = useState<SyncInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/email-sync");
      if (res.ok) {
        const data = await res.json();
        setInfo(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sync = async () => {
    setMessage("Syncing...");
    const res = await fetch("/api/email-sync", { method: "POST" });
    const data = await res.json();
    setMessage(
      res.ok
        ? `Synced ${data.created ?? 0} emails. Updated ${data.pipelineUpdates ?? 0} pipeline cards.`
        : data.error ?? "Failed",
    );
    await load();
  };

  return (
    <div className="card">
      <h3>Email Sync</h3>
      <p className="kpi-title">Pull latest Gmail updates. Gmail only for now.</p>
      <div className="form-actions">
        <button type="button" className="btn btn-primary btn-sm" onClick={sync}>
          Sync Gmail
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={load}>
          {loading ? "Refreshing..." : "Refresh status"}
        </button>
      </div>
      {info && (
        <div className="list-stack">
          <span className="kpi-title">Status: {info.sync?.status ?? "Not connected"}</span>
          <span className="kpi-title">
            Last synced:{" "}
            {info.sync?.lastSyncedAt
              ? new Date(info.sync.lastSyncedAt).toLocaleString()
              : "Never"}
          </span>
          <span className="kpi-title">Tracked emails: {info.count}</span>
        </div>
      )}
      {message && <p className="status-text">{message}</p>}
    </div>
  );
}
