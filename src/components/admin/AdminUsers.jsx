import { useState, useEffect } from "react";
import AdminLayout from "./AdminLayout";
import { fetchAdminUsers, updateAdminRole, removeAdminUser } from "../../lib/adminUsers";

const ROLE_STYLES = {
  super_admin: { bg: "#FEF3C7", color: "#F59E0B", label: "Super Admin" },
  admin: { bg: "#EFF6FF", color: "#1565C0", label: "Admin" },
  staff: { bg: "#F1F5F9", color: "#6B7280", label: "Staff" },
};

function RoleBadge({ role }) {
  const s = ROLE_STYLES[role] || ROLE_STYLES.staff;
  return <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: s.bg, color: s.color }}>{s.label}</span>;
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function AdminUsers({ onNavigate, onLogout, adminProfile }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [busyIds, setBusyIds] = useState([]);
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);
  const [copied, setCopied] = useState(false);

  const isSuperAdmin = adminProfile?.role === "super_admin";

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await fetchAdminUsers();
    setUsers(data);
    setErrorMsg(error ? (error.message || "Couldn't load admin users — check your Supabase connection (see SETUP.md).") : "");
    setLoading(false);
  }

  async function handleRoleChange(user, role) {
    setBusyIds((b) => [...b, user.id]);
    await updateAdminRole(user.dbId, role);
    await load();
    setBusyIds((b) => b.filter((x) => x !== user.id));
  }

  async function handleRemove(user) {
    setBusyIds((b) => [...b, user.id]);
    await removeAdminUser(user.dbId);
    await load();
    setConfirmRemoveId(null);
    setBusyIds((b) => b.filter((x) => x !== user.id));
  }

  const sqlSnippet = `insert into public.admin_profiles (id, full_name, role)\nvalues ('paste-the-new-users-auth-uuid-here', 'Their Name', 'staff');`;

  function copySql() {
    navigator.clipboard?.writeText(sqlSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <AdminLayout activePage="users" onNavigate={onNavigate} onLogout={onLogout} adminProfile={adminProfile} title="Admin Users" subtitle="Manage who has access to this console">
      <div className="max-w-3xl space-y-5">

        {errorMsg && (
          <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: "#FEE2E2", color: "#DC2626" }}>{errorMsg}</div>
        )}

        {/* ── Add new admin — informational, since this must happen via Supabase directly ── */}
        <div className="rounded-2xl p-6" style={{ background: "#EFF6FF", border: "1px solid #1565C0" }}>
          <h2 className="text-sm font-bold mb-2" style={{ color: "#1F2937" }}>Adding a new admin</h2>
          <p className="text-xs mb-3" style={{ color: "#6B7280" }}>
            For security, new admin accounts can't be self-service created from this console — it would let anyone
            grant themselves full access. Instead: create the person a login under{" "}
            <span className="font-semibold">Supabase Dashboard → Authentication → Users → Add User</span>, copy their UUID, then run:
          </p>
          <div className="flex items-start gap-2">
            <pre className="flex-1 text-xs p-3 rounded-lg overflow-x-auto" style={{ background: "#1F2937", color: "#EFF6FF" }}>{sqlSnippet}</pre>
            <button onClick={copySql} className="text-xs font-bold px-3 py-2 rounded-lg shrink-0" style={{ background: "#1565C0", color: "#FFFFFF" }}>
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* ── Users list ── */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" style={{ color: "#1565C0" }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <span className="text-sm" style={{ color: "#6B7280" }}>Loading admin users...</span>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "#F1F5F9" }}>
              {users.map((user) => {
                const isSelf = user.dbId === adminProfile?.id;
                return (
                  <div key={user.id} className="flex items-center justify-between gap-3 px-6 py-4 flex-wrap" style={{ opacity: busyIds.includes(user.id) ? 0.5 : 1 }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "#1565C0", color: "#FFFFFF" }}>
                        {user.initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: "#1F2937" }}>
                          {user.name} {isSelf && <span className="text-xs font-normal" style={{ color: "#6B7280" }}>(you)</span>}
                        </p>
                        <p className="text-xs" style={{ color: "#6B7280" }}>
                          Joined {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isSuperAdmin && !isSelf ? (
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user, e.target.value)}
                          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                          style={{ border: "1px solid #E2E8F0", color: "#1F2937" }}
                        >
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                      ) : (
                        <RoleBadge role={user.role} />
                      )}

                      {isSuperAdmin && !isSelf && (
                        confirmRemoveId === user.id ? (
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => handleRemove(user)} className="text-xs font-bold px-2.5 py-1.5 rounded-lg" style={{ background: "#DC2626", color: "#FFFFFF" }}>Confirm</button>
                            <button onClick={() => setConfirmRemoveId(null)} className="text-xs font-bold px-2.5 py-1.5 rounded-lg" style={{ background: "#F1F5F9", color: "#6B7280" }}>Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmRemoveId(user.id)} className="text-xs font-bold px-2.5 py-1.5 rounded-lg" style={{ background: "#FEE2E2", color: "#DC2626" }}>
                            Remove
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {!isSuperAdmin && !loading && (
          <p className="text-xs" style={{ color: "#6B7280" }}>
            Only Super Admins can change roles or remove access. Contact a Super Admin if you need changes made.
          </p>
        )}
      </div>
    </AdminLayout>
  );
}
