"use client";

import { useMemo, useRef, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import Drawer from "@/components/ui/Drawer";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import UISkeleton from "@/components/ui/Skeleton";
import Tooltip from "@/components/ui/Tooltip";
import { motionPresets } from "@/lib/motion/presets";

export type PipelineApplication = {
  id: string;
  status: "APPLIED" | "SCREENING" | "INTERVIEW" | "OFFER" | "REJECTED" | "WITHDRAWN";
  updatedAt?: string | Date;
  createdAt?: string | Date;
  job: {
    title: string;
    source?: string | null;
    url?: string | null;
    description?: string | null;
    company?: { name: string } | null;
  };
};

const stageMeta = [
  { key: "APPLIED", label: "Applied", className: "stage-applied" },
  { key: "SCREENING", label: "Screening", className: "stage-screening" },
  { key: "INTERVIEW", label: "Interview", className: "stage-interview" },
  { key: "OFFER", label: "Offer", className: "stage-offer" },
  { key: "REJECTED", label: "Rejected", className: "stage-rejected" },
  { key: "WITHDRAWN", label: "Withdrawn", className: "stage-withdrawn" },
] as const;

type StageKey = (typeof stageMeta)[number]["key"];

function daysInStage(updatedAt?: string | Date) {
  if (!updatedAt) return "0d";
  const ms = Date.now() - new Date(updatedAt).getTime();
  return `${Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))}d`;
}

function getAgingTone(updatedAt?: string | Date) {
  const days = Number(daysInStage(updatedAt).replace("d", ""));
  if (days <= 5) return "fresh";
  if (days <= 12) return "warm";
  return "risk";
}

function deriveIntent(item: PipelineApplication) {
  const text = `${item.job.title} ${item.job.description ?? ""}`.toLowerCase();
  let score = 45;
  if (text.includes("remote") || text.includes("hybrid")) score += 10;
  if (text.includes("senior") || text.includes("lead")) score += 8;
  if (item.status === "INTERVIEW") score += 18;
  if (item.status === "OFFER") score += 30;
  return Math.min(99, score);
}

function deriveGhostRisk(item: PipelineApplication) {
  const days = Number(daysInStage(item.updatedAt).replace("d", ""));
  let risk = 16;
  if (days > 10) risk += 20;
  if (days > 20) risk += 20;
  if (!item.job.url) risk += 12;
  return Math.min(95, risk);
}

export default function PipelineClient({ applications }: { applications: PipelineApplication[] }) {
  const [items, setItems] = useState(applications);
  const [message, setMessage] = useState("");
  const [hoverStage, setHoverStage] = useState<StageKey | null>(null);
  const [droppingId, setDroppingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<PipelineApplication | null>(null);
  const [selectedTimeline, setSelectedTimeline] = useState<{ label: string; at: string }[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stageCounts = useMemo(
    () =>
      stageMeta.reduce<Record<string, number>>((acc, stage) => {
        acc[stage.key] = items.filter((item) => item.status === stage.key).length;
        return acc;
      }, {}),
    [items],
  );

  const selected = useMemo(() => {
    if (selectedDetail && selectedDetail.id === selectedId) return selectedDetail;
    return items.find((item) => item.id === selectedId) ?? null;
  }, [items, selectedDetail, selectedId]);

  const timeline = useMemo(() => {
    if (!selected) return [] as { label: string; at: string }[];
    if (selectedTimeline.length) return selectedTimeline;
    const created = selected.createdAt ? new Date(selected.createdAt) : null;
    const updated = selected.updatedAt ? new Date(selected.updatedAt) : null;
    return [
      created
        ? {
            label: "Application created",
            at: created.toLocaleString(),
          }
        : null,
      {
        label: `Current stage: ${selected.status}`,
        at: updated ? updated.toLocaleString() : "Unknown",
      },
      {
        label: "Latest activity",
        at: updated ? `${daysInStage(updated)} in current stage` : "No activity data",
      },
    ].filter(Boolean) as { label: string; at: string }[];
  }, [selected, selectedTimeline]);

  const updateStatus = async (id: string, status: StageKey, previousStatus: StageKey) => {
    setMessage("Updating stage...");
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });

    if (!res.ok) {
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status: previousStatus } : item)));
      const data = await res.json();
      setMessage(data.error ?? "Failed to update stage. Rolled back.");
      return;
    }

    setMessage("Stage updated");
  };

  const handleDrop = async (id: string, stage: StageKey) => {
    const current = items.find((item) => item.id === id);
    if (!current || current.status === stage) return;

    setHoverStage(null);
    setDroppingId(id);

    const previousStatus = current.status;
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status: stage, updatedAt: new Date() } : item)));

    await updateStatus(id, stage, previousStatus);

    window.setTimeout(() => {
      setDroppingId((value) => (value === id ? null : value));
    }, 320);
  };

  const openDrawer = async (id: string) => {
    setSelectedId(id);
    setSelectedDetail(null);
    setSelectedTimeline([]);
    setDrawerOpen(true);
    setDrawerLoading(true);
    try {
      const res = await fetch(`/api/applications/${id}`, { cache: "no-store" });
      const payload = await res.json();
      if (res.ok) {
        setSelectedDetail(payload.application);
        setSelectedTimeline(
          (payload.timeline ?? []).map((entry: { label: string; at: string }) => ({
            label: entry.label,
            at: new Date(entry.at).toLocaleString(),
          })),
        );
      }
    } finally {
      setDrawerLoading(false);
    }
  };

  const runAction = (type: "autopilot" | "followup" | "copilot") => {
    if (!selected) return;
    if (type === "autopilot") {
      setMessage(`Autopilot queued for ${selected.job.title}`);
      window.dispatchEvent(new CustomEvent("jobflow:copilot-autopilot"));
      return;
    }
    if (type === "followup") {
      setMessage(`Draft follow-up ready for ${selected.job.company?.name ?? "this role"}`);
      return;
    }
    setMessage("Copilot opened with next-step context.");
    window.dispatchEvent(new CustomEvent("jobflow:copilot-open"));
  };

  return (
    <>
      <LayoutGroup>
        <div className="pipeline-board" role="region" aria-label="Application pipeline board">
          {stageMeta.map((stage) => (
            <section
              key={stage.key}
              className={`pipeline-column ${stage.className} ${hoverStage === stage.key ? "is-drop-target" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setHoverStage(stage.key);
              }}
              onDragLeave={() => setHoverStage(null)}
              onDrop={(event) => {
                event.preventDefault();
                const id = event.dataTransfer.getData("text/plain");
                if (id) void handleDrop(id, stage.key);
              }}
            >
              <header className="pipeline-column-head">
                <h3>{stage.label}</h3>
                <span>{stageCounts[stage.key] ?? 0}</span>
              </header>

              <motion.div layout className="pipeline-column-body">
                <AnimatePresence initial={false}>
                  {items
                    .filter((item) => item.status === stage.key)
                    .map((item) => {
                      const intent = deriveIntent(item);
                      return (
                        <motion.article
                          layout
                          key={item.id}
                          className={`pipeline-card ${getAgingTone(item.updatedAt)} ${droppingId === item.id ? "settle" : ""}`}
                          draggable
                          onDragStart={(event: any) => event.dataTransfer.setData("text/plain", item.id)}
                          onClick={() => {
                            void openDrawer(item.id);
                          }}
                          onTouchStart={(event) => {
                            longPressTimer.current = setTimeout(() => {
                              void openDrawer(item.id);
                            }, 360);
                            event.stopPropagation();
                          }}
                          onTouchEnd={() => {
                            if (longPressTimer.current) clearTimeout(longPressTimer.current);
                          }}
                          initial={motionPresets.listItem.hidden}
                          animate={motionPresets.listItem.visible}
                          exit={{ opacity: 0, y: 8, transition: { duration: 0.12 } }}
                          whileHover={motionPresets.hoverLift.whileHover}
                          transition={motionPresets.hoverLift.whileHover.transition}
                        >
                          <div className="pipeline-card-company" title={item.job.company?.name ?? "Unknown company"}>
                            {item.job.company?.name ?? "Unknown company"}
                          </div>
                          <div className="pipeline-card-role" title={item.job.title}>{item.job.title}</div>
                          <div className="pipeline-card-meta">
                            <span>{daysInStage(item.updatedAt)}</span>
                            <Tooltip content="AI hiring intent score for this role">
                              <Badge intent="intent">Intent {intent}%</Badge>
                            </Tooltip>
                          </div>
                        </motion.article>
                      );
                    })}
                </AnimatePresence>
              </motion.div>
            </section>
          ))}
        </div>
      </LayoutGroup>

      {message ? <p className="status-text pipeline-status">{message}</p> : null}

      <Drawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) {
            setSelectedId(null);
            setSelectedDetail(null);
            setSelectedTimeline([]);
          }
        }}
        title="Application Detail"
      >
        {drawerLoading || !selected ? (
          <UISkeleton lines={6} />
        ) : (
          <div className="pipeline-drawer-content">
            <div className="pipeline-drawer-hero">
              <h3>{selected.job.company?.name ?? "Unknown company"}</h3>
              <p>{selected.job.title}</p>
              <div className="pipeline-drawer-badges">
                <Badge intent="stage">{selected.status}</Badge>
                <Badge intent="intent">Intent {deriveIntent(selected)}%</Badge>
                <Badge intent="risk">Ghost Risk {deriveGhostRisk(selected)}%</Badge>
              </div>
            </div>

            <Tabs.Root defaultValue="overview" className="pipeline-drawer-tabs">
              <Tabs.List className="pipeline-drawer-tablist" aria-label="Application detail tabs">
                <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
                <Tabs.Trigger value="notes">Notes</Tabs.Trigger>
                <Tabs.Trigger value="timeline">Timeline</Tabs.Trigger>
                <Tabs.Trigger value="actions">AI Actions</Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="overview" className="pipeline-drawer-tabpanel">
                <div className="pipeline-overview-grid">
                  <p><strong>Job source:</strong> {selected.job.source ?? "Unknown"}</p>
                  <p><strong>Location:</strong> {selected.job.description?.toLowerCase().includes("remote") ? "Remote" : "Not specified"}</p>
                  <p><strong>Salary:</strong> {selected.job.description?.match(/\$\d[\d,]*(?:\s*[-to]+\s*\$\d[\d,]*)?/i)?.[0] ?? "Not listed"}</p>
                  <p><strong>Applied date:</strong> {selected.createdAt ? new Date(selected.createdAt).toLocaleDateString() : "Unknown"}</p>
                  <p><strong>Current stage:</strong> {selected.status}</p>
                  <p><strong>Time in stage:</strong> {daysInStage(selected.updatedAt)}</p>
                </div>
              </Tabs.Content>

              <Tabs.Content value="notes" className="pipeline-drawer-tabpanel">
                <textarea
                  className="input"
                  rows={6}
                  placeholder="Add interview prep notes, talking points, or follow-up strategy..."
                  value={notesById[selected.id] ?? ""}
                  onChange={(event) =>
                    setNotesById((prev) => ({
                      ...prev,
                      [selected.id]: event.target.value,
                    }))
                  }
                />
              </Tabs.Content>

              <Tabs.Content value="timeline" className="pipeline-drawer-tabpanel">
                <div className="list-stack" style={{ marginTop: 0 }}>
                  {timeline.map((event) => (
                    <div key={`${event.label}-${event.at}`} className="list-row">
                      <strong>{event.label}</strong>
                      <span className="kpi-title">{event.at}</span>
                    </div>
                  ))}
                </div>
              </Tabs.Content>

              <Tabs.Content value="actions" className="pipeline-drawer-tabpanel">
                <div className="list-stack" style={{ marginTop: 0 }}>
                  <Button variant="primary" onClick={() => runAction("autopilot")}>Run Autopilot</Button>
                  <Button variant="secondary" onClick={() => runAction("followup")}>Generate follow-up draft</Button>
                  <Button variant="ghost" onClick={() => runAction("copilot")}>Ask Copilot: next step</Button>
                </div>
              </Tabs.Content>
            </Tabs.Root>
          </div>
        )}
      </Drawer>
    </>
  );
}
