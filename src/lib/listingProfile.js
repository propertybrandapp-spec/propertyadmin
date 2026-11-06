// ── Which entry-form fields apply to which property type ─────────────────────
// An apartment, a duplex, a shop, a warehouse and a plot are described by
// different facts. Both listing forms (website "Post Property" and the admin
// listing form) read the profile below, so each type gets its own sensible
// form instead of one flat form for everything. When a listing is saved,
// fields the profile hides are cleared (see applyProfile), so switching type
// half-way through can't leave stray "3 BHK" or "Floor 8" behind.
import { isLandType } from "./landListing";

export const AREA_LABELS = {
  carpetArea: "Carpet Area",
  builtUpArea: "Built-up Area",
  superBuiltUpArea: "Super Built-up Area",
  plotArea: "Plot / Land Area",
};

const norm = (t) => String(t ?? "").trim().toLowerCase();

const APARTMENT = {
  kind: "apartment",
  bhk: true,
  bathrooms: true, bathLabel: "Bathrooms",
  balconies: true,
  servantRoom: true,
  areas: ["carpetArea", "builtUpArea", "superBuiltUpArea"],
  areaHint: "Fill in whichever apply — most apartments quote Carpet and Super Built-up area.",
  floorNumber: true,
  totalFloors: true, totalFloorsLabel: "Total Floors in Building",
  totalUnits: true,
  tower: true,
  unitLabel: "Unit Number", unitPlaceholder: "e.g. 1204",
  furnishing: true, condition: true, age: true,
  titleHint: "e.g. 3 BHK Apartment in Patia",
};

// Duplex, villa, independent house, farmhouse: a whole house on its own land.
const HOUSE = {
  kind: "house",
  bhk: true,
  bathrooms: true, bathLabel: "Bathrooms",
  balconies: true,
  servantRoom: true,
  areas: ["plotArea", "builtUpArea", "carpetArea"],
  areaHint: "Plot area is the land; built-up area is all floors of the house together.",
  floorNumber: false,
  totalFloors: true, totalFloorsLabel: "Number of Floors / Levels",
  totalUnits: false,
  tower: false,
  unitLabel: "House / Villa No.", unitPlaceholder: "e.g. Villa 14",
  furnishing: true, condition: true, age: true,
  titleHint: "e.g. 4 BHK Duplex in Patia",
};

const COMMERCIAL = {
  kind: "commercial",
  bhk: false,
  bathrooms: true, bathLabel: "Washrooms",
  balconies: false,
  servantRoom: false,
  areas: ["carpetArea", "builtUpArea", "superBuiltUpArea"],
  areaHint: "Fill in whichever apply — offices and shops usually quote Carpet and Super Built-up area.",
  floorNumber: true,
  totalFloors: true, totalFloorsLabel: "Total Floors in Building",
  totalUnits: false,
  tower: true,
  unitLabel: "Unit / Shop No.", unitPlaceholder: "e.g. Shop 12",
  furnishing: true, condition: true, age: true,
  titleHint: "e.g. 1200 sq ft Office Space in Saheed Nagar",
};

const INDUSTRIAL = {
  kind: "industrial",
  bhk: false,
  bathrooms: false, bathLabel: "Washrooms",
  balconies: false,
  servantRoom: false,
  areas: ["plotArea", "builtUpArea"],
  areaHint: "Land area plus the built-up shed / warehouse area.",
  floorNumber: false,
  totalFloors: false, totalFloorsLabel: "Number of Floors",
  totalUnits: false,
  tower: false,
  unitLabel: "Unit / Shed No.", unitPlaceholder: "e.g. Shed 3",
  furnishing: false, condition: true, age: true,
  titleHint: "e.g. 10,000 sq ft Warehouse near Cuttack Road",
};

const LAND = {
  kind: "land",
  bhk: false,
  bathrooms: false, bathLabel: "Bathrooms",
  balconies: false,
  servantRoom: false,
  areas: [],
  areaHint: "",
  floorNumber: false,
  totalFloors: false, totalFloorsLabel: "",
  totalUnits: false,
  tower: false,
  unitLabel: null, unitPlaceholder: "",
  furnishing: false, condition: false, age: false,
  titleHint: "e.g. 1800 sq ft Residential Plot in Patia",
};

const HOUSE_TYPES = ["duplex", "villa", "independent house", "farmhouse", "row house", "bungalow"];
const COMMERCIAL_TYPES = ["commercial", "office space", "office", "shop / showroom", "shop", "showroom", "retail"];
const INDUSTRIAL_TYPES = ["warehouse / industrial shed", "warehouse", "industrial"];

export function getFormProfile(type) {
  if (isLandType(type)) return LAND;
  const t = norm(type);
  if (HOUSE_TYPES.includes(t)) return HOUSE;
  if (COMMERCIAL_TYPES.includes(t)) return COMMERCIAL;
  if (INDUSTRIAL_TYPES.includes(t)) return INDUSTRIAL;
  return APARTMENT; // apartment, studio, penthouse, co-living, student accommodation, anything new
}

// Clears every field the type's form doesn't show, so what's saved matches
// what the person was actually asked.
export function applyProfile(form) {
  const p = getFormProfile(form.type);
  const out = { ...form };
  if (!p.bhk) out.bhk = [];
  if (!p.bathrooms) out.bathrooms = "";
  if (!p.balconies) out.balconies = "";
  if (!p.servantRoom) out.servantRoom = false;
  ["builtUpArea", "superBuiltUpArea", "carpetArea"].forEach((k) => { if (!p.areas.includes(k)) out[k] = ""; });
  if (!p.areas.includes("plotArea") && p.kind !== "land") { out.plotArea = ""; }
  if (!p.floorNumber) out.floorNumber = "";
  if (!p.totalFloors) out.totalFloors = "";
  if (!p.totalUnits) out.totalUnits = "";
  if (!p.tower) out.towerBlock = "";
  if (!p.unitLabel) { out.unitNumber = ""; }
  if (!p.furnishing) out.furnishing = "";
  if (!p.condition) out.condition = "";
  if (!p.age) out.age = "";
  return out;
}
