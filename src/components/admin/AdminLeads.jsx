import { useState, useEffect } from "react";
import AdminLayout from "./AdminLayout";
import { fetchAdminLeads, updateLeadStage, deleteLead } from "../../lib/leads";

// ── Data ──────────────────────────────────────────────────────────────────────
const STAGES = ["New", "Contacted", "Site Visit", "Negotiation", "Closed Won", "Closed Lost"];

const STAGE_STYLES = {
  "New": { bg: "#EFF6FF", color: "#1565C0" },
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

function ChannelBadge({ lead }) {
  const isRentReady = lead.source === "rent-ready" || (lead.interest && lead.interest.includes("[RENTREADY"));
  const isConsultation = lead.source === "book-expert" || lead.source === "consultation" || (lead.interest && lead.interest.includes("[CONSULTATION"));
  const isMembership = lead.source === "select-membership" || (lead.interest && lead.interest.includes("[SELECT MEMBERSHIP"));
  const isBuildMove = lead.source === "build-move" || (lead.interest && lead.interest.includes("[BUILD & MOVE"));
  const isManagement = lead.source === "property-management" || (lead.interest && lead.interest.includes("[PROPERTY MANAGEMENT"));
  const isPartner = lead.source === "channel-partner" || (lead.interest && lead.interest.includes("[CHANNEL PARTNER"));
  const isListing = lead.listingId || lead.source === "property-detail";

  if (isRentReady) {
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">⚡ RentReady</span>;
  }
  if (isConsultation) {
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">🛡️ Consultation</span>;
  }
  if (isMembership) {
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">✨ Membership</span>;
  }
  if (isBuildMove) {
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-800 border border-orange-200">🏗️ Build & Move</span>;
  }
  if (isManagement) {
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">🏢 Management</span>;
  }
  if (isPartner) {
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">🤝 Partner</span>;
  }
  if (isListing) {
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">🏠 Property</span>;
  }
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{lead.source || "Website"}</span>;
}

// ── Lead Drawer ───────────────────────────────────────────────────────────────
function LeadDrawer({ lead, onClose, onStageChange, onDelete, onNavigate }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isRentReady = lead.source === "rent-ready" || (lead.interest && lead.interest.includes("[RENTREADY"));
  const isConsultation = lead.source === "book-expert" || lead.source === "consultation" || (lead.interest && lead.interest.includes("[CONSULTATION"));
  const isMembership = lead.source === "select-membership" || (lead.interest && lead.interest.includes("[SELECT MEMBERSHIP"));
  const isBuildMove = lead.source === "build-move" || (lead.interest && lead.interest.includes("[BUILD & MOVE"));
  const isManagement = lead.source === "property-management" || (lead.interest && lead.interest.includes("[PROPERTY MANAGEMENT"));
  const isPartner = lead.source === "channel-partner" || (lead.interest && lead.interest.includes("[CHANNEL PARTNER"));

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(31,41,55,0.5)" }} onClick={onClose}>
      <div className="w-full sm:w-[440px] h-full overflow-y-auto p-6" style={{ background: "#FFFFFF" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold" style={{ color: "#1F2937" }}>Lead Details & Verification</h2>
          <button onClick={onClose} className="text-2xl leading-none text-gray-400 hover:text-gray-600">×</button>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-lg font-bold" style={{ color: "#1F2937" }}>{lead.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <ChannelBadge lead={lead} />
              <span className="text-xs text-gray-400">· {lead.date}</span>
            </div>
          </div>
          <StageBadge stage={lead.stage} />
        </div>

        {/* ── Specialized RentReady Application Card ── */}
        {isRentReady && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2.5 text-xs text-amber-950">
            <div className="flex items-center gap-2 font-bold text-amber-900 border-b border-amber-200 pb-1.5">
              <span>⚡</span> RentReady™ Digital Agreement Application
            </div>
            <p className="leading-relaxed whitespace-pre-wrap font-sans text-gray-800">
              {lead.interest?.replace("[RENTREADY DRAFT] ", "") || "Agreement draft submitted."}
            </p>
          </div>
        )}

        {/* ── Specialized Consultation Booking Card ── */}
        {isConsultation && (
          <div className="mb-6 p-4 rounded-2xl bg-blue-50/80 border border-blue-200 space-y-2.5 text-xs text-blue-950">
            <div className="flex items-center gap-2 font-bold text-blue-900 border-b border-blue-200 pb-1.5">
              <span>🛡️</span> Expert Consultation Appointment
            </div>
            <p className="leading-relaxed whitespace-pre-wrap font-sans text-gray-800">
              {lead.interest?.replace("[CONSULTATION BOOKING] ", "") || "Consultation appointment booked."}
            </p>
          </div>
        )}

        {/* ── Specialized Select Membership Card ── */}
        {isMembership && (
          <div className="mb-6 p-4 rounded-2xl bg-purple-50/80 border border-purple-200 space-y-2.5 text-xs text-purple-950">
            <div className="flex items-center gap-2 font-bold text-purple-900 border-b border-purple-200 pb-1.5">
              <span>✨</span> PropertyBrands Select Membership Request
            </div>
            <p className="leading-relaxed whitespace-pre-wrap font-sans text-gray-800">
              {lead.interest?.replace("[SELECT MEMBERSHIP] ", "") || "Membership tier requested."}
            </p>
          </div>
        )}

        {/* ── Specialized Build & Move Card ── */}
        {isBuildMove && (
          <div className="mb-6 p-4 rounded-2xl bg-orange-50/80 border border-orange-200 space-y-2.5 text-xs text-orange-950">
            <div className="flex items-center gap-2 font-bold text-orange-900 border-b border-orange-200 pb-1.5">
              <span>🏗️</span> Build & Move Logistics / Inspection
            </div>
            <p className="leading-relaxed whitespace-pre-wrap font-sans text-gray-800">
              {lead.interest?.replace("[BUILD & MOVE] ", "") || "Service request submitted."}
            </p>
          </div>
        )}

        {/* ── Specialized Property Management Card ── */}
        {isManagement && (
          <div className="mb-6 p-4 rounded-2xl bg-teal-50/80 border border-teal-200 space-y-2.5 text-xs text-teal-950">
            <div className="flex items-center gap-2 font-bold text-teal-900 border-b border-teal-200 pb-1.5">
              <span>🏢</span> Property Management Plan Subscription
            </div>
            <p className="leading-relaxed whitespace-pre-wrap font-sans text-gray-800">
              {lead.interest?.replace("[PROPERTY MANAGEMENT] ", "") || "Management enrollment request submitted."}
            </p>
          </div>
        )}

        {/* ── Specialized Channel Partner Card ── */}
        {isPartner && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2.5 text-xs text-emerald-950">
            <div className="flex items-center gap-2 font-bold text-emerald-900 border-b border-emerald-200 pb-1.5">
              <span>🤝</span> Channel Partner Application
            </div>
            <p className="leading-relaxed whitespace-pre-wrap font-sans text-gray-800">
              {lead.interest?.replace("[CHANNEL PARTNER] ", "") || "Partner registration submitted."}
            </p>
          </div>
        )}

        {/* ── Linked property ── */}
        {lead.listingId && (
          lead.listing ? (
            <button
              onClick={() => onNavigate("listings-form", lead.listing)}
              className="w-full text-left flex items-center gap-3 mb-6 p-3 rounded-xl transition-colors hover:shadow-sm"
              style={{ background: "#EFF6FF", border: "1px solid #1565C0" }}
            >
              <img src={lead.listing.images?.[0]} alt={lead.listing.title} className="w-14 h-14 rounded-lg object-cover shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#1565C0" }}>Property</p>
                <p className="text-sm font-bold truncate" style={{ color: "#1F2937" }}>{lead.listing.title}</p>
                <p className="text-xs truncate" style={{ color: "#6B7280" }}>
                  {lead.listing.location} · {lead.listing.price}
                  {lead.listing.bhkLabel ? ` · ${lead.listing.bhkLabel}` : ""}{lead.listing.area ? ` · ${lead.listing.area}` : ""}
                </p>
              </div>
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="#1565C0" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <div className="mb-6 p-3 rounded-xl text-xs bg-gray-100 text-gray-600">
              This lead was linked to a listing that's since been removed.
            </div>
          )
        )}

        <div className="space-y-3 text-sm mb-6 border-y border-gray-100 py-4">
          <div className="flex justify-between"><span className="text-gray-500">Phone</span><span className="font-semibold text-gray-900">{lead.phone}</span></div>
          {lead.email && <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-semibold text-gray-900">{lead.email}</span></div>}
          {!isRentReady && !isConsultation && !isMembership && !isBuildMove && !isManagement && !isPartner && lead.interest && (
            <div className="flex flex-col gap-1">
              <span className="text-gray-500 text-xs">Inquiry Message:</span>
              <p className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 leading-relaxed">{lead.interest}</p>
            </div>
          )}
          {lead.budget && <div className="flex justify-between"><span className="text-gray-500">Budget</span><span className="font-semibold text-gray-900">{lead.budget}</span></div>}
          <div className="flex justify-between"><span className="text-gray-500">Channel / Source</span><span className="font-semibold text-gray-900">{lead.source}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Assigned To</span><span className="font-semibold text-gray-900">{lead.assignedTo}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Received</span><span className="font-semibold text-gray-900">{lead.date}</span></div>
        </div>

        {/* Real actions — opens phone/email app */}
        <div className="flex gap-2 mb-6">
          <a href={`tel:${lead.phone}`} className="flex-1 text-center py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition">
            Call Client
          </a>
          <a
            href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition"
          >
            WhatsApp
          </a>
          {lead.email && (
            <a href={`mailto:${lead.email}`} className="flex-1 text-center py-2.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-800 hover:bg-blue-100 transition">
              Email
            </a>
          )}
        </div>

        <p className="text-xs font-bold uppercase tracking-wide mb-2 text-gray-500">Move to Stage</p>
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
            <span className="text-xs font-semibold text-red-600">Delete this lead?</span>
            <button onClick={() => onDelete(lead)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-600 text-white">Yes, delete</button>
            <button onClick={() => setConfirmDelete(false)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="text-xs font-bold text-red-600 hover:underline">Delete Lead</button>
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
  const [channelFilter, setChannelFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [viewingLead, setViewingLead] = useState(null);
  const [busyIds, setBusyIds] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await fetchAdminLeads();
    setLeads(data);
    setErrorMsg(error ? (error.message || "Couldn't load leads — check your connection.") : "");
    setLoading(false);
  }

  const filtered = leads.filter((l) => {
    if (activeFilter !== "All" && l.stage !== activeFilter) return false;
    if (channelFilter === "RentReady" && l.source !== "rent-ready" && !l.interest?.includes("[RENTREADY")) return false;
    if (channelFilter === "Consultation" && !["book-expert", "consultation"].includes(l.source) && !l.interest?.includes("[CONSULTATION")) return false;
    if (channelFilter === "Membership" && l.source !== "select-membership" && !l.interest?.includes("[SELECT MEMBERSHIP")) return false;
    if (channelFilter === "BuildMove" && l.source !== "build-move" && !l.interest?.includes("[BUILD & MOVE")) return false;
    if (channelFilter === "Management" && l.source !== "property-management" && !l.interest?.includes("[PROPERTY MANAGEMENT")) return false;
    if (channelFilter === "Partner" && l.source !== "channel-partner" && !l.interest?.includes("[CHANNEL PARTNER")) return false;
    if (channelFilter === "Property" && l.source !== "property-detail" && !l.listingId) return false;
    if (
      search &&
      !l.name.toLowerCase().includes(search.toLowerCase()) &&
      !l.phone.includes(search) &&
      !(l.interest || "").toLowerCase().includes(search.toLowerCase())
    ) return false;
    return true;
  });

  const stageCounts = { All: leads.length };
  STAGES.forEach((s) => { stageCounts[s] = leads.filter((l) => l.stage === s).length; });

  const channelCounts = {
    All: leads.length,
    RentReady: leads.filter((l) => l.source === "rent-ready" || l.interest?.includes("[RENTREADY")).length,
    Consultation: leads.filter((l) => ["book-expert", "consultation"].includes(l.source) || l.interest?.includes("[CONSULTATION")).length,
    Membership: leads.filter((l) => l.source === "select-membership" || l.interest?.includes("[SELECT MEMBERSHIP")).length,
    BuildMove: leads.filter((l) => l.source === "build-move" || l.interest?.includes("[BUILD & MOVE")).length,
    Management: leads.filter((l) => l.source === "property-management" || l.interest?.includes("[PROPERTY MANAGEMENT")).length,
    Partner: leads.filter((l) => l.source === "channel-partner" || l.interest?.includes("[CHANNEL PARTNER")).length,
    Property: leads.filter((l) => l.source === "property-detail" || l.listingId).length,
  };

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
    <AdminLayout activePage="leads" onNavigate={onNavigate} onLogout={onLogout} adminProfile={adminProfile} title="Leads & Inquiries" subtitle="Manage incoming client consultations, RentReady drafts & property inquiries">
      <div className="space-y-5">
        {errorMsg && (
          <div className="px-4 py-3 rounded-xl text-sm font-semibold bg-red-100 text-red-700">{errorMsg}</div>
        )}

        {/* Top Controls: Search + Channel Chips */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div
            className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 w-full sm:w-80 bg-white border border-gray-200"
          >
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by client, phone, or term..."
              className="flex-1 text-sm bg-transparent focus:outline-none text-gray-800"
            />
          </div>

          {/* Channel Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
            {[
              { id: "All", label: "All Channels" },
              { id: "RentReady", label: "⚡ RentReady" },
              { id: "Consultation", label: "🛡️ Consultations" },
              { id: "Membership", label: "✨ Memberships" },
              { id: "BuildMove", label: "🏗️ Build & Move" },
              { id: "Management", label: "🏢 Management" },
              { id: "Partner", label: "🤝 Partners" },
              { id: "Property", label: "🏠 Property Leads" },
            ].map((c) => (
              <button
                key={c.id}
                onClick={() => setChannelFilter(c.id)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition border ${
                  channelFilter === c.id
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                <span>{c.label}</span>
                <span className="ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-black">
                  {channelCounts[c.id] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Stage Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {["All", ...STAGES].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                activeFilter === tab
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
            >
              <span>{tab}</span>
              <span className={`text-[10px] font-bold px-1.5 rounded-full ${
                activeFilter === tab ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
              }`}>
                {stageCounts[tab] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Leads Table */}
        <div className="rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-gray-500">
              <svg className="w-5 h-5 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={3} opacity="0.25" />
                <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
              </svg>
              <span className="text-sm">Loading inquiries...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-4xl mb-3">📋</span>
              <p className="text-sm font-bold text-gray-900">
                {leads.length === 0 ? "No leads in database yet" : "No inquiries match this filter"}
              </p>
              <p className="text-xs mt-1 text-gray-500">
                {leads.length === 0 ? "Submissions from RentReady, Expert Consultations, and property inquiries will appear here." : "Try resetting your filter or search query."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 text-xs uppercase tracking-wider font-bold">
                    <th className="px-5 py-3.5 text-left">Client Name</th>
                    <th className="px-3 py-3.5 text-left hidden sm:table-cell">Phone</th>
                    <th className="px-3 py-3.5 text-left">Channel</th>
                    <th className="px-3 py-3.5 text-left hidden lg:table-cell">Inquiry / Details</th>
                    <th className="px-3 py-3.5 text-left">Stage</th>
                    <th className="px-3 py-3.5 text-left hidden md:table-cell">Received</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((lead) => (
                    <tr
                      key={lead.id}
                      style={{ opacity: busyIds.includes(lead.id) ? 0.5 : 1 }}
                      className="transition-colors cursor-pointer hover:bg-gray-50"
                      onClick={() => setViewingLead(lead)}
                    >
                      <td className="px-5 py-3.5 font-bold text-gray-900">{lead.name}</td>
                      <td className="px-3 py-3.5 hidden sm:table-cell text-gray-600">{lead.phone}</td>
                      <td className="px-3 py-3.5"><ChannelBadge lead={lead} /></td>
                      <td className="px-3 py-3.5 hidden lg:table-cell truncate max-w-[260px] text-gray-600">
                        {lead.listingId && <span title="Linked to a property listing">🏠 </span>}
                        {lead.interest || "—"}
                      </td>
                      <td className="px-3 py-3.5"><StageBadge stage={lead.stage} /></td>
                      <td className="px-3 py-3.5 hidden md:table-cell text-gray-500 text-xs">{lead.date}</td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`, "_blank");
                          }}
                          className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
                        >
                          WhatsApp
                        </button>
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
        <LeadDrawer
          lead={viewingLead}
          onClose={() => setViewingLead(null)}
          onStageChange={handleStageChange}
          onDelete={handleDelete}
          onNavigate={onNavigate}
        />
      )}
    </AdminLayout>
  );
}
