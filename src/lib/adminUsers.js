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

// Used by the new "My Profile" page — lets any signed-in admin update their
// own display name/avatar initials. Note: under the current RLS policy,
// only super_admins can actually write to admin_profiles (including their
// own row) — so for admin/staff-role accounts this will return an RLS
// error. AdminProfile.jsx shows a clear message in that case rather than
// failing silently. If you want every admin to be able to self-edit, add a
// policy like:
//   create policy "Admins can update their own profile"
//     on public.admin_profiles for update
//     using (auth.uid() = id) with check (auth.uid() = id);
// (paired with a trigger that blocks a non-super_admin from changing the
// `role` column on themselves, so no one can self-promote).
export async function updateOwnProfile(id, { full_name, avatar_initials } = {}) {
  const payload = {};
  if (full_name !== undefined) payload.full_name = full_name;
  if (avatar_initials !== undefined) payload.avatar_initials = avatar_initials;

  const { data, error } = await safeQuery(
    supabase.from("admin_profiles").update(payload).eq("id", id).select().single()
  );
  if (error) return { data: null, error };
  return { data, error: null };
}

export async function removeAdminUser(id) {
  const { error } = await safeQuery(supabase.from("admin_profiles").delete().eq("id", id));
  return { error };
}
