import { supabase, safeQuery } from "./supabaseClient";

// ── Developers & Projects (Section 2D) ──────────────────────────────────────
// Both live here together since creating a project almost always means
// picking (or creating) its developer in the same breath. Admin-only — the
// public Post Property form never touches these tables, it just fills in
// plain-text developer_name/project_name on the listing itself. That keeps
// the "Verified" badge meaningful: only admins can create/edit a developer
// or project profile.

function toDeveloper(row) {
  return {
    id: row.id,
    name: row.name,
    verified: !!row.verified,
    experienceYears: row.experience_years != null ? Number(row.experience_years) : null,
    completedProjectsCount: row.completed_projects_count != null ? Number(row.completed_projects_count) : null,
    currentProjectsCount: row.current_projects_count != null ? Number(row.current_projects_count) : null,
    description: row.description || "",
  };
}

function fromDeveloper(d) {
  return {
    name: d.name,
    verified: !!d.verified,
    experience_years: d.experienceYears !== "" && d.experienceYears != null ? parseInt(d.experienceYears, 10) : null,
    completed_projects_count: d.completedProjectsCount !== "" && d.completedProjectsCount != null ? parseInt(d.completedProjectsCount, 10) : null,
    current_projects_count: d.currentProjectsCount !== "" && d.currentProjectsCount != null ? parseInt(d.currentProjectsCount, 10) : null,
    description: d.description || null,
    updated_at: new Date().toISOString(),
  };
}

export async function fetchDevelopers() {
  const { data, error } = await safeQuery(supabase.from("developers").select("*").order("name"));
  if (error) return { data: [], error };
  return { data: (data || []).map(toDeveloper), error: null };
}

export async function createDeveloper(developer) {
  const { data, error } = await safeQuery(supabase.from("developers").insert(fromDeveloper(developer)).select().single());
  if (error) return { data: null, error };
  return { data: toDeveloper(data), error: null };
}

export async function updateDeveloper(id, developer) {
  const { data, error } = await safeQuery(supabase.from("developers").update(fromDeveloper(developer)).eq("id", id).select().single());
  if (error) return { data: null, error };
  return { data: toDeveloper(data), error: null };
}

function toProject(row) {
  return {
    id: row.id,
    name: row.name,
    developerId: row.developer_id || null,
    landAreaAcres: row.land_area_acres != null ? Number(row.land_area_acres) : null,
    totalTowers: row.total_towers != null ? Number(row.total_towers) : null,
    totalFloors: row.total_floors != null ? Number(row.total_floors) : null,
    totalUnits: row.total_units != null ? Number(row.total_units) : null,
    unitsPerAcre: row.units_per_acre != null ? Number(row.units_per_acre) : null,  // DB-generated
    homesPerFloor: row.homes_per_floor != null ? Number(row.homes_per_floor) : null,
    openSpacePercent: row.open_space_percent != null ? Number(row.open_space_percent) : null,
    constructionStage: row.construction_stage || null,
    constructionStageVerifiedAt: row.construction_stage_verified_at || null,
    expectedPossessionDate: row.expected_possession_date || null,
    handoverTimeline: row.handover_timeline || "",
    reraNumber: row.rera_number || "",
    reraState: row.rera_state || "",
    reraProjectName: row.rera_project_name || "",
    reraVerificationLink: row.rera_verification_link || "",
    approvals: Array.isArray(row.approvals) ? row.approvals : [],
    documents: Array.isArray(row.documents) ? row.documents : [],
    constructionQuality: row.construction_quality || "",
    structureType: row.structure_type || "",
    keyMaterials: row.key_materials || "",
    // ── Section 2G: construction-progress photos ──
    constructionProgressPhotos: Array.isArray(row.construction_progress_photos) ? row.construction_progress_photos : [],
  };
}

function fromProject(p) {
  const numOrNull = (v) => (v === "" || v === null || v === undefined ? null : Number(v));
  return {
    name: p.name,
    developer_id: p.developerId || null,
    land_area_acres: numOrNull(p.landAreaAcres),
    total_towers: numOrNull(p.totalTowers),
    total_floors: numOrNull(p.totalFloors),
    total_units: numOrNull(p.totalUnits),
    homes_per_floor: numOrNull(p.homesPerFloor),
    open_space_percent: numOrNull(p.openSpacePercent),
    construction_stage: p.constructionStage || null,
    expected_possession_date: p.expectedPossessionDate || null,
    handover_timeline: p.handoverTimeline || null,
    rera_number: p.reraNumber || null,
    rera_state: p.reraState || null,
    rera_project_name: p.reraProjectName || null,
    rera_verification_link: p.reraVerificationLink || null,
    // Strip client-only `_key` (React list key) before saving.
    approvals: Array.isArray(p.approvals) ? p.approvals.map(({ name, status, documentUrl }) => ({ name, status, documentUrl })) : [],
    documents: Array.isArray(p.documents) ? p.documents.map(({ type, label, url }) => ({ type, label, url })) : [],
    construction_quality: p.constructionQuality || null,
    structure_type: p.structureType || null,
    key_materials: p.keyMaterials || null,
    // ── Section 2G: construction-progress photos ──
    construction_progress_photos: Array.isArray(p.constructionProgressPhotos)
      ? p.constructionProgressPhotos.map(({ url, date, caption }) => ({ url, date, caption }))
      : [],
    // note: units_per_acre is DB-generated — never written here
  };
}

export async function fetchProjects() {
  const { data, error } = await safeQuery(supabase.from("projects").select("*").order("name"));
  if (error) return { data: [], error };
  return { data: (data || []).map(toProject), error: null };
}

export async function createProject(project) {
  const { data, error } = await safeQuery(supabase.from("projects").insert(fromProject(project)).select().single());
  if (error) return { data: null, error };
  return { data: toProject(data), error: null };
}

export async function updateProject(id, project) {
  const { data, error } = await safeQuery(supabase.from("projects").update(fromProject(project)).eq("id", id).select().single());
  if (error) return { data: null, error };
  return { data: toProject(data), error: null };
}
