"use client";

import { useMemo, useState } from "react";

type UserItem = {
  id: string;
  name: string | null;
  email: string | null;
  role: "CANDIDATE" | "PARTNER" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
};

export default function AdminUsersClient({ users }: { users: UserItem[] }) {
  const [items, setItems] = useState(users);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | UserItem["role"]>("ALL");

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [items]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return sorted.filter((user) => {
      const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
      const matchesTerm =
        !term ||
        user.name?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term);
      return matchesRole && matchesTerm;
    });
  }, [sorted, query, roleFilter]);

  const updateUser = async (userId: string, payload: Partial<Pick<UserItem, "role" | "status">>) => {
    setBusyId(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...payload }),
      });
      if (!res.ok) {
        throw new Error("Failed to update role");
      }
      setItems((prev) =>
        prev.map((user) => (user.id === userId ? { ...user, ...payload } : user)),
      );
    } catch (error) {
      console.error(error);
      alert("Unable to update role. Check permissions.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="card" style={{ marginTop: "18px" }}>
      <h3>Users</h3>
      <p className="kpi-title">Manage roles for candidates, partners, and admins.</p>
      <div className="form-actions">
        <input
          className="search"
          placeholder="Search name or email"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value as any)}
          className="select"
        >
          <option value="ALL">All roles</option>
          <option value="CANDIDATE">Candidate</option>
          <option value="PARTNER">Partner</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>
      <div className="list-stack">
        {filtered.map((user) => (
          <div key={user.id} className="list-row user-row">
            <div>
              <div><strong>{user.name ?? "Unnamed user"}</strong></div>
              <div className="kpi-title">{user.email ?? "No email"}</div>
              <div className="kpi-title">
                Joined {new Date(user.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div className="form-grid">
              <span className="kpi-title">Role</span>
              <select
                value={user.role}
                onChange={(event) =>
                  updateUser(user.id, { role: event.target.value as UserItem["role"] })
                }
                disabled={busyId === user.id}
                className="select"
              >
                <option value="CANDIDATE">Candidate</option>
                <option value="PARTNER">Partner</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="form-grid">
              <span className="kpi-title">Status</span>
              <button
                type="button"
                className={`btn btn-sm ${user.status === "ACTIVE" ? "btn-secondary" : "btn-danger"}`}
                onClick={() =>
                  updateUser(user.id, {
                    status: user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
                  })
                }
              >
                {user.status === "ACTIVE" ? "Active" : "Suspended"}
              </button>
              <span className="kpi-title">
                {busyId === user.id ? "Updating..." : " "}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
