import { supabase, safeQuery } from "./supabaseClient";

// ── Admin Users Data Layer ────────────────────────────────────────────────────
// Note: admin_profiles rows can only be created via direct Supabase Dashboard
// access (see the "Add a new admin" card in AdminUsers.jsx) — allowing
// self-service inserts from the client would let any signed-up user grant
// themselves full admin access, since every other table's RLS just checks
// "auth.uid() is in admin_profiles" regardless of role.

export function normalizeAdminUser(row) {
  return {
    id: row.id,
    dbId: row.id,
    name: row.full_name,
    role: row.role,
    initials: row.avatar_initials || row.full_name?.[0] || "A",
    createdAt: row.created_at,
  };
}

export async function fetchAdminUsers() {
  const { data, error } = await safeQuery(
    supabase.from("admin_profiles").select("*").order("created_at", { ascending: true })
  );
  if (error) return { data: [], error };
  return { data: (data || []).map(normalizeAdminUser), error: null };
}

export async function updateAdminRole(id, role) {
  const { data, error } = await safeQuery(
    supabase.from("admin_profiles").update({ role }).eq("id", id).select().single()
  );
  if (error) return { data: null, error };
  return { data: normalizeAdminUser(data), error: null };
}

export async function removeAdminUser(id) {
  const { error } = await safeQuery(supabase.from("admin_profiles").delete().eq("id", id));
  return { error };
}
