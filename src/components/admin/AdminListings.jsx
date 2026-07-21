import { useState, useEffect } from "react";
import AdminLayout from "./AdminLayout";
import { fetchAdminListings, updateListingStatus, deleteListing } from "../../lib/listings";

// ── Data ──────────────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  Live: { bg: "#EAF8EC", color: "#16a34a" },
  Pending: { bg: "#FDF1E5", color: "#E87C02" },
  Flagged: { bg: "#FCEAEA", color: "#BA0D0B" },
  Rejected: { bg: "#F2F4F6", color: "#495057" },
};

const FILTER_TABS = ["All", "Live", "Pending", "Flagged", "Rejected"];

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.Pending;
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

// ── Action Menu ───────────────────────────────────────────────────────────────
function ActionMenu({ listing, onEdit, onApprove, onFlag, onDelete }) {
  const [open, setOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
        style={{ color: "#495057" }}
        onMouseEnter={(e) => e.currentTarget.style.background = "#F2F4F6"}
        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-48 rounded-xl shadow-2xl z-30 py-1 overflow-hidden"
          style={{ background: "#FFFFFF", border: "1px solid #E5E8EB" }}
          onMouseLeave={() => setConfirmingDelete(false)}
        >
          <button
            onClick={() => { setOpen(false); onEdit(listing); }}
            className="block w-full text-left px-4 py-2 text-sm transition-colors"
            style={{ color: "#15191C" }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#F2F4F6"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            Edit Listing
          </button>

          {listing.moderationStatus !== "Live" && (
            <button
              onClick={() => { setOpen(false); onApprove(listing); }}
              className="block w-full text-left px-4 py-2 text-sm transition-colors"
              style={{ color: "#16a34a" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#EAF8EC"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              Approve (Go Live)
            </button>
          )}

          {listing.moderationStatus === "Live" && (
            <button
              onClick={() => { setOpen(false); onFlag(listing); }}
              className="block w-full text-left px-4 py-2 text-sm transition-colors"
              style={{ color: "#E87C02" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#FDF1E5"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              Flag for Review
            </button>
          )}

          <div style={{ borderTop: "1px solid #E5E8EB" }} />

          {confirmingDelete ? (
            <div className="px-4 py-2.5 space-y-2">
              <p className="text-xs font-semibold" style={{ color: "#BA0D0B" }}>Delete permanently?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setOpen(false); setConfirmingDelete(false); onDelete(listing); }}
                  className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ background: "#BA0D0B", color: "#FFFFFF" }}
                >
                  Yes, delete
                </button>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ background: "#F2F4F6", color: "#495057" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="block w-full text-left px-4 py-2 text-sm font-semibold transition-colors"
              style={{ color: "#BA0D0B" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#FCEAEA"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              Delete Listing
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function AdminListings({ onNavigate, onLogout, adminProfile }) {
  const [activeFilter, setActiveFilter] = useState("All");
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [busyIds, setBusyIds] = useState([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await fetchAdminListings();
    setListings(data);
    setErrorMsg(error ? (error.message || "Couldn't load listings — check your Supabase connection (see SETUP.md).") : "");
    setLoading(false);
  }

  const filtered = listings.filter((l) => {
    if (activeFilter !== "All" && l.moderationStatus !== activeFilter) return false;
    if (search && !l.title.toLowerCase().includes(search.toLowerCase()) && !l.location.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function toggleSelect(id) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function toggleSelectAll() {
    setSelected(selected.length === filtered.length ? [] : filtered.map((l) => l.id));
  }

  const counts = {
    All: listings.length,
    Live: listings.filter((l) => l.moderationStatus === "Live").length,
    Pending: listings.filter((l) => l.moderationStatus === "Pending").length,
    Flagged: listings.filter((l) => l.moderationStatus === "Flagged").length,
    Rejected: listings.filter((l) => l.moderationStatus === "Rejected").length,
  };

  async function handleApprove(listing) {
    setBusyIds((b) => [...b, listing.id]);
    await updateListingStatus(listing.dbId, "Live");
    await load();
    setBusyIds((b) => b.filter((x) => x !== listing.id));
  }

  async function handleFlag(listing) {
    setBusyIds((b) => [...b, listing.id]);
    await updateListingStatus(listing.dbId, "Flagged");
    await load();
    setBusyIds((b) => b.filter((x) => x !== listing.id));
  }

  async function handleDelete(listing) {
    setBusyIds((b) => [...b, listing.id]);
    await deleteListing(listing.dbId, listing.images);
    await load();
    setSelected((s) => s.filter((x) => x !== listing.id));
  }

  async function handleBulkApprove() {
    await Promise.all(selected.map((id) => {
      const l = listings.find((x) => x.id === id);
      return l ? updateListingStatus(l.dbId, "Live") : null;
    }));
    setSelected([]);
    await load();
  }

  async function handleBulkDelete() {
    await Promise.all(selected.map((id) => {
      const l = listings.find((x) => x.id === id);
      return l ? deleteListing(l.dbId, l.images) : null;
    }));
    setSelected([]);
    await load();
  }

  return (
    <AdminLayout activePage="listings" onNavigate={onNavigate} onLogout={onLogout} adminProfile={adminProfile} title="Property Listings" subtitle="Manage, approve, and moderate all listings">
      <div className="space-y-5">

        {errorMsg && (
          <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: "#FCEAEA", color: "#BA0D0B" }}>
            {errorMsg}
          </div>
        )}

        {/* ── Top bar: search + add button ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div
            className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 w-full sm:w-72"
            style={{ background: "#FFFFFF", border: "1px solid #E5E8EB" }}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: "#495057" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search listings..."
              className="flex-1 text-sm bg-transparent focus:outline-none"
              style={{ color: "#15191C" }}
            />
          </div>
          <button
            onClick={() => onNavigate("listings-form", null)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{ background: "#BA0D0B", color: "#FFFFFF" }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#5C0B03"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#BA0D0B"}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Listing
          </button>
        </div>

        {/* ── Filter Tabs ── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className="shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all"
              style={{
                background: activeFilter === tab ? "#2C9DD5" : "#FFFFFF",
                color: activeFilter === tab ? "#FFFFFF" : "#495057",
                border: `1px solid ${activeFilter === tab ? "#2C9DD5" : "#E5E8EB"}`,
              }}
            >
              {tab}
              <span
                className="text-[10px] font-bold px-1.5 rounded-full"
                style={{
                  background: activeFilter === tab ? "rgba(255,255,255,0.25)" : "#F2F4F6",
                  color: activeFilter === tab ? "#FFFFFF" : "#495057",
                }}
              >
                {counts[tab]}
              </span>
            </button>
          ))}
        </div>

        {/* ── Bulk actions bar ── */}
        {selected.length > 0 && (
          <div
            className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ background: "#EAF4FB", border: "1px solid #2C9DD5" }}
          >
            <span className="text-sm font-semibold" style={{ color: "#2C9DD5" }}>
              {selected.length} listing{selected.length > 1 ? "s" : ""} selected
            </span>
            <div className="flex gap-2">
              <button onClick={handleBulkApprove} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: "#2C9DD5", color: "#FFFFFF" }}>
                Approve Selected
              </button>
              <button onClick={handleBulkDelete} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: "#FFFFFF", color: "#BA0D0B", border: "1px solid #BA0D0B" }}>
                Delete Selected
              </button>
            </div>
          </div>
        )}

        {/* ── Table ── */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E5E8EB" }}>
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" style={{ color: "#2C9DD5" }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <span className="text-sm" style={{ color: "#495057" }}>Loading listings...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "#F2F4F6", borderBottom: "1px solid #E5E8EB" }}>
                    <th className="px-5 py-3.5 text-left w-10">
                      <input
                        type="checkbox"
                        checked={selected.length === filtered.length && filtered.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded cursor-pointer accent-[#2C9DD5]"
                      />
                    </th>
                    <th className="px-3 py-3.5 text-left font-bold" style={{ color: "#15191C" }}>Property</th>
                    <th className="px-3 py-3.5 text-left font-bold hidden md:table-cell" style={{ color: "#15191C" }}>Type</th>
                    <th className="px-3 py-3.5 text-left font-bold" style={{ color: "#15191C" }}>Price</th>
                    <th className="px-3 py-3.5 text-left font-bold hidden lg:table-cell" style={{ color: "#15191C" }}>Posted By</th>
                    <th className="px-3 py-3.5 text-left font-bold hidden lg:table-cell" style={{ color: "#15191C" }}>Views</th>
                    <th className="px-3 py-3.5 text-left font-bold" style={{ color: "#15191C" }}>Status</th>
                    <th className="px-3 py-3.5 text-left font-bold hidden md:table-cell" style={{ color: "#15191C" }}>Created</th>
                    <th className="px-5 py-3.5 text-right font-bold" style={{ color: "#15191C" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((listing, i) => (
                    <tr
                      key={listing.id}
                      style={{ borderBottom: i < filtered.length - 1 ? "1px solid #F2F4F6" : "none", opacity: busyIds.includes(listing.id) ? 0.5 : 1 }}
                      className="transition-colors"
                      onMouseEnter={(e) => e.currentTarget.style.background = "#FAFBFC"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <td className="px-5 py-3.5">
                        <input
                          type="checkbox"
                          checked={selected.includes(listing.id)}
                          onChange={() => toggleSelect(listing.id)}
                          className="w-4 h-4 rounded cursor-pointer accent-[#2C9DD5]"
                        />
                      </td>
                      <td className="px-3 py-3.5">
                        <button onClick={() => onNavigate("listings-form", listing)} className="flex items-center gap-3 text-left">
                          <div
                            className="w-10 h-10 rounded-lg shrink-0 bg-cover bg-center"
                            style={{ background: listing.images?.[0] ? `url(${listing.images[0]}) center/cover` : "#F2F4F6" }}
                          />
                          <div className="min-w-0">
                            <p className="font-semibold truncate" style={{ color: "#15191C" }}>{listing.title}</p>
                            <p className="text-xs truncate" style={{ color: "#495057" }}>{listing.location}</p>
                          </div>
                        </button>
                      </td>
                      <td className="px-3 py-3.5 hidden md:table-cell" style={{ color: "#495057" }}>{listing.type}</td>
                      <td className="px-3 py-3.5 font-bold" style={{ color: "#15191C" }}>{listing.price}</td>
                      <td className="px-3 py-3.5 hidden lg:table-cell" style={{ color: "#495057" }}>{listing.postedBy}</td>
                      <td className="px-3 py-3.5 hidden lg:table-cell" style={{ color: "#495057" }}>{(listing.views || 0).toLocaleString()}</td>
                      <td className="px-3 py-3.5"><StatusBadge status={listing.moderationStatus} /></td>
                      <td className="px-3 py-3.5 hidden md:table-cell" style={{ color: "#495057" }}>
                        {listing.createdAt ? new Date(listing.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <ActionMenu
                          listing={listing}
                          onEdit={(l) => onNavigate("listings-form", l)}
                          onApprove={handleApprove}
                          onFlag={handleFlag}
                          onDelete={handleDelete}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && filtered.length === 0 && listings.length > 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-4xl mb-3">🔍</span>
              <p className="text-sm font-bold" style={{ color: "#15191C" }}>No listings found</p>
              <p className="text-xs mt-1" style={{ color: "#495057" }}>Try adjusting your search or filter</p>
            </div>
          )}

          {!loading && listings.length === 0 && !errorMsg && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-4xl mb-3">🏠</span>
              <p className="text-sm font-bold" style={{ color: "#15191C" }}>No listings yet</p>
              <p className="text-xs mt-1 mb-4" style={{ color: "#495057" }}>Create your first property listing to get started.</p>
              <button
                onClick={() => onNavigate("listings-form", null)}
                className="text-xs font-bold px-4 py-2 rounded-lg"
                style={{ background: "#BA0D0B", color: "#FFFFFF" }}
              >
                Add Listing
              </button>
            </div>
          )}

          {/* Footer count */}
          {!loading && filtered.length > 0 && (
            <div
              className="flex items-center justify-between px-5 py-3.5"
              style={{ borderTop: "1px solid #E5E8EB" }}
            >
              <p className="text-xs" style={{ color: "#495057" }}>
                Showing <span className="font-semibold" style={{ color: "#15191C" }}>{filtered.length}</span> of{" "}
                <span className="font-semibold" style={{ color: "#15191C" }}>{listings.length}</span> listings
              </p>
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  );
}
