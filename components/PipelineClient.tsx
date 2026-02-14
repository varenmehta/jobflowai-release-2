"use client";

import { useState } from "react";

type Application = {
  id: string;
  status: string;
  job: { title: string; company?: { name: string } | null };
};

const stageMeta = [
  { key: "APPLIED", label: "Applied" },
  { key: "SCREENING", label: "Screening" },
  { key: "INTERVIEW", label: "Interview" },
  { key: "OFFER", label: "Offer" },
  { key: "REJECTED", label: "Rejected" },
  { key: "WITHDRAWN", label: "Withdrawn" },
];

export default function PipelineClient({ applications }: { applications: Application[] }) {
  const [items, setItems] = useState(applications);
  const [message, setMessage] = useState<string>("");

  const handleDrop = async (id: string, status: string) => {
    await updateStatus(id, status);
  };

  const updateStatus = async (id: string, status: string) => {
    setMessage("Updating...");
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
      setMessage("Updated.");
    } else {
      const data = await res.json();
      setMessage(data.error ?? "Update failed");
    }
  };

  return (
    <div className="pipeline-grid">
      {stageMeta.map((stage) => (
        <div
          className="stage drop-zone"
          key={stage.key}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const id = event.dataTransfer.getData("text/plain");
            if (id) handleDrop(id, stage.key);
          }}
        >
          <div className="stage-head">
            <h4>{stage.label}</h4>
            <span>{items.filter((item) => item.status === stage.key).length}</span>
          </div>
          {items
            .filter((item) => item.status === stage.key)
            .map((item) => (
              <div
                className="job-card"
                key={item.id}
                draggable
                onDragStart={(event) => event.dataTransfer.setData("text/plain", item.id)}
              >
                <strong>{item.job.company?.name ?? "Unknown"}</strong>
                <span className="kpi-title">{item.job.title}</span>
                <span className="badge subtle">{stage.label}</span>
              </div>
            ))}
        </div>
      ))}
      {message && <p className="kpi-title pipeline-message">{message}</p>}
    </div>
  );
}
