import { useState, useEffect } from "react";
import AdminLayout from "./AdminLayout";
import { fetchAdminLeads, updateLeadStage, deleteLead } from "../../lib/leads";

// ── Data ──────────────────────────────────────────────────────────────────────
const STAGES = ["New", "Contacted", "Site Visit", "Negotiation", "Closed Won", "Closed Lost"];

const STAGE_STYLES = {
  "New": { bg: "#EAF4FB", color: "#2C9DD5" },
  "Contacted": { bg: "#FDF1E5", color: "#E87C02" },
  "Site Visit": { bg: "#F3E8FF", color: "#a855f7" },
  "Negotiation": { bg: "#FEF9C3", color: "#ca8a04" },
  "Closed Won": { bg: "#EAF8EC", color: "#16a34a" },
  "Closed Lost": { bg: "#FCEAEA", color: "#BA0D0B" },
};

function StageBadge({ stage }) {
  const s = STAGE_STYLES[stage] || STAGE_STYLES.New;
  return <span className="text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: s.bg, color: s.color }}>{stage}</span>;
}

// ── Lead Drawer ───────────────────────────────────────────────────────────────
function LeadDrawer({ lead, onClose, onStageChange, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(21,25,28,0.5)" }} onClick={onClose}>
      <div className="w-full sm:w-96 h-full overflow-y-auto p-6" style={{ background: "#FFFFFF" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold" style={{ color: "#15191C" }}>Lead Details</h2>
          <button onClick={onClose} className="text-2xl leading-none" style={{ color: "#495057" }}>×</button>
        </div>

        <div className="mb-6">
          <p className="text-base font-bold" style={{ color: "#15191C" }}>{lead.name}</p>
          <StageBadge stage={lead.stage} />
        </div>

        <div className="space-y-3 text-sm mb-6">
          <div className="flex justify-between"><span style={{ color: "#495057" }}>Phone</span><span style={{ color: "#15191C" }}>{lead.phone}</span></div>
          {lead.email && <div className="flex justify-between"><span style={{ color: "#495057" }}>Email</span><span style={{ color: "#15191C" }}>{lead.email}</span></div>}
          {lead.interest && <div className="flex justify-between gap-4"><span style={{ color: "#495057" }} className="shrink-0">Interest</span><span className="text-right" style={{ color: "#15191C" }}>{lead.interest}</span></div>}
          {lead.budget && <div className="flex justify-between"><span style={{ color: "#495057" }}>Budget</span><span style={{ color: "#15191C" }}>{lead.budget}</span></div>}
          <div className="flex justify-between"><span style={{ color: "#495057" }}>Source</span><span style={{ color: "#15191C" }}>{lead.source}</span></div>
          <div className="flex justify-between"><span style={{ color: "#495057" }}>Assigned To</span><span style={{ color: "#15191C" }}>{lead.assignedTo}</span></div>
          <div className="flex justify-between"><span style={{ color: "#495057" }}>Received</span><span style={{ color: "#15191C" }}>{lead.date}</span></div>
        </div>

        {/* Real actions — actually opens the phone/email app */}
        <div className="flex gap-2 mb-6">
          <a href={`tel:${lead.phone}`} className="flex-1 text-center py-2.5 rounded-xl text-sm font-bold" style={{ background: "#BA0D0B", color: "#FFFFFF" }}>
            Call Now
          </a>
          {lead.email && (
            <a href={`mailto:${lead.email}`} className="flex-1 text-center py-2.5 rounded-xl text-sm font-bold" style={{ background: "#EAF4FB", color: "#2C9DD5" }}>
              Send Email
            </a>
          )}
        </div>

        <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "#495057" }}>Move to Stage</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {STAGES.map((s) => (
            <button
              key={s}
              onClick={() => onStageChange(lead, s)}
              disabled={s === lead.stage}
              className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
              style={{
                background: s === lead.stage ? (STAGE_STYLES[s] || STAGE_STYLES.New).bg : "#F2F4F6",
                color: s === lead.stage ? (STAGE_STYLES[s] || STAGE_STYLES.New).color : "#495057",
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold" style={{ color: "#BA0D0B" }}>Delete this lead?</span>
            <button onClick={() => onDelete(lead)} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: "#BA0D0B", color: "#FFFFFF" }}>Yes, delete</button>
            <button onClick={() => setConfirmDelete(false)} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: "#F2F4F6", color: "#495057" }}>Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="text-xs font-bold hover:underline" style={{ color: "#BA0D0B" }}>Delete Lead</button>
        )}
      </div>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function AdminLeads({ onNavigate, onLogout, adminProfile }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [viewingLead, setViewingLead] = useState(null);
  const [busyIds, setBusyIds] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await fetchAdminLeads();
    setLeads(data);
    setErrorMsg(error ? (error.message || "Couldn't load leads — check your Supabase connection (see SETUP.md).") : "");
    setLoading(false);
  }

  const filtered = leads.filter((l) => {
    if (activeFilter !== "All" && l.stage !== activeFilter) return false;
    if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !l.phone.includes(search)) return false;
    return true;
  });

  const counts = { All: leads.length };
  STAGES.forEach((s) => { counts[s] = leads.filter((l) => l.stage === s).length; });

  async function handleStageChange(lead, stage) {
    setBusyIds((b) => [...b, lead.id]);
    await updateLeadStage(lead.dbId, stage);
    await load();
    setBusyIds((b) => b.filter((x) => x !== lead.id));
    setViewingLead(null);
  }

  async function handleDelete(lead) {
    setBusyIds((b) => [...b, lead.id]);
    await deleteLead(lead.dbId);
    await load();
    setViewingLead(null);
  }

  return (
    <AdminLayout activePage="leads" onNavigate={onNavigate} onLogout={onLogout} adminProfile={adminProfile} title="Leads" subtitle="Track and manage inquiries from every source">
      <div className="space-y-5">

        {errorMsg && (
          <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: "#FCEAEA", color: "#BA0D0B" }}>{errorMsg}</div>
        )}

        <div
          className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 w-full sm:w-72"
          style={{ background: "#FFFFFF", border: "1px solid #E5E8EB" }}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: "#495057" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or phone..."
            className="flex-1 text-sm bg-transparent focus:outline-none" style={{ color: "#15191C" }} />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {["All", ...STAGES].map((tab) => (
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
                {counts[tab] || 0}
              </span>
            </button>
          ))}
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E5E8EB" }}>
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" style={{ color: "#2C9DD5" }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <span className="text-sm" style={{ color: "#495057" }}>Loading leads...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-4xl mb-3">📋</span>
              <p className="text-sm font-bold" style={{ color: "#15191C" }}>{leads.length === 0 ? "No leads yet" : "No leads match this filter"}</p>
              <p className="text-xs mt-1" style={{ color: "#495057" }}>
                {leads.length === 0 ? "Submissions from the Contact form and site-wide inquiry box will show up here." : "Try a different filter or search."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "#F2F4F6", borderBottom: "1px solid #E5E8EB" }}>
                    <th className="px-5 py-3.5 text-left font-bold" style={{ color: "#15191C" }}>Name</th>
                    <th className="px-3 py-3.5 text-left font-bold hidden sm:table-cell" style={{ color: "#15191C" }}>Phone</th>
                    <th className="px-3 py-3.5 text-left font-bold hidden lg:table-cell" style={{ color: "#15191C" }}>Interest</th>
                    <th className="px-3 py-3.5 text-left font-bold hidden md:table-cell" style={{ color: "#15191C" }}>Source</th>
                    <th className="px-3 py-3.5 text-left font-bold">Stage</th>
                    <th className="px-3 py-3.5 text-left font-bold hidden md:table-cell" style={{ color: "#15191C" }}>Received</th>
                    <th className="px-5 py-3.5 text-right font-bold" style={{ color: "#15191C" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead, i) => (
                    <tr key={lead.id}
                      style={{ borderBottom: i < filtered.length - 1 ? "1px solid #F2F4F6" : "none", opacity: busyIds.includes(lead.id) ? 0.5 : 1 }}
                      className="transition-colors cursor-pointer"
                      onClick={() => setViewingLead(lead)}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#FAFBFC"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <td className="px-5 py-3.5 font-semibold" style={{ color: "#15191C" }}>{lead.name}</td>
                      <td className="px-3 py-3.5 hidden sm:table-cell" style={{ color: "#495057" }}>{lead.phone}</td>
                      <td className="px-3 py-3.5 hidden lg:table-cell truncate max-w-[220px]" style={{ color: "#495057" }}>{lead.interest || "—"}</td>
                      <td className="px-3 py-3.5 hidden md:table-cell" style={{ color: "#495057" }}>{lead.source}</td>
                      <td className="px-3 py-3.5"><StageBadge stage={lead.stage} /></td>
                      <td className="px-3 py-3.5 hidden md:table-cell" style={{ color: "#495057" }}>{lead.date}</td>
                      <td className="px-5 py-3.5 text-right">
                        <a href={`tel:${lead.phone}`} onClick={(e) => e.stopPropagation()}
                          className="text-xs font-bold px-2.5 py-1.5 rounded-lg" style={{ background: "#FCEAEA", color: "#BA0D0B" }}>
                          Call
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {viewingLead && (
        <LeadDrawer lead={viewingLead} onClose={() => setViewingLead(null)} onStageChange={handleStageChange} onDelete={handleDelete} />
      )}
    </AdminLayout>
  );
}
