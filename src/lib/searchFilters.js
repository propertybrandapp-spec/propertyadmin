// ── Search filter helpers (pure functions — no React, no network) ─────────────
// Everything the Hero search bar and the Search Results page need to turn the
// user's location text / budget choice into an actual yes-or-no match for a
// listing lives here, so both screens behave identically.
//
// Prices are always plain rupees (Buy = total price, Rent = per month), the
// same unit the `price_value` column and `priceRaw` use.

import { SERVICE_CITIES } from "./cities.js";

const LAC = 100000;
const CRORE = 10000000;
const THOUSAND = 1000;

// ── Budget presets for the Search Results min/max dropdowns ──────────────────
export const BUY_BUDGET_STEPS = [
  10 * LAC, 20 * LAC, 30 * LAC, 40 * LAC, 50 * LAC, 60 * LAC, 75 * LAC, 90 * LAC,
  1 * CRORE, 1.25 * CRORE, 1.5 * CRORE, 2 * CRORE, 3 * CRORE, 4 * CRORE, 5 * CRORE,
  7.5 * CRORE, 10 * CRORE, 20 * CRORE, 50 * CRORE,
];

export const RENT_BUDGET_STEPS = [
  5 * THOUSAND, 10 * THOUSAND, 15 * THOUSAND, 20 * THOUSAND, 25 * THOUSAND, 30 * THOUSAND,
  40 * THOUSAND, 50 * THOUSAND, 75 * THOUSAND, 1 * LAC, 1.5 * LAC, 2 * LAC, 3 * LAC, 5 * LAC,
];

// Hero search-bar budget dropdown for the "Rent" tab. (The admin-editable
// Budget Ranges list is written in Lac/Cr, which only makes sense for Buy.)
export const DEFAULT_RENT_BUDGET_RANGES = [
  "Under ₹10K",
  "₹10K - 25K",
  "₹25K - 50K",
  "₹50K - 1 Lac",
  "Above ₹1 Lac",
];

export function budgetSteps(transactionType) {
  return transactionType === "Rent" ? RENT_BUDGET_STEPS : BUY_BUDGET_STEPS;
}

// 1500000 -> "₹15 Lac", 25000000 -> "₹2.5 Cr", rent 25000 -> "₹25,000/mo"
export function formatBudget(n, transactionType = "Buy") {
  const v = Number(n) || 0;
  if (transactionType === "Rent") return `₹${v.toLocaleString("en-IN")}/mo`;
  if (v >= CRORE) return `₹${+(v / CRORE).toFixed(2)} Cr`;
  if (v >= LAC) return `₹${+(v / LAC).toFixed(2)} Lac`;
  return `₹${v.toLocaleString("en-IN")}`;
}

// ── Budget label parsing ─────────────────────────────────────────────────────
// Turns the Hero's budget dropdown text into a [min, max] pair (max = null
// means "no upper limit"). Understands what the admin console's Budget
// Ranges list produces and reasonable variations of it:
//   "Under ₹30 Lac"   -> [0, 30 Lac]
//   "₹30 - 50 Lac"    -> [30 Lac, 50 Lac]   (first number borrows the unit)
//   "₹50 Lac - 1 Cr"  -> [50 Lac, 1 Cr]
//   "Above ₹2 Cr"     -> [2 Cr, null]
//   "₹10K - 25K"      -> [10,000, 25,000]   (rent)
// Returns null when the label isn't a recognisable range (e.g. "Budget").
const UNIT_PATTERN = "(cr(?:ore)?s?|crs?|lacs?|lakhs?|lakh|l|k|thousand)";

function unitMultiplier(unit) {
  if (!unit) return null;
  const u = unit.toLowerCase();
  if (u.startsWith("cr")) return CRORE;
  if (u === "k" || u.startsWith("thousand")) return THOUSAND;
  return LAC; // lac / lacs / lakh / lakhs / l
}

