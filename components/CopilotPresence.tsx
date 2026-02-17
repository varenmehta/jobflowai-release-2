"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CopilotState = "idle" | "thinking" | "ready" | "alert";

const stateOrder: CopilotState[] = ["idle", "thinking", "ready", "alert"];

export default function CopilotPresence() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stateIndex, setStateIndex] = useState(0);
  const [autopilotMode, setAutopilotMode] = useState(false);

  const state = stateOrder[stateIndex];

  useEffect(() => {
    const interval = window.setInterval(() => {
      setStateIndex((prev) => (prev + 1) % stateOrder.length);
    }, 4200);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const openListener = () => setOpen(true);
    const autopilotListener = () => {
      setOpen(true);
      setAutopilotMode(true);
    };
    window.addEventListener("jobflow:copilot-open", openListener);
    window.addEventListener("jobflow:copilot-autopilot", autopilotListener);
    return () => {
      window.removeEventListener("jobflow:copilot-open", openListener);
      window.removeEventListener("jobflow:copilot-autopilot", autopilotListener);
    };
  }, []);

  const actions = useMemo(
    () => [
      { label: "Generate next actions", run: () => router.push("/dashboard") },
      { label: "Create outreach follow-up", run: () => router.push("/pipeline") },
      { label: "Review funnel analytics", run: () => router.push("/analytics") },
      { label: "Open CRM workspace", run: () => router.push("/company") },
    ],
    [router],
  );

  return (
    <>
      <button
        type="button"
        className={`copilot-orb copilot-${state}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Open Copilot"
      >
        <span className="copilot-orb-core" />
      </button>

      {open ? (
        <section className="copilot-panel elevated-card reveal">
          <div className="list-row-head">
            <h3>Copilot</h3>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
          <p className="kpi-title">
            {autopilotMode
              ? "Autopilot ready. I found focus actions based on your current pipeline."
              : "AI is monitoring your pipeline and opportunity quality in real time."}
          </p>
          <div className="copilot-list">
            {actions.map((action) => (
              <button key={action.label} type="button" className="command-item" onClick={action.run}>
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
