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

    // ── Section 2H: Seller / Agent Information ──
    photoUrl: row.photo_url || null,
    areasServed: row.areas_served || [],
    responseTime: row.response_time || null,
    preferredContactMethods: row.preferred_contact_methods || [],
    availabilityNotes: row.availability_notes || null,
    phoneMaskingEnabled: !!row.phone_masking_enabled,
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
    photo_url: agent.photoUrl || null,
    areas_served: agent.areasServed || [],
    response_time: agent.responseTime || null,
    preferred_contact_methods: agent.preferredContactMethods || [],
    availability_notes: agent.availabilityNotes || null,
    phone_masking_enabled: !!agent.phoneMaskingEnabled,
  };
  const { data, error } = await safeQuery(supabase.from("agents").insert(payload).select().single());
  if (error) return { data: null, error };
  return { data: normalizeAgent(data), error: null };
}

// Full profile edit — updateAgentStatus (above) stays as the quick one-click
// moderation action; this is for editing everything else (used by the
// "Edit" flow in AdminAgents.jsx).
export async function updateAgent(id, agent) {
  const payload = {
    name: agent.name,
    agency: agent.agency || null,
    phone: agent.phone,
    email: agent.email,
    city: agent.city || null,
    experience: agent.experience || null,
    rera_number: agent.reraNumber || null,
    tier: agent.tier || "Associate",
    photo_url: agent.photoUrl || null,
    areas_served: agent.areasServed || [],
    response_time: agent.responseTime || null,
    preferred_contact_methods: agent.preferredContactMethods || [],
    availability_notes: agent.availabilityNotes || null,
    phone_masking_enabled: !!agent.phoneMaskingEnabled,
  };
  const { data, error } = await safeQuery(supabase.from("agents").update(payload).eq("id", id).select().single());
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
