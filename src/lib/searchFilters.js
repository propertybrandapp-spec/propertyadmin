// ── Search filter helpers (pure functions — no React, no network) ─────────────
// Everything the Hero search bar and the Search Results page need to turn the
// user's location text / budget choice into an actual yes-or-no match for a
// listing lives here, so both screens behave identically.
//
// Prices are always plain rupees (Buy = total price, Rent = per month), the
// same unit the `price_value` column and `priceRaw` use.

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

// Everything about a listing that says "where it is" — the location text the
// owner typed plus the structured city/locality/pincode/landmark fields and
// project/developer names — joined into one searchable string.
export function listingLocationText(p) {
  const landmarks = Array.isArray(p.nearbyLandmarks) ? p.nearbyLandmarks.map((l) => l?.name) : [];
  return normalize([
    p.location, p.city, p.locality, p.pincode, p.landmark,
    p.projectName, p.developerName, p.towerBlock, p.title,
    ...landmarks,
  ].filter(Boolean).join(" "));
}

// "Patia, Bhubaneswar", "patia bhubaneswar", "Bhubaneswar 751024" and
// "Salt Lake City" all work: every meaningful word in the search has to
// appear somewhere in the listing's location info, in any order.
export function matchesLocation(property, query) {
  const words = normalize(query).split(" ").filter((w) => w && !LOCATION_STOPWORDS.has(w));
  if (words.length === 0) return true;
  const haystack = listingLocationText(property);
  return words.every((w) => wordVariants(w).some((v) => haystack.includes(v)));
}

// Different spellings people use for the same place — searching either one
// finds listings typed with the other (e.g. "Ghaziabad" finds "Gaziabad").
const SPELLING_GROUPS = [
  ["ghaziabad", "gaziabad"],
  ["dharamshala", "dharmshala", "dharamsala", "dharmsala"],
  ["prayagraj", "pryagraj", "allahabad"],
  ["gurgaon", "gurugram"],
  ["gujarat", "gujrat"],
  ["bhubaneswar", "bhubaneshwar", "bhubaneswer"],
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
