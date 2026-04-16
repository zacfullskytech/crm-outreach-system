"use client";

import { FormEvent, useState } from "react";

type PlatformUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export function UserManagement({ initialUsers, currentUserId }: { initialUsers: PlatformUser[]; currentUserId: string }) {
  const [users, setUsers] = useState(initialUsers);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function inviteUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") || "").trim(),
      email: String(form.get("email") || "").trim(),
      role: String(form.get("role") || "member"),
    };

    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || "Failed to save user.");
      setPending(false);
      return;
    }

    const saved = body.data as PlatformUser;
    setUsers((current) => {
      const others = current.filter((user) => user.id !== saved.id);
      return [...others, saved].sort((a, b) => a.email.localeCompare(b.email));
    });
    setMessage(
      body.inviteSkippedReason ||
      (body.invited ? `Invitation sent to ${saved.email}.` : `Saved ${saved.email}.`),
    );
    event.currentTarget.reset();
    setPending(false);
  }

  async function updateRole(id: string, role: string) {
    setPending(true);
    setMessage(null);

    const response = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || "Failed to update role.");
      setPending(false);
      return;
    }

    const updated = body.data as PlatformUser;
    setUsers((current) => current.map((user) => (user.id === updated.id ? updated : user)));
    setMessage(`Updated ${updated.email}.`);
    setPending(false);
  }

  async function deleteUser(id: string) {
    const user = users.find((entry) => entry.id === id);
    if (!user) return;
    if (!window.confirm(`Delete ${user.email} from the platform user list?`)) return;

    setPending(true);
    setMessage(null);

    const response = await fetch(`/api/users/${id}`, {
      method: "DELETE",
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || "Failed to delete user.");
      setPending(false);
      return;
    }

    setUsers((current) => current.filter((entry) => entry.id !== id));
    setMessage(`Deleted ${user.email}.`);
    setPending(false);
  }

  return (
    <div className="inline-grid">
      <div className="card subtle-card">
        <div className="record-summary-main">
          <div className="record-summary-topline">
            <h3>Access Overview</h3>
            <span className="badge badge-blue">{users.length} users</span>
          </div>
          <div className="record-meta-row">
            <span>{users.filter((user) => user.role === "admin").length} admin{users.filter((user) => user.role === "admin").length === 1 ? "" : "s"}</span>
            <span>{users.filter((user) => user.role !== "admin").length} member{users.filter((user) => user.role !== "admin").length === 1 ? "" : "s"}</span>
            <span>{users.find((user) => user.id === currentUserId)?.email || "Current operator"}</span>
          </div>
        </div>
      </div>

      <form onSubmit={inviteUser} className="inline-grid">
        <div className="form-grid">
          <div className="field">
            <label htmlFor="user-name">Name</label>
            <input id="user-name" name="name" placeholder="Team member name" />
          </div>
          <div className="field">
            <label htmlFor="user-email">Email</label>
            <input id="user-email" name="email" type="email" placeholder="name@company.com" required />
          </div>
          <div className="field">
            <label htmlFor="user-role">Role</label>
            <select id="user-role" name="role" defaultValue="member">
              <option value="member">member</option>
              <option value="admin">admin</option>
            </select>
          </div>
        </div>
        <div className="actions">
          <button className="button primary" type="submit" disabled={pending}>
            {pending ? "Saving..." : "Invite User"}
          </button>
          {message ? <span className="help">{message}</span> : null}
        </div>
        <p className="help">If Supabase email rate limits are hit, the platform user can still be saved and invited again later.</p>
      </form>

      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Added</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan={5}>No platform users yet.</td>
            </tr>
          ) : (
            users.map((user) => {
              const isSelf = user.id === currentUserId;
              const isPrimaryAdmin = user.email.toLowerCase() === "zac@fullskytech.com";
              const roleLocked = isSelf || isPrimaryAdmin;
              const deleteLocked = isSelf || isPrimaryAdmin;

              return (
                <tr key={user.id}>
                  <td>{user.name || "-"}</td>
                  <td>{user.email}</td>
                  <td>
                    <select
                      value={user.role}
                      disabled={pending || roleLocked}
                      onChange={(event) => void updateRole(user.id, event.target.value)}
                    >
                      <option value="member">member</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      type="button"
                      className="button secondary"
                      disabled={pending || deleteLocked}
                      onClick={() => void deleteUser(user.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
