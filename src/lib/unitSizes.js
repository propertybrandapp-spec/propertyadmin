// ── Multiple unit sizes, handover timeline and price trend (pure helpers) ─────
// One project often sells several sizes (2 BHK 1,050 sqft, 3 BHK 1,450 sqft…).
// These helpers keep the forms, the database mapping and the detail page in step.

const num = (v) => {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

// Form rows -> what the database stores. Rows without a label or any number are dropped.
export function cleanUnitConfigs(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((u) => ({
      label: String(u?.label ?? "").trim(),
      areaSqft: num(u?.areaSqft),
      price: num(u?.price),
    }))
    .filter((u) => u.label && (u.areaSqft || u.price));
}

// Database JSON -> editable rows (strings for inputs).
export function unitConfigsForForm(raw) {
  return (Array.isArray(raw) ? raw : []).map((u) => ({
    label: u?.label || "",
    areaSqft: u?.areaSqft != null ? String(u.areaSqft) : "",
    price: u?.price != null ? String(u.price) : "",
  }));
}

export function formatPrice(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return "";
  if (v >= 1e7) return `₹${+(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `₹${+(v / 1e5).toFixed(2)} Lac`;
  return `₹${v.toLocaleString("en-IN")}`;
}

// "3 BHK" in a size label -> "3 BHK" so BHK filters find multi-size projects.
export function bhkFromUnits(units) {
  const out = [];
  (units || []).forEach((u) => {
    const m = String(u.label || "").match(/(\d+(?:\.\d+)?)\s*bhk/i);
    if (m) out.push(`${m[1]} BHK`);
  });
  return out;
}

export function smallestArea(units) {
  const a = (units || []).map((u) => u.areaSqft).filter(Boolean);
  return a.length ? Math.min(...a) : null;
}
export function lowestPrice(units) {
  const p = (units || []).map((u) => u.price).filter(Boolean);
  return p.length ? Math.min(...p) : null;
}

// "1,050 – 1,450 sqft" / "₹62 Lac – ₹85 Lac"
export function rangeText(values, fmt) {
  const v = (values || []).filter(Boolean);
  if (!v.length) return "";
  const lo = Math.min(...v), hi = Math.max(...v);
  return lo === hi ? fmt(lo) : `${fmt(lo)} – ${fmt(hi)}`;
}
export function unitSummary(units) {
  if (!units || units.length < 2) return "";
  return `${units.length} sizes · ${rangeText(units.map((u) => u.areaSqft), (n) => `${n.toLocaleString("en-IN")} sqft`)}`;
}

// Does any size of this project fit the budget? (Falls back to the headline price.)
export function anyUnitPriceInRange(property, min, max) {
  const prices = (property.unitConfigs || []).map((u) => u.price).filter(Boolean);
  if (!prices.length) return null; // no opinion
  return prices.some((p) => (!(min > 0) || p >= min) && (max == null || p <= max));
}

// Plain-text version, used when the database can't store the structured data yet.
export function unitSummaryText(units) {
  if (!units || !units.length) return "";
  return "Available sizes: " + units.map((u) => [u.label, u.areaSqft && `${u.areaSqft} sqft`, u.price && formatPrice(u.price)].filter(Boolean).join(" – ")).join("; ");
}

// ── Price trend ──────────────────────────────────────────────────────────────
export function cleanTrend(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((t) => ({ period: String(t?.period ?? "").trim(), pricePerSqft: num(t?.pricePerSqft) }))
    .filter((t) => t.period && t.pricePerSqft);
}
export function trendForForm(raw) {
  return (Array.isArray(raw) ? raw : []).map((t) => ({ period: t?.period || "", pricePerSqft: t?.pricePerSqft != null ? String(t.pricePerSqft) : "" }));
}
// { first, last, changePct } or null with fewer than two points
export function trendChange(points) {
  const p = cleanTrend(points);
  if (p.length < 2) return null;
  const first = p[0].pricePerSqft, last = p[p.length - 1].pricePerSqft;
  return { first, last, changePct: Math.round(((last - first) / first) * 1000) / 10 };
}

// ── Handover ─────────────────────────────────────────────────────────────────
export function handoverText(date, timeline) {
  const parts = [];
  if (date) {
    const d = new Date(date);
    if (!Number.isNaN(d.getTime())) parts.push(d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }));
  }
  if (timeline) parts.push(String(timeline).trim());
  return parts;
}

export const NEW_LISTING_COLUMNS = ["unit_configurations", "handover_date", "handover_timeline", "price_trend"];