export function parseBudgetRange(label) {
  if (!label || typeof label !== "string") return null;
  const text = label.replace(/,/g, "").replace(/₹|rs\.?|inr/gi, " ").toLowerCase();

  // Every "<number> [unit]" occurrence, in order.
  const re = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${UNIT_PATTERN}?(?![a-z])`, "g");
  const found = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    found.push({ value: parseFloat(m[1]), mult: unitMultiplier(m[2]) });
  }
  if (found.length === 0) return null;

  // A number without a unit borrows the next unit that follows it
  // ("30 - 50 Lac": 30 is also Lac). Falls back to the previous one.
  for (let i = found.length - 1; i >= 0; i--) {
    if (!found[i].mult) found[i].mult = found[i + 1]?.mult || found[i - 1]?.mult || 1;
  }
  const amounts = found.map((f) => f.value * f.mult);

  if (/\b(under|below|upto|up to|less than|max|maximum)\b/.test(text) || (amounts.length === 1 && /<|≤/.test(text))) {
    return [0, amounts[0]];
  }
  if (/\b(above|over|more than|min|minimum|from)\b|\+/.test(text) || (amounts.length === 1 && />|≥/.test(text))) {
    return [amounts[0], null];
  }
  if (amounts.length >= 2) {
    const lo = Math.min(amounts[0], amounts[1]);
    const hi = Math.max(amounts[0], amounts[1]);
    return [lo, hi];
  }
  return null;
}

// ── Does a listing fit the budget filter? ────────────────────────────────────
// `budget` is [min, max] where max === null/undefined means "no upper limit"
// and min <= 0 means "no lower limit". When no limit is set at all every
// listing passes — including "Call for Details" ones. As soon as the user
// narrows the budget, listings with no numeric price are left out, because
// there's no way to know whether they fit.
export function isBudgetActive(budget) {
  if (!budget) return false;
  const [min, max] = budget;
  return (Number(min) > 0) || (max !== null && max !== undefined && Number.isFinite(Number(max)));
}

export function matchesBudget(property, budget) {
  if (!isBudgetActive(budget)) return true;
  const price = Number(property.priceRaw) || 0;
  if (!price || property.priceOnRequest) return false;
  const [min, max] = budget;
  if (Number(min) > 0 && price < Number(min)) return false;
  if (max !== null && max !== undefined && Number.isFinite(Number(max)) && price > Number(max)) return false;
  return true;
}

// ── Location matching ────────────────────────────────────────────────────────
function normalize(s) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, " ")      // punctuation -> spaces
    .trim();
}

const LOCATION_STOPWORDS = new Set(["in", "at", "near", "nearby", "around", "of", "the", "and"]);

// The listing's *place* fields — where it actually is.
function listingPlaceText(p) {
  return normalize([p.location, p.city, p.locality, p.pincode, p.landmark].filter(Boolean).join(" "));
}

// Names attached to the listing — project, developer, title, nearby landmarks.
function listingNameText(p) {
  const landmarks = Array.isArray(p.nearbyLandmarks) ? p.nearbyLandmarks.map((l) => l?.name) : [];
  return normalize([p.projectName, p.developerName, p.towerBlock, p.title, ...landmarks].filter(Boolean).join(" "));
}

// Kept for other callers: everything about a listing that says "where it is".
export function listingLocationText(p) {
  return `${listingPlaceText(p)} ${listingNameText(p)}`.trim();
}

// Cities we recognise by name. A search that names a city must match the
// listing's own place fields — otherwise a project in Raipur that merely
// mentions "Bhubaneswar" in a title, developer name or landmark would show up
// when someone filters by Bhubaneswar.
const EXTRA_CITIES = [
  "delhi", "new delhi", "bangalore", "bengaluru", "hyderabad", "pune", "kolkata", "chennai", "cuttack", "puri",
  "raipur", "bhilai", "jaipur", "lucknow", "indore", "bhopal", "ahmedabad", "surat", "patna", "guwahati",
  "visakhapatnam", "coimbatore", "kochi", "nagpur", "vadodara", "jamshedpur", "rourkela", "sambalpur", "berhampur",
];
const KNOWN_CITIES = Array.from(new Set([
  ...SERVICE_CITIES.map((c) => normalize(c)),
  ...EXTRA_CITIES,
])).filter(Boolean);

function citiesIn(text) {
  const padded = ` ${text} `;
  const found = new Set();
  KNOWN_CITIES.forEach((c) => {
    // also count every spelling variant of this city
    const names = [c, ...(VARIANTS.get(c) || [])];
    if (names.some((n) => padded.includes(` ${n} `))) found.add(c);
  });
  return found;
}

// Approximate city centres (lat, lng). A listing pinned more than ~60 km from
// the searched city is not in that city, whatever its text says (typos and
// copy-pasted locations happen).
const CITY_CENTERS = {
  "bhubaneswar": [20.2961, 85.8245], "cuttack": [20.4625, 85.8830], "puri": [19.8135, 85.8312],
  "chandigarh": [30.7333, 76.7794], "new chandigarh": [30.8000, 76.7200], "mohali": [30.7046, 76.7179],
  "zirakpur": [30.6425, 76.8173], "panchkula": [30.6942, 76.8606], "sonipat": [28.9931, 77.0151],
  "panipat": [29.3909, 76.9635], "rishikesh": [30.0869, 78.2676], "haridwar": [29.9457, 78.1642],
  "dehradun": [30.3165, 78.0322], "gurgaon": [28.4595, 77.0266], "noida": [28.5355, 77.3910],
  "ghaziabad": [28.6692, 77.4538], "faridabad": [28.4089, 77.3178], "sohna": [28.2476, 77.0666],
  "ranchi": [23.3441, 85.3096], "raipur": [21.2514, 81.6296], "mumbai": [19.0760, 72.8777],
  "shimla": [31.1048, 77.1734], "dharamshala": [32.2190, 76.3234], "nashik": [19.9975, 73.7898],
  "prayagraj": [25.4358, 81.8463], "gujarat": [23.0225, 72.5714], "delhi": [28.6139, 77.2090],
  "new delhi": [28.6139, 77.2090], "bangalore": [12.9716, 77.5946], "bengaluru": [12.9716, 77.5946],
  "hyderabad": [17.3850, 78.4867], "pune": [18.5204, 73.8567], "kolkata": [22.5726, 88.3639], "chennai": [13.0827, 80.2707],
};
const MAX_KM_FROM_CITY = 60;

function distanceKm(aLat, aLng, bLat, bLng) {
  const R = 6371, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat), dLng = rad(bLng - aLng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// False when the listing has a map pin that is clearly outside every searched city.
function pinIsNearCities(property, queryCities) {
  const lat = Number(property.latitude), lng = Number(property.longitude);
  if (!lat || !lng) return true; // no pin -> can't tell
  const centres = [...queryCities].map((c) => CITY_CENTERS[c]).filter(Boolean);
  if (centres.length === 0) return true;
  return centres.some(([cLat, cLng]) => distanceKm(lat, lng, cLat, cLng) <= MAX_KM_FROM_CITY);
}

// The one city a listing belongs to, if it can be told (place text first,
// then its map pin). Used to keep "similar properties" in the same city.
export function cityOf(property) {
  const place = listingPlaceText(property);
  const fromText = [...citiesIn(place)];
  // prefer the most specific (longest) name, e.g. "new chandigarh" over "chandigarh"
  if (fromText.length) return fromText.sort((a, b) => b.length - a.length)[0];
  const lat = Number(property.latitude), lng = Number(property.longitude);
  if (lat && lng) {
    let best = null, bestKm = MAX_KM_FROM_CITY;
    Object.entries(CITY_CENTERS).forEach(([c, [cLat, cLng]]) => {
      const d = distanceKm(lat, lng, cLat, cLng);
      if (d < bestKm) { best = c; bestKm = d; }
    });
    return best;
  }
  return null;
}

export function inSameCity(a, b) {
  const ca = cityOf(a), cb = cityOf(b);
  return !ca || !cb || ca === cb;
}

// "Patia, Bhubaneswar", "patia bhubaneswar", "Bhubaneswar 751024" and
// "Salt Lake City" all work: every meaningful word in the search has to
// appear in the listing, in any order. When the search names a city, the
// listing's place fields have to be in that city.
export function matchesLocation(property, query) {
  const words = normalize(query).split(" ").filter((w) => w && !LOCATION_STOPWORDS.has(w));
  if (words.length === 0) return true;
  const has = (text) => words.every((w) => wordVariants(w).some((v) => text.includes(v)));

  const place = listingPlaceText(property);
  const queryCities = citiesIn(words.join(" "));
  // A pin on the map far away from the searched city beats whatever the text says.
  if (queryCities.size > 0 && !pinIsNearCities(property, queryCities)) return false;
  if (has(place)) return true;

  if (queryCities.size > 0) {
    // Listing's place fields name some other city -> it's not in the searched city.
    if (citiesIn(place).size > 0) return false;
    // Place fields carry no city at all (e.g. just "Patia") -> let names decide.
  }
  return has(`${place} ${listingNameText(property)}`);
}

// Different spellings people use for the same place — searching either one
// finds listings typed with the other (e.g. "Ghaziabad" finds "Gaziabad").
const SPELLING_GROUPS = [
  ["ghaziabad", "gaziabad"],
  ["dharamshala", "dharmshala", "dharamsala", "dharmsala"],
  ["prayagraj", "pryagraj", "allahabad"],
  ["gurgaon", "gurugram"],
  ["gujarat", "gujrat"],
  ["bhubaneswar", "bhubaneshwar", "bhubaneswer", "bbsr"],
  ["new chandigarh", "newchandigarh"],
  ["rishikesh", "hrishikesh"],
  ["mohali", "sas nagar", "sahibzada ajit singh nagar"],
];
const VARIANTS = new Map();
SPELLING_GROUPS.forEach((group) => group.forEach((w) => VARIANTS.set(w, group)));
function wordVariants(w) {
  return VARIANTS.get(w) || [w];
}

// Case-insensitive equality for chip-style filters (property type etc.).
export function sameText(a, b) {
  return normalize(a) === normalize(b);
}
