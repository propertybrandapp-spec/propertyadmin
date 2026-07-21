import { supabase, safeQuery } from "./supabaseClient";

// ── Agents Data Layer ─────────────────────────────────────────────────────────

export function normalizeAgent(row) {
  return {
    id: row.id,
    dbId: row.id,
    name: row.name,
    agency: row.agency,
    phone: row.phone,
    email: row.email,
    city: row.city,
    experience: row.experience,
    reraNumber: row.rera_number,
    tier: row.tier,
    status: row.status,           // 'Pending' | 'Verified' | 'Suspended'
    deals: row.deals_closed || 0,
    since: row.member_since || "—",
    rating: Number(row.rating) || 0,
    createdAt: row.created_at,
  };
}

export async function fetchAdminAgents() {
  const { data, error } = await safeQuery(
    supabase.from("agents").select("*").order("created_at", { ascending: false })
  );
  if (error) return { data: [], error };
  return { data: (data || []).map(normalizeAgent), error: null };
}

// Public-facing (homepage "Preferred Agents", /agents page) — only Verified
// agents are shown, matching the "Public can view verified agents" RLS policy.
export async function fetchPublicAgents() {
  const { data, error } = await safeQuery(
    supabase.from("agents").select("*").eq("status", "Verified").order("rating", { ascending: false })
  );
  if (error) return { data: [], error };
  return { data: (data || []).map(normalizeAgent), error: null };
}

export async function updateAgentStatus(id, status) {
  const { data, error } = await safeQuery(
    supabase.from("agents").update({ status }).eq("id", id).select().single()
  );
  if (error) return { data: null, error };
  return { data: normalizeAgent(data), error: null };
}

export async function createAgent(agent) {
  const payload = {
    name: agent.name,
    agency: agent.agency || null,
    phone: agent.phone,
    email: agent.email,
    city: agent.city || null,
    experience: agent.experience || null,
    rera_number: agent.reraNumber || null,
    tier: agent.tier || "Associate",
    status: agent.status || "Pending",
    member_since: agent.since || new Date().getFullYear().toString(),
  };
  const { data, error } = await safeQuery(supabase.from("agents").insert(payload).select().single());
  if (error) return { data: null, error };
  return { data: normalizeAgent(data), error: null };
}

export async function deleteAgent(id) {
  const { error } = await safeQuery(supabase.from("agents").delete().eq("id", id));
  return { error };
}

// Used by the public "Become a Channel Partner" form (ChannelPartner.jsx).
// RLS only allows inserting with status='Pending' — applicants can never
// self-approve.
export async function submitPartnerApplication({ name, phone, email, city, experience, reraNumber }) {
  const { error } = await safeQuery(
    supabase.from("agents").insert({
      name,
      phone,
      email,
      city: city || null,
      experience: experience || null,
      rera_number: reraNumber || null,
      tier: "Associate",
      status: "Pending",
      member_since: new Date().getFullYear().toString(),
    })
  );
  return { error };
}
