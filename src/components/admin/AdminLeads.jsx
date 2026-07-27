import { useState, useEffect } from "react";
import AdminLayout from "./AdminLayout";
import { fetchAdminLeads, updateLeadStage, deleteLead } from "../../lib/leads";

// ── Data ──────────────────────────────────────────────────────────────────────
const STAGES = ["New", "Contacted", "Site Visit", "Negotiation", "Closed Won", "Closed Lost"];

const STAGE_STYLES = {
  "New": { bg: "#EFF6FF", color: "#1E88E5" },
  "Contacted": { bg: "#FEF3C7", color: "#F59E0B" },
  "Site Visit": { bg: "#F3E8FF", color: "#a855f7" },
  "Negotiation": { bg: "#FEF9C3", color: "#ca8a04" },
  "Closed Won": { bg: "#F0FDF4", color: "#16A34A" },
  "Closed Lost": { bg: "#FEE2E2", color: "#DC2626" },
};

function StageBadge({ stage }) {
  const s = STAGE_STYLES[stage] || STAGE_STYLES.New;
  return <span className="text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: s.bg, color: s.color }}>{stage}</span>;
}

// ── Lead Drawer ───────────────────────────────────────────────────────────────
function LeadDrawer({ lead, onClose, onStageChange, onDelete, onNavigate }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(31,41,55,0.5)" }} onClick={onClose}>
      <div className="w-full sm:w-96 h-full overflow-y-auto p-6" style={{ background: "#FFFFFF" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold" style={{ color: "#1F2937" }}>Lead Details</h2>
          <button onClick={onClose} className="text-2xl leading-none" style={{ color: "#6B7280" }}>×</button>
        </div>

        <div className="mb-6">
          <p className="text-base font-bold" style={{ color: "#1F2937" }}>{lead.name}</p>
          <StageBadge stage={lead.stage} />
        </div>

        {/* ── Linked property — exactly which listing this lead is about,
            with real specs/photo, not just a text blurb. ── */}
        {lead.listingId && (
          lead.listing ? (
            <button
              onClick={() => onNavigate("listings-form", lead.listing)}
              className="w-full text-left flex items-center gap-3 mb-6 p-3 rounded-xl transition-colors"
              style={{ background: "#EFF6FF", border: "1px solid #1E88E5" }}
            >
              <img src={lead.listing.images?.[0]} alt={lead.listing.title} className="w-14 h-14 rounded-lg object-cover shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#1E88E5" }}>Property</p>
                <p className="text-sm font-bold truncate" style={{ color: "#1F2937" }}>{lead.listing.title}</p>
                <p className="text-xs truncate" style={{ color: "#6B7280" }}>
                  {lead.listing.location} · {lead.listing.price}
                  {lead.listing.bhkLabel ? ` · ${lead.listing.bhkLabel}` : ""}{lead.listing.area ? ` · ${lead.listing.area}` : ""}
                </p>
              </div>
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="#1E88E5" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <div className="mb-6 p-3 rounded-xl text-xs" style={{ background: "#F1F5F9", color: "#6B7280" }}>
              This lead was linked to a listing that's since been removed.
            </div>
          )
        )}

        <div className="space-y-3 text-sm mb-6">
          <div className="flex justify-between"><span style={{ color: "#6B7280" }}>Phone</span><span style={{ color: "#1F2937" }}>{lead.phone}</span></div>
          {lead.email && <div className="flex justify-between"><span style={{ color: "#6B7280" }}>Email</span><span style={{ color: "#1F2937" }}>{lead.email}</span></div>}
          {lead.interest && <div className="flex justify-between gap-4"><span style={{ color: "#6B7280" }} className="shrink-0">Interest</span><span className="text-right" style={{ color: "#1F2937" }}>{lead.interest}</span></div>}
          {lead.budget && <div className="flex justify-between"><span style={{ color: "#6B7280" }}>Budget</span><span style={{ color: "#1F2937" }}>{lead.budget}</span></div>}
          <div className="flex justify-between"><span style={{ color: "#6B7280" }}>Source</span><span style={{ color: "#1F2937" }}>{lead.source}</span></div>
          <div className="flex justify-between"><span style={{ color: "#6B7280" }}>Assigned To</span><span style={{ color: "#1F2937" }}>{lead.assignedTo}</span></div>
          <div className="flex justify-between"><span style={{ color: "#6B7280" }}>Received</span><span style={{ color: "#1F2937" }}>{lead.date}</span></div>
        </div>

        {/* Real actions — actually opens the phone/email app */}
        <div className="flex gap-2 mb-6">
          <a href={`tel:${lead.phone}`} className="flex-1 text-center py-2.5 rounded-xl text-sm font-bold" style={{ background: "#1E88E5", color: "#FFFFFF" }}>
            Call Now
          </a>
          {lead.email && (
            <a href={`mailto:${lead.email}`} className="flex-1 text-center py-2.5 rounded-xl text-sm font-bold" style={{ background: "#EFF6FF", color: "#1E88E5" }}>
              Send Email
            </a>
          )}
        </div>

        <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "#6B7280" }}>Move to Stage</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {STAGES.map((s) => (
            <button
              key={s}
              onClick={() => onStageChange(lead, s)}
              disabled={s === lead.stage}
              className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
              style={{
                background: s === lead.stage ? (STAGE_STYLES[s] || STAGE_STYLES.New).bg : "#F1F5F9",
                color: s === lead.stage ? (STAGE_STYLES[s] || STAGE_STYLES.New).color : "#6B7280",
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold" style={{ color: "#DC2626" }}>Delete this lead?</span>
            <button onClick={() => onDelete(lead)} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: "#DC2626", color: "#FFFFFF" }}>Yes, delete</button>
            <button onClick={() => setConfirmDelete(false)} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: "#F1F5F9", color: "#6B7280" }}>Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="text-xs font-bold hover:underline" style={{ color: "#DC2626" }}>Delete Lead</button>
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
          <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: "#FEE2E2", color: "#DC2626" }}>{errorMsg}</div>
        )}

        <div
          className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 w-full sm:w-72"
          style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: "#6B7280" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or phone..."
            className="flex-1 text-sm bg-transparent focus:outline-none" style={{ color: "#1F2937" }} />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {["All", ...STAGES].map((tab) => (
            <button key={tab} onClick={() => setActiveFilter(tab)}
              className="shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all"
              style={{
                background: activeFilter === tab ? "#1E88E5" : "#FFFFFF",
                color: activeFilter === tab ? "#FFFFFF" : "#6B7280",
                border: `1px solid ${activeFilter === tab ? "#1E88E5" : "#E2E8F0"}`,
              }}>
              {tab}
              <span className="text-[10px] font-bold px-1.5 rounded-full"
                style={{ background: activeFilter === tab ? "rgba(255,255,255,0.25)" : "#F1F5F9", color: activeFilter === tab ? "#FFFFFF" : "#6B7280" }}>
                {counts[tab] || 0}
              </span>
            </button>
          ))}
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" style={{ color: "#1E88E5" }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <span className="text-sm" style={{ color: "#6B7280" }}>Loading leads...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-4xl mb-3">📋</span>
              <p className="text-sm font-bold" style={{ color: "#1F2937" }}>{leads.length === 0 ? "No leads yet" : "No leads match this filter"}</p>
              <p className="text-xs mt-1" style={{ color: "#6B7280" }}>
                {leads.length === 0 ? "Submissions from the Contact form and site-wide inquiry box will show up here." : "Try a different filter or search."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "#F1F5F9", borderBottom: "1px solid #E2E8F0" }}>
                    <th className="px-5 py-3.5 text-left font-bold" style={{ color: "#1F2937" }}>Name</th>
                    <th className="px-3 py-3.5 text-left font-bold hidden sm:table-cell" style={{ color: "#1F2937" }}>Phone</th>
                    <th className="px-3 py-3.5 text-left font-bold hidden lg:table-cell" style={{ color: "#1F2937" }}>Interest</th>
                    <th className="px-3 py-3.5 text-left font-bold hidden md:table-cell" style={{ color: "#1F2937" }}>Source</th>
                    <th className="px-3 py-3.5 text-left font-bold">Stage</th>
                    <th className="px-3 py-3.5 text-left font-bold hidden md:table-cell" style={{ color: "#1F2937" }}>Received</th>
                    <th className="px-5 py-3.5 text-right font-bold" style={{ color: "#1F2937" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead, i) => (
                    <tr key={lead.id}
                      style={{ borderBottom: i < filtered.length - 1 ? "1px solid #F1F5F9" : "none", opacity: busyIds.includes(lead.id) ? 0.5 : 1 }}
                      className="transition-colors cursor-pointer"
                      onClick={() => setViewingLead(lead)}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#F8FAFC"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <td className="px-5 py-3.5 font-semibold" style={{ color: "#1F2937" }}>{lead.name}</td>
                      <td className="px-3 py-3.5 hidden sm:table-cell" style={{ color: "#6B7280" }}>{lead.phone}</td>
                      <td className="px-3 py-3.5 hidden lg:table-cell truncate max-w-[220px]" style={{ color: "#6B7280" }}>
                        {lead.listingId && <span title="Linked to a property listing">🏠 </span>}
                        {lead.interest || "—"}
                      </td>
                      <td className="px-3 py-3.5 hidden md:table-cell" style={{ color: "#6B7280" }}>{lead.source}</td>
                      <td className="px-3 py-3.5"><StageBadge stage={lead.stage} /></td>
                      <td className="px-3 py-3.5 hidden md:table-cell" style={{ color: "#6B7280" }}>{lead.date}</td>
                      <td className="px-5 py-3.5 text-right">
                        <a href={`tel:${lead.phone}`} onClick={(e) => e.stopPropagation()}
                          className="text-xs font-bold px-2.5 py-1.5 rounded-lg" style={{ background: "#FEE2E2", color: "#DC2626" }}>
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
        <LeadDrawer lead={viewingLead} onClose={() => setViewingLead(null)} onStageChange={handleStageChange} onDelete={handleDelete} onNavigate={onNavigate} />
      )}
    </AdminLayout>
  );
}
