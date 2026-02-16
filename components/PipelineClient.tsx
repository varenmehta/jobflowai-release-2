"use client";

import { useMemo, useRef, useState } from "react";

type Application = {
  id: string;
  status: string;
  updatedAt?: string | Date;
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

type MenuState = {
  x: number;
  y: number;
  itemId: string;
} | null;

function agingBand(updatedAt?: string | Date) {
  if (!updatedAt) return "fresh";
  const date = new Date(updatedAt).getTime();
  const days = Math.floor((Date.now() - date) / (1000 * 60 * 60 * 24));
  if (days <= 5) return "fresh";
  if (days <= 12) return "warm";
  return "risk";
}

export default function PipelineClient({ applications }: { applications: Application[] }) {
  const [items, setItems] = useState(applications);
  const [message, setMessage] = useState<string>("");
  const [hoverStage, setHoverStage] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState>(null);
  const [confetti, setConfetti] = useState(false);
  const [checkBurst, setCheckBurst] = useState(false);
  const [dropStage, setDropStage] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stageCounts = useMemo(
    () =>
      stageMeta.reduce<Record<string, number>>((acc, stage) => {
        acc[stage.key] = items.filter((item) => item.status === stage.key).length;
        return acc;
      }, {}),
    [items],
  );

  const handleDrop = async (id: string, status: string) => {
    setHoverStage(null);
    setDropStage(status);
    window.setTimeout(() => setDropStage((current) => (current === status ? null : current)), 420);
    await updateStatus(id, status);
  };

  const triggerConfetti = () => {
    setConfetti(true);
    window.setTimeout(() => setConfetti(false), 900);
  };

  const triggerCheckBurst = () => {
    setCheckBurst(true);
    window.setTimeout(() => setCheckBurst(false), 520);
  };

  const updateStatus = async (id: string, status: string) => {
    setMessage("Updating pipeline...");
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
      setMessage("Stage updated.");
      if (status === "INTERVIEW") triggerCheckBurst();
      if (status === "INTERVIEW" || status === "OFFER") triggerConfetti();
    } else {
      const data = await res.json();
      setMessage(data.error ?? "Update failed");
    }
  };

  const runAction = (action: "autopilot" | "followup" | "copilot", itemId: string) => {
    const selected = items.find((item) => item.id === itemId);
    if (!selected) return;
    if (action === "autopilot") {
      setMessage(`Autopilot queued for ${selected.job.title}.`);
      window.dispatchEvent(new CustomEvent("jobflow:copilot-autopilot"));
    }
    if (action === "followup") {
      setMessage(`Follow-up draft generated for ${selected.job.company?.name ?? "this company"}.`);
    }
    if (action === "copilot") {
      setMessage("Copilot analyzing next best step...");
      window.dispatchEvent(new CustomEvent("jobflow:copilot-open"));
    }
    setMenu(null);
  };

  return (
    <>
      {confetti ? <div className="confetti-burst" aria-hidden /> : null}
      {checkBurst ? <div className="check-burst" aria-hidden>✓</div> : null}
      <div className="pipeline-grid pipeline-premium">
        {stageMeta.map((stage) => (
          <div
            className={`stage drop-zone magnetic-zone stage-${stage.key} ${hoverStage === stage.key ? "active-glow" : ""} ${dropStage === stage.key ? "drop-velocity" : ""}`}
            key={stage.key}
            onDragOver={(event) => {
              event.preventDefault();
              setHoverStage(stage.key);
            }}
            onDragLeave={() => setHoverStage(null)}
            onDrop={(event) => {
              event.preventDefault();
              const id = event.dataTransfer.getData("text/plain");
              if (id) handleDrop(id, stage.key);
            }}
          >
            <div className="stage-head">
              <h4>{stage.label}</h4>
              <span>{stageCounts[stage.key] ?? 0}</span>
            </div>
            {items
              .filter((item) => item.status === stage.key)
              .map((item) => (
                <div
                  className={`job-card job-card-premium age-${agingBand(item.updatedAt)} ${stage.key === "OFFER" ? "offer-celebration" : ""}`}
                  key={item.id}
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData("text/plain", item.id)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setMenu({ x: event.clientX, y: event.clientY, itemId: item.id });
                  }}
                  onTouchStart={(event) => {
                    longPressTimer.current = setTimeout(() => {
                      const touch = event.touches[0];
                      if (!touch) return;
                      setMenu({ x: touch.clientX, y: touch.clientY, itemId: item.id });
                    }, 420);
                  }}
                  onTouchEnd={() => {
                    if (longPressTimer.current) clearTimeout(longPressTimer.current);
                  }}
                >
                  <strong>{item.job.company?.name ?? "Unknown"}</strong>
                  <span className="kpi-title">{item.job.title}</span>
                  <span className="badge subtle">{stage.label}</span>
                </div>
              ))}
          </div>
        ))}
        {message ? <p className="kpi-title pipeline-message success-check-reveal">{message}</p> : null}
      </div>

      {menu ? (
        <div className="context-menu" style={{ top: menu.y, left: menu.x }}>
          <button type="button" onClick={() => runAction("autopilot", menu.itemId)}>Run Autopilot</button>
          <button type="button" onClick={() => runAction("followup", menu.itemId)}>Generate Follow Up</button>
          <button type="button" onClick={() => runAction("copilot", menu.itemId)}>Ask Copilot: Next step?</button>
        </div>
      ) : null}

      {menu ? <button type="button" className="context-backdrop" aria-label="Close menu" onClick={() => setMenu(null)} /> : null}
    </>
  );
}
