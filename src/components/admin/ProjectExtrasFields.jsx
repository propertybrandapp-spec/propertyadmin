import React from "react";

// Form fields shared by Post Property and the admin listing form:
//  • several sizes inside one project (label / area / price per row)
//  • handover timeline
//  • price-per-sqft trend for the location
// They edit `form.unitConfigs`, `form.handoverDate`, `form.handoverTimeline`
// and `form.priceTrend` through the parent's `set(key, value)`.

const input = "w-full rounded-lg px-3 py-2 text-sm focus:outline-none";
const inputStyle = { border: "1px solid #E2E8F0", background: "#FFFFFF", color: "#1F2937" };
const card = { background: "#FFFFFF", border: "1px solid #E2E8F0" };

function Label({ children, hint }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold mb-1.5" style={{ color: "#1F2937" }}>{children}</span>
      {hint && <span className="block text-[11px] mb-1.5" style={{ color: "#6B7280" }}>{hint}</span>}
    </label>
  );
}

function RowList({ rows, onChange, columns, addLabel, empty, max = 12, datalistId }) {
  const update = (i, key, value) => onChange(rows.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  return (
    <div className="space-y-2">
      {rows.length === 0 && <p className="text-xs" style={{ color: "#6B7280" }}>{empty}</p>}
      {rows.map((row, i) => (
        <div key={i} className="grid gap-2 items-center" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr)) 32px` }}>
          {columns.map((c) => (
            <input key={c.key} value={row[c.key] ?? ""} inputMode={c.numeric ? "numeric" : undefined}
              onChange={(e) => update(i, c.key, c.numeric ? e.target.value.replace(/[^\d.,]/g, "") : e.target.value)}
              placeholder={c.placeholder} aria-label={`${c.label} ${i + 1}`} className={input} style={inputStyle}
              list={c.key === "label" && datalistId ? datalistId : undefined} />
          ))}
          <button type="button" onClick={() => onChange(rows.filter((_, idx) => idx !== i))} aria-label={`Remove row ${i + 1}`}
            className="text-base font-bold" style={{ color: "#DC2626" }}>×</button>
        </div>
      ))}
      {rows.length < max && (
        <button type="button" onClick={() => onChange([...rows, Object.fromEntries(columns.map((c) => [c.key, ""]))])}
          className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: "#EFF6FF", color: "#1565C0" }}>
          + {addLabel}
        </button>
      )}
    </div>
  );
}

export default function ProjectExtrasFields({ form, set, isLand = false, hasBhk = true }) {
  const [showCustomSize, setShowCustomSize] = React.useState(false);
  const [customSizeDraft, setCustomSizeDraft] = React.useState("");

  const sizePresets = isLand
    ? ["30×40 plot", "30×50 plot", "40×60 plot", "50×80 plot"]
    : Array.from(new Set([...(Array.isArray(form.bhk) && form.bhk.length ? form.bhk : ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "5 BHK"])]));

  const allDatalistOptions = isLand
    ? ["30×40 plot", "30×50 plot", "40×60 plot", "50×80 plot", "1 Acre plot", "2 Acre parcel"]
    : ["1 RK", "1 BHK", "1.5 BHK", "2 BHK", "2.5 BHK", "3 BHK", "3.5 BHK", "4 BHK", "5 BHK", "Studio", "Duplex", "Penthouse"];

  function handleAddCustomSize() {
    const val = customSizeDraft.trim();
    if (!val) return;
    const formatted = /^\d+(\.\d+)?$/.test(val) ? `${val} BHK` : val;
    set("unitConfigs", [...(form.unitConfigs || []), { label: formatted, areaSqft: "", price: "" }]);
    setCustomSizeDraft("");
    setShowCustomSize(false);
  }

  return (
    <div className="rounded-2xl p-6 space-y-6" style={card} data-testid="project-extras">
      <div>
        <h2 className="text-sm font-bold" style={{ color: "#1F2937" }}>Sizes, Handover &amp; Price Trend</h2>
        <p className="text-xs mt-1" style={{ color: "#6B7280" }}>All optional — but a project with several sizes should list each one.</p>
      </div>

      <div>
        <Label hint={isLand ? "One row per plot size, e.g. 30×40 plot · 1,200 sqft · ₹24,00,000." : hasBhk ? "One row per size in this project, e.g. 2 BHK · 1,050 sqft · ₹62,00,000." : "One row per size on offer, e.g. Unit A · 1,200 sqft · ₹85,00,000."}>
          Sizes available in this project
        </Label>

        {/* Quick Add Size Chips & Custom Size Button */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <span className="text-[11px] font-semibold text-slate-500 mr-1">Quick add:</span>
          {sizePresets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                set("unitConfigs", [...(form.unitConfigs || []), { label: preset, areaSqft: "", price: "" }]);
              }}
              className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 transition-colors"
            >
              + {preset}
            </button>
          ))}
          {showCustomSize ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-blue-400 bg-blue-50/60">
              <input
                type="text"
                value={customSizeDraft}
                onChange={(e) => setCustomSizeDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomSize();
                  } else if (e.key === "Escape") {
                    setShowCustomSize(false);
                  }
                }}
                placeholder={isLand ? "e.g. 60×80 plot" : "e.g. 2.5 BHK, Penthouse"}
                className="text-xs bg-transparent outline-none w-36 text-slate-800 font-semibold placeholder:text-slate-400"
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddCustomSize}
                className="text-xs font-bold text-blue-700 hover:text-blue-900 px-1 py-0.5 rounded"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => { setShowCustomSize(false); setCustomSizeDraft(""); }}
                className="text-xs text-slate-400 hover:text-slate-600 px-0.5"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCustomSize(true)}
              className="text-xs font-semibold px-2.5 py-1 rounded-full border border-dashed border-blue-400 text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span className="text-sm font-bold leading-none">+</span> Custom Size
            </button>
          )}
        </div>

        <datalist id="size-label-presets">
          {allDatalistOptions.map((opt) => (
            <option key={opt} value={opt} />
          ))}
        </datalist>

        <RowList
          rows={form.unitConfigs || []} onChange={(v) => set("unitConfigs", v)} addLabel="Add a size" empty="Only one size? Skip this — the details above are enough."
          datalistId="size-label-presets"
          columns={[
            { key: "label", label: "Size name", placeholder: isLand ? "e.g. 30×40 plot" : hasBhk ? "e.g. 3 BHK" : "e.g. Unit A" },
            { key: "areaSqft", label: "Area (sq ft)", placeholder: "Area (sq ft)", numeric: true },
            { key: "price", label: "Price (₹)", placeholder: "Price in ₹ e.g. 6200000", numeric: true },
          ]}
        />
      </div>

      <div>
        <Label hint="When the buyer can expect possession. Use the date for the main handover and the box for phase-wise details.">Handover timeline</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input type="month" value={(form.handoverDate || "").slice(0, 7)} onChange={(e) => set("handoverDate", e.target.value ? `${e.target.value}-01` : "")}
            aria-label="Handover month" className={input} style={inputStyle} />
          <input value={form.handoverTimeline || ""} onChange={(e) => set("handoverTimeline", e.target.value)} aria-label="Handover notes"
            placeholder="e.g. Tower A Dec 2026, Tower B Jun 2027" className={input} style={inputStyle} />
        </div>
      </div>

      <div>
        <Label hint="Average price per sq ft in this location, oldest first. Use your own research or a trusted source.">Price trend in this location</Label>
        <RowList
          rows={form.priceTrend || []} onChange={(v) => set("priceTrend", v)} addLabel="Add a year" max={8} empty="No trend added."
          columns={[
            { key: "period", label: "Year", placeholder: "e.g. 2023" },
            { key: "pricePerSqft", label: "₹ per sq ft", placeholder: "₹ per sq ft e.g. 4200", numeric: true },
          ]}
        />
      </div>
    </div>
  );
}
