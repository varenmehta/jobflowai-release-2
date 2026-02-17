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
  const [activeIndex, setActiveIndex] = useState(0);

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
      { id: "pipeline", label: "Jump to application pipeline", hint: "Open pipeline", run: () => router.push("/pipeline") },
      { id: "analytics", label: "Open analytics", hint: "View funnel trends", run: () => router.push("/analytics") },
      { id: "crm", label: "Open CRM", hint: "Partner/company workspace", run: () => router.push("/company") },
      {
        id: "services",
        label: "Open services",
        hint: "View plans and managed support",
        run: () => router.push("/services"),
      },
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

  const dynamicItems = useMemo(() => {
    const term = query.trim();
    if (!term) return [];
    return [
      {
        id: "search-pipeline",
        label: `Search pipeline for "${term}"`,
        hint: "Open application board",
        run: () => router.push(`/pipeline?q=${encodeURIComponent(term)}`),
      },
    ] as CommandItem[];
  }, [query, router]);

  const filtered = [...dynamicItems, ...items].filter((item) => {
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return item.label.toLowerCase().includes(term) || item.hint.toLowerCase().includes(term);
  });

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

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
            placeholder="Jump to pipeline, analytics, CRM, copilot actions..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((prev) => (filtered.length ? (prev + 1) % filtered.length : 0));
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((prev) => (filtered.length ? (prev - 1 + filtered.length) % filtered.length : 0));
              }
              if (event.key === "Enter" && filtered.length) {
                event.preventDefault();
                runItem(filtered[activeIndex] ?? filtered[0]);
              }
            }}
          />
          <button type="button" className="btn btn-secondary btn-sm" onClick={toggleSound}>
            Sound {soundEnabled ? "ON" : "OFF"}
          </button>
        </div>
        <div className="command-list">
          {filtered.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={`command-item ${index === activeIndex ? "is-active" : ""}`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => runItem(item)}
            >
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
