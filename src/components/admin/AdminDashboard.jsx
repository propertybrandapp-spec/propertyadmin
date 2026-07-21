import { useState, useEffect } from "react";
import { supabase, safeQuery } from "../../lib/supabaseClient";
import AdminLayout from "./AdminLayout";

// ── Data ──────────────────────────────────────────────────────────────────────

// Static visual config (icon/color) — paired with live counts fetched below.
const KPI_CONFIG = [
  { key: "totalListings", label: "Total Listings", icon: "🏠", color: "#2C9DD5", bg: "#EAF4FB" },
  { key: "activeLeads", label: "Active Leads", icon: "📞", color: "#E87C02", bg: "#FDF1E5" },
  { key: "revenue", label: "Revenue (MTD)", icon: "💰", color: "#4ade80", bg: "#EAF8EC" },
  { key: "pendingApprovals", label: "Pending Approvals", icon: "⏳", color: "#BA0D0B", bg: "#FCEAEA" },
];

const TYPE_COLORS = { Apartment: "#2C9DD5", Villa: "#E87C02", Plot: "#BA0D0B", Commercial: "#4ade80" };

// ── Bar Chart (lightweight, no deps) ──────────────────────────────────────────
function MiniBarChart({ data, labels }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-2 h-40">
      {data.map((val, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
          <div className="w-full flex flex-col items-center justify-end h-32 relative">
            <div
              className="w-full rounded-t-md transition-all duration-300 group-hover:opacity-80"
              style={{
                height: `${(val / max) * 100}%`,
                background: i === data.length - 1 ? "#2C9DD5" : "#EAF4FB",
              }}
            />
          </div>
          <span className="text-[10px]" style={{ color: "#495057" }}>{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

// ── Donut (lightweight) ────────────────────────────────────────────────────────
function MiniDonut({ segments, total }) {
  let cumulative = 0;
  return (
    <div className="flex items-center gap-6">
      <div className="relative w-32 h-32 shrink-0">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#F2F4F6" strokeWidth="3.5" />
          {segments.map((seg) => {
            const offset = cumulative;
            cumulative += seg.value;
            return (
              <circle
                key={seg.label}
                cx="18" cy="18" r="15.9" fill="none"
                stroke={seg.color} strokeWidth="3.5"
                strokeDasharray={`${seg.value} ${100 - seg.value}`}
                strokeDashoffset={`-${offset}`}
                strokeLinecap="round"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xl font-extrabold" style={{ color: "#15191C" }}>{total}</p>
          <p className="text-[10px]" style={{ color: "#495057" }}>Total</p>
        </div>
      </div>
      <div className="space-y-2 flex-1">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: seg.color }} />
            <span className="text-xs flex-1" style={{ color: "#15191C" }}>{seg.label}</span>
            <span className="text-xs font-bold" style={{ color: "#495057" }}>{seg.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function AdminDashboard({ onNavigate, onLogout, adminProfile }) {
  const [period, setPeriod] = useState("This Month");
  const [kpis, setKpis] = useState({ totalListings: 0, activeLeads: 0, revenue: "₹0", pendingApprovals: 0 });
  const [recentActivity, setRecentActivity] = useState([]);
  const [topListings, setTopListings] = useState([]);
  const [typeSegments, setTypeSegments] = useState([]);
  const [monthlyGrowth, setMonthlyGrowth] = useState({ data: [0,0,0,0,0,0,0,0,0,0,0,0], labels: [], thisMonth: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);

    // Total listings count
    const { count: totalListings } = await safeQuery(
      supabase.from("listings").select("*", { count: "exact", head: true })
    );

    // Active leads (everything not closed)
    const { count: activeLeads } = await safeQuery(
      supabase.from("leads").select("*", { count: "exact", head: true }).not("stage", "in", '("Closed Won","Closed Lost")')
    );

    // Pending approvals
    const { count: pendingApprovals } = await safeQuery(
      supabase.from("listings").select("*", { count: "exact", head: true }).eq("status", "Pending")
    );

    // Top 4 listings by views
    const { data: topListingsData } = await safeQuery(
      supabase.from("listings").select("title, location, price_label, views").eq("status", "Live").order("views", { ascending: false }).limit(4)
    );

    // All listings' type + created_at — powers the "Listings by Type" donut
    // and the "Listings Growth" bar chart below, both computed from real data.
    const { data: allListingsMeta } = await safeQuery(
      supabase.from("listings").select("property_type, created_at")
    );

    // Recent leads as a simple activity feed (extend with a dedicated
    // activity_log table later if you want richer event tracking)
    const { data: recentLeadsData } = await safeQuery(
      supabase.from("leads").select("name, interest, created_at, stage").order("created_at", { ascending: false }).limit(6)
    );

    setKpis({
      totalListings: totalListings || 0,
      activeLeads: activeLeads || 0,
      revenue: "₹0",  // wire this to a real revenue/transactions table when you build one
      pendingApprovals: pendingApprovals || 0,
    });

    setTopListings(
      (topListingsData || []).map((l) => ({
        title: l.title,
        location: l.location,
        price: l.price_label,
        views: l.views?.toLocaleString() || "0",
        leads: 0, // join against leads.listing_id once you start linking leads to listings
      }))
    );

    setRecentActivity(
      (recentLeadsData || []).map((l) => ({
        text: `New lead — ${l.name}${l.interest ? `, ${l.interest}` : ""}`,
        time: new Date(l.created_at).toLocaleString(),
        color: l.stage === "New" ? "#2C9DD5" : "#4ade80",
      }))
    );

    // ── Listings by Type (real counts, not fabricated percentages) ──
    const meta = allListingsMeta || [];
    const typeCounts = {};
    meta.forEach((l) => { typeCounts[l.property_type] = (typeCounts[l.property_type] || 0) + 1; });
    const totalForPct = meta.length || 1;
    setTypeSegments(
      Object.entries(typeCounts).map(([label, count]) => ({
        label,
        value: Math.round((count / totalForPct) * 100),
        color: TYPE_COLORS[label] || "#495057",
      }))
    );

    // ── Listings Growth — real new-listings-per-month for the last 12 months ──
    const now = new Date();
    const buckets = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-US", { month: "short" }), count: 0 });
    }
    meta.forEach((l) => {
      if (!l.created_at) return;
      const d = new Date(l.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = buckets.find((b) => b.key === key);
      if (bucket) bucket.count += 1;
    });
    setMonthlyGrowth({
      data: buckets.map((b) => b.count),
      labels: buckets.map((b) => b.label),
      thisMonth: buckets[buckets.length - 1].count,
    });

    setLoading(false);
  }

  return (
    <AdminLayout activePage="dashboard" onNavigate={onNavigate} onLogout={onLogout} adminProfile={adminProfile} title="Dashboard" subtitle="Overview of platform performance">
      <div className="space-y-6">

        {/* ── Period Filter ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm" style={{ color: "#495057" }}>Welcome back, here's what's happening today.</p>
          <div className="flex gap-2">
            {["Today", "This Week", "This Month", "This Year"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: period === p ? "#2C9DD5" : "#FFFFFF",
                  color: period === p ? "#FFFFFF" : "#495057",
                  border: `1px solid ${period === p ? "#2C9DD5" : "#E5E8EB"}`,
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {KPI_CONFIG.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-2xl p-5 transition-shadow hover:shadow-lg"
              style={{ background: "#FFFFFF", border: "1px solid #E5E8EB" }}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: kpi.bg }}
                >
                  {kpi.icon}
                </div>
                {loading ? (
                  <span className="text-xs px-2 py-1 rounded-full" style={{ background: "#F2F4F6", color: "#495057" }}>...</span>
                ) : null}
              </div>
              <p className="text-2xl font-extrabold" style={{ color: "#15191C" }}>
                {loading ? "—" : (kpi.key === "revenue" ? kpis[kpi.key] : kpis[kpi.key]?.toLocaleString())}
              </p>
              <p className="text-sm mt-1" style={{ color: "#495057" }}>{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* ── Charts Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Bar chart */}
          <div
            className="lg:col-span-2 rounded-2xl p-6"
            style={{ background: "#FFFFFF", border: "1px solid #E5E8EB" }}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold" style={{ color: "#15191C" }}>Listings Growth</h3>
                <p className="text-xs mt-0.5" style={{ color: "#495057" }}>Monthly new listings added</p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: "#EAF4FB", color: "#2C9DD5" }}>
                +{monthlyGrowth.thisMonth} this month
              </span>
            </div>
            <MiniBarChart data={monthlyGrowth.data} labels={monthlyGrowth.labels} />
          </div>

          {/* Donut */}
          <div
            className="rounded-2xl p-6"
            style={{ background: "#FFFFFF", border: "1px solid #E5E8EB" }}
          >
            <h3 className="text-base font-bold mb-1" style={{ color: "#15191C" }}>Listings by Type</h3>
            <p className="text-xs mb-5" style={{ color: "#495057" }}>Distribution across categories</p>
            {typeSegments.length === 0 ? (
              <p className="text-sm py-8 text-center" style={{ color: "#495057" }}>No listings yet</p>
            ) : (
              <MiniDonut segments={typeSegments} total={kpis.totalListings} />
            )}
          </div>
        </div>

        {/* ── Activity + Top Listings ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Recent Activity */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E5E8EB" }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #E5E8EB" }}>
              <h3 className="text-base font-bold" style={{ color: "#15191C" }}>Recent Activity</h3>
              <button onClick={() => onNavigate("leads")} className="text-xs font-semibold" style={{ color: "#2C9DD5" }}>View all</button>
            </div>
            {recentActivity.length === 0 ? (
              <p className="text-sm py-10 text-center" style={{ color: "#495057" }}>{loading ? "Loading..." : "No recent activity yet"}</p>
            ) : (
              <div>
                {recentActivity.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 px-6 py-3.5"
                    style={{ borderBottom: i < recentActivity.length - 1 ? "1px solid #F2F4F6" : "none" }}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: item.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm" style={{ color: "#15191C" }}>{item.text}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#495057" }}>{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Listings */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E5E8EB" }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #E5E8EB" }}>
              <h3 className="text-base font-bold" style={{ color: "#15191C" }}>Top Performing Listings</h3>
              <button
                onClick={() => onNavigate("listings")}
                className="text-xs font-semibold"
                style={{ color: "#2C9DD5" }}
              >
                View all
              </button>
            </div>
            {topListings.length === 0 ? (
              <p className="text-sm py-10 text-center" style={{ color: "#495057" }}>{loading ? "Loading..." : "No live listings yet"}</p>
            ) : (
              <div>
                {topListings.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 px-6 py-3.5"
                    style={{ borderBottom: i < topListings.length - 1 ? "1px solid #F2F4F6" : "none" }}
                  >
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: "#F2F4F6", color: "#495057" }}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "#15191C" }}>{item.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#495057" }}>{item.location} · {item.price}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold" style={{ color: "#2C9DD5" }}>{item.views} views</p>
                      <p className="text-xs mt-0.5" style={{ color: "#495057" }}>{item.leads} leads</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
