import { supabase, safeQuery } from "./supabaseClient";

// ── Leads Data Layer ──────────────────────────────────────────────────────────
// Note: leads.assigned_to references auth.users(id) directly (not
// admin_profiles), so we resolve the assigned admin's name with a second,
// small query rather than relying on a PostgREST FK-embed that doesn't exist
// between these two tables.

function daysAgo(isoDate) {
  if (!isoDate) return null;
  const diff = Date.now() - new Date(isoDate).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function normalizeLead(row, adminsById) {
  return {
    id: row.id,
    dbId: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    interest: row.interest,
    budget: row.budget_label,
    stage: row.stage,
    source: row.source,
    assignedTo: row.assigned_to ? (adminsById[row.assigned_to]?.full_name || "Unassigned") : "Unassigned",
    assignedToId: row.assigned_to,
    listingId: row.listing_id,
    date: row.created_at ? new Date(row.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—",
    daysAgo: daysAgo(row.created_at),
    createdAt: row.created_at,
  };
}

export async function fetchAdminLeads() {
  const [{ data: leads, error }, { data: admins }] = await Promise.all([
    safeQuery(supabase.from("leads").select("*").order("created_at", { ascending: false })),
    safeQuery(supabase.from("admin_profiles").select("id, full_name")),
  ]);

  if (error) return { data: [], error };

  const adminsById = {};
  (admins || []).forEach((a) => { adminsById[a.id] = a; });

  return { data: (leads || []).map((l) => normalizeLead(l, adminsById)), error: null };
}

export async function updateLeadStage(id, stage) {
  const { data, error } = await safeQuery(
    supabase.from("leads").update({ stage, updated_at: new Date().toISOString() }).eq("id", id).select().single()
  );
  if (error) return { data: null, error };
  return { data, error: null };
}

export async function assignLead(id, adminUserId) {
  const { data, error } = await safeQuery(
    supabase.from("leads").update({ assigned_to: adminUserId, updated_at: new Date().toISOString() }).eq("id", id).select().single()
  );
  return { data, error };
}

export async function deleteLead(id) {
  const { error } = await safeQuery(supabase.from("leads").delete().eq("id", id));
  return { error };
}

// Used by public forms (ContactUs.jsx, Footer's quick inquiry) — RLS allows
// anyone, even logged-out visitors, to insert a lead.
export async function submitLead({ name, phone, email, interest, budget, source = "Website" }) {
  const { error } = await safeQuery(
    supabase.from("leads").insert({
      name,
      phone,
      email: email || null,
      interest: interest || null,
      budget_label: budget || null,
      source,
      stage: "New",
    })
  );
  return { error };
}
