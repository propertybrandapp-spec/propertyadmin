import { supabase, safeQuery } from "./supabaseClient";

// ── Listing Field Options (admin — full CRUD) ────────────────────────────────
// Backs the "Listing Options" tab in Site Content — lets admins add/hide/
// remove property types, BHK options, amenities, and tags without a code
// change. See supabase/migration_010_listing_options.sql.

export const FIELD_TYPES = [
  { id: "property_type", label: "Property Types" },
  { id: "bhk", label: "BHK Options" },
  { id: "amenity", label: "Amenities" },
  { id: "tag", label: "Tags" },
];

function normalizeOption(row) {
  return {
    id: row.id,
    dbId: row.id,
    fieldType: row.field_type,
    value: row.value,
    active: row.is_active,
    order: row.display_order,
  };
}

export async function fetchAdminListingFieldOptions() {
  const { data, error } = await safeQuery(
    supabase.from("listing_field_options").select("*").order("field_type", { ascending: true }).order("display_order", { ascending: true })
  );
  if (error) return { data: [], error };
  return { data: (data || []).map(normalizeOption), error: null };
}

export async function createListingFieldOption(fieldType, value) {
  const { data, error } = await safeQuery(
    supabase.from("listing_field_options").insert({ field_type: fieldType, value, display_order: 0 }).select().single()
  );
  if (error) return { data: null, error };
  return { data: normalizeOption(data), error: null };
}

export async function updateListingFieldOption(id, patch) {
  const payload = {};
  if (patch.value !== undefined) payload.value = patch.value;
  if (patch.active !== undefined) payload.is_active = patch.active;
  if (patch.order !== undefined) payload.display_order = patch.order;
  const { data, error } = await safeQuery(
    supabase.from("listing_field_options").update(payload).eq("id", id).select().single()
  );
  if (error) return { data: null, error };
  return { data: normalizeOption(data), error: null };
}

export async function deleteListingFieldOption(id) {
  const { error } = await safeQuery(supabase.from("listing_field_options").delete().eq("id", id));
  return { error };
}

// Used by AdminListingForm.jsx (as opposed to the full CRUD functions above,
// which back the "Listing Options" management tab) — same shape as the
// public site's fetchListingFieldOptions(), just grouped by field_type.
export async function fetchActiveListingFieldOptionsGrouped() {
  const { data, error } = await safeQuery(
    supabase.from("listing_field_options").select("*").eq("is_active", true).order("display_order", { ascending: true })
  );
  if (error || !data || data.length === 0) return { data: null, error };

  const grouped = { propertyTypes: [], bhkOptions: [], amenities: [], tags: [] };
  const keyByFieldType = { property_type: "propertyTypes", bhk: "bhkOptions", amenity: "amenities", tag: "tags" };
  data.forEach((row) => {
    const key = keyByFieldType[row.field_type];
    if (key) grouped[key].push(row.value);
  });
  return { data: grouped, error: null };
}
