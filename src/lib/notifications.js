import { supabase, safeQuery } from "./supabaseClient";
import { getNotificationPrefs } from "./notificationPrefs";

// There's no dedicated notifications table (yet) — this synthesizes a real,
// live feed from the handful of things an admin actually needs a heads-up
// about, using data that already exists: new leads, agents waiting on
// verification, and listings waiting on approval. Categories can be toggled
// off in Settings (see notificationPrefs.js).
//
// Note: "read" state is kept in memory in AdminLayout (not persisted) since
// there's nowhere to store per-admin read receipts yet — it resets on
// refresh. Good enough for now; move to a real notifications table if you
// want read receipts to survive a reload.

const LOOKBACK_HOURS = 48;

export async function fetchNotifications() {
  const prefs = getNotificationPrefs();
  const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();

  const [leadsRes, agentsRes, listingsRes] = await Promise.all([
    prefs.leads
      ? safeQuery(
          supabase.from("leads").select("id, name, interest, created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(5)
        )
      : Promise.resolve({ data: [] }),
    prefs.agents
      ? safeQuery(
          supabase.from("agents").select("id, name, created_at").eq("status", "Pending").order("created_at", { ascending: false }).limit(5)
        )
      : Promise.resolve({ data: [] }),
    prefs.listings
      ? safeQuery(
          supabase.from("listings").select("id, title, created_at").eq("status", "Pending").order("created_at", { ascending: false }).limit(5)
        )
      : Promise.resolve({ data: [] }),
  ]);

  const items = [];

  (leadsRes.data || []).forEach((l) => {
    items.push({
      id: `lead-${l.id}`,
      text: `New lead — ${l.name}${l.interest ? `, ${l.interest}` : ""}`,
      time: l.created_at,
      page: "leads",
    });
  });

  (agentsRes.data || []).forEach((a) => {
    items.push({
      id: `agent-${a.id}`,
      text: `${a.name} requested agent verification`,
      time: a.created_at,
      page: "agents",
    });
  });

  const pendingListings = listingsRes.data || [];
  if (pendingListings.length > 0) {
    items.push({
      id: "listings-pending",
      text: `${pendingListings.length} ${pendingListings.length === 1 ? "property" : "properties"} pending approval`,
      time: pendingListings[0].created_at,
      page: "listings",
    });
  }

  items.sort((a, b) => new Date(b.time) - new Date(a.time));
  return items.slice(0, 8);
}

// "5 min ago" / "2 hours ago" / "3 days ago" style relative time
export function formatRelativeTime(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
}
