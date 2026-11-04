// ── Plot / land listing helpers (pure — no React, no network) ────────────────
// Plots, agricultural land and similar have no rooms, floors or built-up area.
// These helpers let the listing forms, the database mapping and the detail page
// all agree on what "a land listing" is and how its area is measured.

// Property types that are bare land (no building to describe).
const LAND_TYPES = ["plot", "agricultural land", "land", "farm land", "farmland", "residential plot", "commercial plot", "industrial plot"];

export function isLandType(type) {
  return LAND_TYPES.includes(String(type ?? "").trim().toLowerCase());
}

// Land is sold in many units. The database always stores square feet.
export const PLOT_AREA_UNITS = [
  { value: "sqft", label: "Sq Ft", factor: 1 },
  { value: "sqyd", label: "Sq Yd (Gaj)", factor: 9 },
  { value: "sqm", label: "Sq M", factor: 10.7639 },
  { value: "decimal", label: "Decimal (Dismil)", factor: 435.6 },
  { value: "acre", label: "Acre", factor: 43560 },
];

export function unitFactor(unit) {
  return (PLOT_AREA_UNITS.find((u) => u.value === unit) || PLOT_AREA_UNITS[0]).factor;
}

// 2 acre -> 87120 sqft. Returns null for empty / non-positive input.
export function toSqft(value, unit = "sqft") {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * unitFactor(unit));
}

// 87120 sqft -> "87,120 sqft (2 acre)"
export function formatPlotArea(sqft) {
  const n = Number(sqft);
  if (!Number.isFinite(n) || n <= 0) return null;
  const base = `${n.toLocaleString("en-IN")} sqft`;
  if (n >= 43560) return `${base} (${+(n / 43560).toFixed(2)} acre)`;
  if (n >= 1800) return `${base} (${+(n / 9).toFixed(0)} sq yd)`;
  return base;
}

// Length × width in feet -> sqft (used when the owner gives dimensions only).
export function areaFromDimensions(length, width) {
  const l = Number(length);
  const w = Number(width);
  if (!(l > 0) || !(w > 0)) return null;
  return Math.round(l * w);
}

export const LAND_USE_OPTIONS = ["Residential", "Commercial", "Industrial", "Agricultural", "Mixed Use", "Institutional"];
export const PLOT_APPROVAL_OPTIONS = ["Development Authority Approved", "RERA Approved Layout", "Panchayat / Gram Approved", "Municipal Approved", "Conversion (Land Use) Done", "Not Yet Approved"];
export const PLOT_ROAD_OPTIONS = ["Tar / Pucca Road", "Cement Road", "Kaccha Road", "Under Development"];
export const LAND_PHOTO_LABELS = ["Plot View", "Road / Approach", "Boundary", "Surroundings", "Layout Map", "Other"];

// Fields that only make sense for a building — cleared when a land listing is saved
// so a type switch half-way through the form can't leave stray "3 BHK" behind.
const BUILDING_ONLY_FIELDS = {
  bhk: [],
  bathrooms: "",
  balconies: "",
  servantRoom: false,
  builtUpArea: "",
  superBuiltUpArea: "",
  carpetArea: "",
  floorNumber: "",
  totalFloors: "",
  totalUnits: "",
  towerBlock: "",
  unitNumber: "",
  furnishing: "",
  condition: "",
  age: "",
};

export function stripBuildingFields(form) {
  return { ...form, ...BUILDING_ONLY_FIELDS };
}

// Form -> the plot fields the database stores. For land listings `plotAreaValue`
// (in the chosen unit) wins; otherwise an existing sqft `plotArea`, otherwise
// length × width.
export function resolvePlotArea(form) {
  return (
    toSqft(form.plotAreaValue, form.plotAreaUnit) ||
    (Number(form.plotArea) > 0 ? Math.round(Number(form.plotArea)) : null) ||
    areaFromDimensions(form.plotLength, form.plotWidth)
  );
}

// What a land listing is missing, as a human sentence (or "" when fine).
export function landValidationMessage(form) {
  if (!isLandType(form.type)) return "";
  if (!resolvePlotArea(form)) return "Please enter the plot area (or its length and width) — buyers search land by size.";
  return "";
}

// One-line summary of the plot details — used as a fallback when the database
// doesn't have the dedicated plot columns yet, and for listing descriptions.
export function plotDetailsSummary(p) {
  const parts = [];
  if (p.plotLength && p.plotWidth) parts.push(`Dimensions: ${p.plotLength} ft × ${p.plotWidth} ft`);
  if (p.roadWidth) parts.push(`Road width: ${p.roadWidth} ft`);
  if (p.cornerPlot) parts.push("Corner plot");
  if (p.boundaryWall) parts.push("Boundary wall built");
  if (p.landUse) parts.push(`Land use: ${p.landUse}`);
  if (p.plotApproval) parts.push(`Approval: ${p.plotApproval}`);
  return parts.join(" · ");
}
