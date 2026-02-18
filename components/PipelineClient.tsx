"use client";

import { useMemo, useRef, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import Drawer from "@/components/ui/Drawer";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import UISkeleton from "@/components/ui/Skeleton";
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
  { key: "GHOSTED", label: "Ghosted / Withdrawn", className: "stage-ghosted" },
  { key: "REJECTED", label: "Rejected", className: "stage-rejected" },
  { key: "WITHDRAWN", label: "Withdrawn", className: "stage-withdrawn" },
] as const;

type StageKey = (typeof stageMeta)[number]["key"];
type PersistedStage = Exclude<StageKey, "GHOSTED">;

type EditorState = {
  open: boolean;
  mode: "create" | "edit";
  applicationId?: string;
  title: string;
  companyName: string;
  source: string;
  url: string;
  description: string;
  status: StageKey;
};

function daysSince(updatedAt?: string | Date) {
  if (!updatedAt) return 0;
  const ms = Date.now() - new Date(updatedAt).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function daysInStage(updatedAt?: string | Date) {
  return `${daysSince(updatedAt)}d`;
}

function getAgingTone(updatedAt?: string | Date) {
  const days = daysSince(updatedAt);
  if (days <= 5) return "fresh";
  if (days <= 12) return "warm";
  return "risk";
}

function ghostRiskByDays(updatedAt?: string | Date) {
  const days = daysSince(updatedAt);
  const curve = 12 + 80 * (1 - Math.exp(-days / 14));
  return Math.max(8, Math.min(92, Math.round(curve)));
}

function isGhosted(item: PipelineApplication) {
  if (item.status === "OFFER" || item.status === "REJECTED" || item.status === "WITHDRAWN") return false;
  return daysSince(item.updatedAt) >= 3;
}

function displayStage(item: PipelineApplication): StageKey {
  if (isGhosted(item)) return "GHOSTED";
  return item.status;
}

function toPersistedStage(stage: StageKey): PersistedStage {
  return stage === "GHOSTED" ? "WITHDRAWN" : stage;
}

function emptyEditor(mode: "create" | "edit"): EditorState {
  return {
    open: true,
    mode,
    title: "",
    companyName: "",
    source: "Manual",
    url: "",
    description: "",
    status: "APPLIED",
  };
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
  const [editor, setEditor] = useState<EditorState>(emptyEditor("create"));
  const [savingEditor, setSavingEditor] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stageCounts = useMemo(
    () =>
      stageMeta.reduce<Record<string, number>>((acc, stage) => {
        acc[stage.key] = items.filter((item) => displayStage(item) === stage.key).length;
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

  const reload = async () => {
    const res = await fetch("/api/applications", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.applications ?? []);
  };

  const updateStatus = async (id: string, status: PersistedStage, previousStatus: PersistedStage) => {
    setMessage("Updating stage...");
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });

    if (!res.ok) {
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status: previousStatus } : item)));
      const data = await res.json().catch(() => ({}));
      setMessage(data.error ?? "Failed to update stage. Rolled back.");
      return;
    }

    setMessage("Stage updated");
  };

  const handleDrop = async (id: string, stage: StageKey) => {
    const current = items.find((item) => item.id === id);
    const targetStatus = toPersistedStage(stage);
    if (!current || current.status === targetStatus) return;

    setHoverStage(null);
    setDroppingId(id);

    const previousStatus = current.status;
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status: targetStatus, updatedAt: new Date() } : item)));

    await updateStatus(id, targetStatus, previousStatus);

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

  const openCreate = () => {
    setEditor(emptyEditor("create"));
  };

  const openEdit = () => {
    if (!selected) return;
    setEditor({
      open: true,
      mode: "edit",
      applicationId: selected.id,
      title: selected.job.title,
      companyName: selected.job.company?.name ?? "",
      source: selected.job.source ?? "Manual",
      url: selected.job.url ?? "",
      description: selected.job.description ?? "",
      status: selected.status,
    });
  };

  const saveEditor = async () => {
    if (!editor.title.trim() || !editor.companyName.trim()) {
      setMessage("Title and company are required.");
      return;
    }

    setSavingEditor(true);
    try {
      if (editor.mode === "create") {
        const res = await fetch("/api/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: editor.title.trim(),
            companyName: editor.companyName.trim(),
            source: editor.source.trim() || "Manual",
            url: editor.url.trim() || undefined,
            description: editor.description.trim() || undefined,
            status: toPersistedStage(editor.status),
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMessage(data.error ?? "Failed to create application card.");
          return;
        }
      } else {
        const res = await fetch("/api/applications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editor.applicationId,
            title: editor.title.trim(),
            companyName: editor.companyName.trim(),
            source: editor.source.trim() || "Manual",
            url: editor.url.trim() || undefined,
            description: editor.description.trim() || undefined,
            status: toPersistedStage(editor.status),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMessage(data.error ?? "Failed to update application.");
          return;
        }
      }

      await reload();
      setEditor((prev) => ({ ...prev, open: false }));
      setMessage(editor.mode === "create" ? "Application created." : "Application updated.");
    } finally {
      setSavingEditor(false);
    }
  };

  const deleteSelected = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/applications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error ?? "Failed to delete application.");
        return;
      }
      setDrawerOpen(false);
      setSelectedId(null);
      await reload();
      setMessage("Application deleted.");
    } finally {
      setDeleting(false);
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
      <div className="form-actions" style={{ marginBottom: 12 }}>
        <Button variant="primary" onClick={openCreate}>New pipeline card</Button>
      </div>

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
                    .filter((item) => displayStage(item) === stage.key)
                    .map((item) => {
                      const ghostRisk = ghostRiskByDays(item.updatedAt);
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
                            <Badge intent="risk">Ghost Risk {ghostRisk}%</Badge>
                          </div>
                          {displayStage(item) === "GHOSTED" ? (
                            <div className="kpi-title" style={{ marginTop: 2 }}>Ghosted</div>
                          ) : null}
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
                <Badge intent="stage">{displayStage(selected)}</Badge>
                <Badge intent="risk">Ghost Risk {ghostRiskByDays(selected.updatedAt)}%</Badge>
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
                  <p><strong>Current stage:</strong> {displayStage(selected)}</p>
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
                  <Button variant="secondary" onClick={openEdit}>Edit card</Button>
                  <button type="button" className="btn btn-danger" onClick={deleteSelected} disabled={deleting}>
                    {deleting ? "Deleting..." : "Delete card"}
                  </button>
                </div>
              </Tabs.Content>
            </Tabs.Root>
          </div>
        )}
      </Drawer>

      <Drawer
        open={editor.open}
        onOpenChange={(open) => setEditor((prev) => ({ ...prev, open }))}
        title={editor.mode === "create" ? "New Pipeline Card" : "Edit Pipeline Card"}
      >
        <div className="form-grid">
          <input
            className="input"
            placeholder="Role title"
            value={editor.title}
            onChange={(e) => setEditor((prev) => ({ ...prev, title: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Company name"
            value={editor.companyName}
            onChange={(e) => setEditor((prev) => ({ ...prev, companyName: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Source (e.g. referral, website)"
            value={editor.source}
            onChange={(e) => setEditor((prev) => ({ ...prev, source: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Job URL (optional)"
            value={editor.url}
            onChange={(e) => setEditor((prev) => ({ ...prev, url: e.target.value }))}
          />
          <textarea
            className="input"
            rows={4}
            placeholder="Notes/description"
            value={editor.description}
            onChange={(e) => setEditor((prev) => ({ ...prev, description: e.target.value }))}
          />
          <select
            className="select"
            value={editor.status}
            onChange={(e) => setEditor((prev) => ({ ...prev, status: e.target.value as StageKey }))}
          >
            {stageMeta.filter((stage) => stage.key !== "GHOSTED").map((stage) => (
              <option key={stage.key} value={stage.key}>{stage.label}</option>
            ))}
          </select>
          <div className="form-actions">
            <Button variant="primary" onClick={saveEditor} disabled={savingEditor}>
              {savingEditor ? "Saving..." : editor.mode === "create" ? "Create card" : "Save changes"}
            </Button>
          </div>
        </div>
      </Drawer>
    </>
  );
}
