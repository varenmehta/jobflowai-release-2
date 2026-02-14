"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  href?: string | null;
  read: boolean;
  createdAt: string;
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.items ?? []);
    setUnreadCount(data.unreadCount ?? 0);
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const markRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);
  };

  const label = useMemo(() => (unreadCount > 99 ? "99+" : String(unreadCount)), [unreadCount]);

  return (
    <div className="notif-wrap" ref={wrapRef}>
      <button type="button" className="icon-btn" aria-label="Notifications" onClick={() => setOpen((v) => !v)}>
        <Bell size={16} />
        {unreadCount > 0 && <span className="notif-badge">{label}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-head">
            <strong>Notifications</strong>
            <button type="button" className="btn btn-secondary btn-sm" onClick={markAllRead}>
              Mark all read
            </button>
          </div>
          <div className="notif-list">
            {items.length === 0 && <p className="kpi-title">No notifications yet.</p>}
            {items.map((item) => (
              <div key={item.id} className={`notif-item ${item.read ? "read" : ""}`}>
                <div>
                  <p className="notif-title">{item.title}</p>
                  {item.body && <p className="kpi-title">{item.body}</p>}
                </div>
                <div className="notif-actions">
                  {item.href ? (
                    <Link href={item.href} onClick={() => markRead(item.id)}>
                      Open
                    </Link>
                  ) : null}
                  {!item.read && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => markRead(item.id)}>
                      Read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
