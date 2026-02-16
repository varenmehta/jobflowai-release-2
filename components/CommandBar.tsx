"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CommandItem = {
  id: string;
  label: string;
  hint: string;
  run: () => void;
};

const SOUND_PREF_KEY = "jobflow_sound_feedback";

export default function CommandBar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(false);

  useEffect(() => {
    const value = window.localStorage.getItem(SOUND_PREF_KEY);
    setSoundEnabled(value === "on");
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("jobflow:command-open", onOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("jobflow:command-open", onOpen);
    };
  }, []);

  const items: CommandItem[] = useMemo(
    () => [
      { id: "job", label: "Jump to job board", hint: "Open jobs", run: () => router.push("/jobs") },
      { id: "pipeline", label: "Jump to application pipeline", hint: "Open pipeline", run: () => router.push("/pipeline") },
      { id: "add-job", label: "Add new job", hint: "Post or import role", run: () => router.push("/jobs") },
      {
        id: "copilot",
        label: "Ask Copilot",
        hint: "Open AI panel",
        run: () => window.dispatchEvent(new CustomEvent("jobflow:copilot-open")),
      },
      {
        id: "autopilot",
        label: "Run Autopilot",
        hint: "Generate next actions",
        run: () => window.dispatchEvent(new CustomEvent("jobflow:copilot-autopilot")),
      },
    ],
    [router],
  );

  const filtered = items.filter((item) => {
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return item.label.toLowerCase().includes(term) || item.hint.toLowerCase().includes(term);
  });

  const runItem = (item: CommandItem) => {
    item.run();
    setOpen(false);
    setQuery("");
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    window.localStorage.setItem(SOUND_PREF_KEY, next ? "on" : "off");
  };

  if (!open) return null;

  return (
    <div className="command-overlay" role="dialog" aria-modal>
      <button type="button" aria-label="Close command bar" className="command-backdrop" onClick={() => setOpen(false)} />
      <div className="command-shell glass-card reveal">
        <div className="command-head">
          <input
            autoFocus
            className="command-input"
            placeholder="Jump to job, application, copilot actions..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="button" className="btn btn-secondary btn-sm" onClick={toggleSound}>
            Sound {soundEnabled ? "ON" : "OFF"}
          </button>
        </div>
        <div className="command-list">
          {filtered.map((item) => (
            <button key={item.id} type="button" className="command-item" onClick={() => runItem(item)}>
              <span>{item.label}</span>
              <small>{item.hint}</small>
            </button>
          ))}
          {!filtered.length ? <p className="kpi-title">No matching actions.</p> : null}
        </div>
      </div>
    </div>
  );
}
