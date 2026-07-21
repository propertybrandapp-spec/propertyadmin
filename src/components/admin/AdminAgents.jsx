import { useState, useEffect } from "react";
import AdminLayout from "./AdminLayout";
import { fetchAdminAgents, updateAgentStatus, createAgent, deleteAgent } from "../../lib/agents";

// ── Data ──────────────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  Verified: { bg: "#EAF8EC", color: "#16a34a" },
  Pending: { bg: "#FDF1E5", color: "#E87C02" },
  Suspended: { bg: "#FCEAEA", color: "#BA0D0B" },
};
const TIER_STYLES = {
  Gold: { bg: "#FDF1E5", color: "#E87C02" },
  Silver: { bg: "#F2F4F6", color: "#495057" },
  Associate: { bg: "#EAF4FB", color: "#2C9DD5" },
};
const FILTER_TABS = ["All", "Pending", "Verified", "Suspended"];

function Badge({ style, children }) {
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: style.bg, color: style.color }}>{children}</span>;
}

// ── Add Agent Form (inline card) ──────────────────────────────────────────────
function AddAgentForm({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: "", agency: "", phone: "", email: "", city: "", tier: "Associate", status: "Verified" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!(form.name && form.phone && form.email)) { setError("Name, phone, and email are required."); return; }
    setSaving(true);
    const { error } = await createAgent(form);
    setSaving(false);
    if (error) { setError(error.message || "Failed to add agent."); return; }
    onSaved();
  }

  return (
    <div className="rounded-2xl p-5 space-y-3" style={{ background: "#FFFFFF", border: "1.5px solid #2C9DD5" }}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold" style={{ color: "#15191C" }}>Add Agent</h3>
        <button onClick={onClose} className="text-xs font-semibold" style={{ color: "#495057" }}>Cancel</button>
      </div>
      {error && <p className="text-xs font-semibold" style={{ color: "#BA0D0B" }}>{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <input placeholder="Full Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
          className="text-sm px-3.5 py-2.5 rounded-xl" style={{ border: "1px solid #E5E8EB" }} />
        <input placeholder="Agency (optional)" value={form.agency} onChange={e => setForm({ ...form, agency: e.target.value })}
          className="text-sm px-3.5 py-2.5 rounded-xl" style={{ border: "1px solid #E5E8EB" }} />
        <input placeholder="Phone *" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
          className="text-sm px-3.5 py-2.5 rounded-xl" style={{ border: "1px solid #E5E8EB" }} />
        <input placeholder="Email *" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
          className="text-sm px-3.5 py-2.5 rounded-xl" style={{ border: "1px solid #E5E8EB" }} />
        <input placeholder="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
          className="text-sm px-3.5 py-2.5 rounded-xl" style={{ border: "1px solid #E5E8EB" }} />
        <select value={form.tier} onChange={e => setForm({ ...form, tier: e.target.value })}
          className="text-sm px-3.5 py-2.5 rounded-xl" style={{ border: "1px solid #E5E8EB" }}>
          {["Associate", "Silver", "Gold"].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <button onClick={handleSave} disabled={saving}
        className="px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60"
        style={{ background: "#BA0D0B", color: "#FFFFFF" }}>
        {saving ? "Adding..." : "Add Agent"}
      </button>
    </div>
  );
}

// ── Agent Profile Drawer ──────────────────────────────────────────────────────
function AgentDrawer({ agent, onClose, onStatusChange }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(21,25,28,0.5)" }} onClick={onClose}>
      <div className="w-full sm:w-96 h-full overflow-y-auto p-6" style={{ background: "#FFFFFF" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold" style={{ color: "#15191C" }}>Agent Profile</h2>
          <button onClick={onClose} className="text-2xl leading-none" style={{ color: "#495057" }}>×</button>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold" style={{ background: "#2C9DD5", color: "#FFFFFF" }}>
            {agent.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
          </div>
          <div>
            <p className="font-bold" style={{ color: "#15191C" }}>{agent.name}</p>
            <p className="text-xs" style={{ color: "#495057" }}>{agent.agency || "Independent Agent"}</p>
          </div>
        </div>

        <div className="space-y-3 text-sm mb-6">
          <div className="flex justify-between"><span style={{ color: "#495057" }}>Phone</span><span style={{ color: "#15191C" }}>{agent.phone}</span></div>
          <div className="flex justify-between"><span style={{ color: "#495057" }}>Email</span><span style={{ color: "#15191C" }}>{agent.email}</span></div>
          {agent.city && <div className="flex justify-between"><span style={{ color: "#495057" }}>City</span><span style={{ color: "#15191C" }}>{agent.city}</span></div>}
          {agent.experience && <div className="flex justify-between"><span style={{ color: "#495057" }}>Experience</span><span style={{ color: "#15191C" }}>{agent.experience}</span></div>}
          {agent.reraNumber && <div className="flex justify-between"><span style={{ color: "#495057" }}>RERA No.</span><span style={{ color: "#15191C" }}>{agent.reraNumber}</span></div>}
          <div className="flex justify-between"><span style={{ color: "#495057" }}>Tier</span><Badge style={TIER_STYLES[agent.tier] || TIER_STYLES.Associate}>{agent.tier}</Badge></div>
          <div className="flex justify-between"><span style={{ color: "#495057" }}>Status</span><Badge style={STATUS_STYLES[agent.status] || STATUS_STYLES.Pending}>{agent.status}</Badge></div>
          <div className="flex justify-between"><span style={{ color: "#495057" }}>Deals Closed</span><span style={{ color: "#15191C" }}>{agent.deals}</span></div>
          <div className="flex justify-between"><span style={{ color: "#495057" }}>Member Since</span><span style={{ color: "#15191C" }}>{agent.since}</span></div>
        </div>

        <div className="flex flex-col gap-2">
          {agent.status !== "Verified" && (
            <button onClick={() => onStatusChange(agent, "Verified")} className="py-2.5 rounded-xl text-sm font-bold" style={{ background: "#16a34a", color: "#FFFFFF" }}>
              Approve (Verify)
            </button>
          )}
          {agent.status !== "Suspended" && (
            <button onClick={() => onStatusChange(agent, "Suspended")} className="py-2.5 rounded-xl text-sm font-bold" style={{ background: "#FCEAEA", color: "#BA0D0B" }}>
              Suspend
            </button>
          )}
          {agent.status === "Suspended" && (
            <button onClick={() => onStatusChange(agent, "Verified")} className="py-2.5 rounded-xl text-sm font-bold" style={{ background: "#EAF4FB", color: "#2C9DD5" }}>
              Reinstate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function AdminAgents({ onNavigate, onLogout, adminProfile }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [viewingAgent, setViewingAgent] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [busyIds, setBusyIds] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await fetchAdminAgents();
    setAgents(data);
    setErrorMsg(error ? (error.message || "Couldn't load agents — check your Supabase connection (see SETUP.md).") : "");
    setLoading(false);
  }

  const filtered = activeFilter === "All" ? agents : agents.filter(a => a.status === activeFilter);
  const counts = {
    All: agents.length,
    Pending: agents.filter(a => a.status === "Pending").length,
    Verified: agents.filter(a => a.status === "Verified").length,
    Suspended: agents.filter(a => a.status === "Suspended").length,
  };

  async function handleStatusChange(agent, status) {
    setBusyIds(b => [...b, agent.id]);
    await updateAgentStatus(agent.dbId, status);
    await load();
    setBusyIds(b => b.filter(x => x !== agent.id));
    setViewingAgent(null);
  }

  return (
    <AdminLayout activePage="agents" onNavigate={onNavigate} onLogout={onLogout} adminProfile={adminProfile} title="Channel Partners" subtitle="Manage agent applications and accounts">
      <div className="space-y-5">

        {errorMsg && (
          <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: "#FCEAEA", color: "#BA0D0B" }}>{errorMsg}</div>
        )}

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {FILTER_TABS.map(tab => (
              <button key={tab} onClick={() => setActiveFilter(tab)}
                className="shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all"
                style={{
                  background: activeFilter === tab ? "#2C9DD5" : "#FFFFFF",
                  color: activeFilter === tab ? "#FFFFFF" : "#495057",
                  border: `1px solid ${activeFilter === tab ? "#2C9DD5" : "#E5E8EB"}`,
                }}>
                {tab}
                <span className="text-[10px] font-bold px-1.5 rounded-full"
                  style={{ background: activeFilter === tab ? "rgba(255,255,255,0.25)" : "#F2F4F6", color: activeFilter === tab ? "#FFFFFF" : "#495057" }}>
                  {counts[tab]}
                </span>
              </button>
            ))}
          </div>
          {!showAddForm && (
            <button onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: "#BA0D0B", color: "#FFFFFF" }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Agent
            </button>
          )}
        </div>

        {showAddForm && (
          <AddAgentForm onClose={() => setShowAddForm(false)} onSaved={() => { setShowAddForm(false); load(); }} />
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" style={{ color: "#2C9DD5" }}>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
              <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <span className="text-sm" style={{ color: "#495057" }}>Loading agents...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl" style={{ background: "#FFFFFF", border: "1px solid #E5E8EB" }}>
            <span className="text-4xl mb-3">🧑‍💼</span>
            <p className="text-sm font-bold" style={{ color: "#15191C" }}>{agents.length === 0 ? "No agents yet" : "No agents match this filter"}</p>
            <p className="text-xs mt-1" style={{ color: "#495057" }}>
              {agents.length === 0 ? "Applications from the public Channel Partner form will show up here." : "Try a different filter."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(agent => (
              <div key={agent.id} className="rounded-2xl p-5 transition-opacity" style={{ background: "#FFFFFF", border: "1px solid #E5E8EB", opacity: busyIds.includes(agent.id) ? 0.5 : 1 }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "#2C9DD5", color: "#FFFFFF" }}>
                      {agent.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: "#15191C" }}>{agent.name}</p>
                      <p className="text-xs truncate" style={{ color: "#495057" }}>{agent.agency || agent.city || "Independent Agent"}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <Badge style={TIER_STYLES[agent.tier] || TIER_STYLES.Associate}>{agent.tier}</Badge>
                  <Badge style={STATUS_STYLES[agent.status] || STATUS_STYLES.Pending}>{agent.status}</Badge>
                </div>

                <div className="flex items-center justify-between text-xs mb-4" style={{ color: "#495057" }}>
                  <span>{agent.deals} deals closed</span>
                  <span>★ {agent.rating || "—"}</span>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setViewingAgent(agent)}
                    className="flex-1 py-2 rounded-lg text-xs font-bold" style={{ background: "#EAF4FB", color: "#2C9DD5" }}>
                    View Profile
                  </button>
                  {agent.status === "Suspended" ? (
                    <button onClick={() => handleStatusChange(agent, "Verified")}
                      className="flex-1 py-2 rounded-lg text-xs font-bold" style={{ background: "#EAF8EC", color: "#16a34a" }}>
                      Reinstate
                    </button>
                  ) : (
                    <button onClick={() => handleStatusChange(agent, "Suspended")}
                      className="flex-1 py-2 rounded-lg text-xs font-bold" style={{ background: "#FCEAEA", color: "#BA0D0B" }}>
                      Suspend
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {viewingAgent && (
        <AgentDrawer agent={viewingAgent} onClose={() => setViewingAgent(null)} onStatusChange={handleStatusChange} />
      )}
    </AdminLayout>
  );
}
