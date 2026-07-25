import { useState, useEffect } from "react";
import AdminLayout from "./AdminLayout";
import {
  fetchAdminPartnerTiers, createPartnerTier, updatePartnerTier, deletePartnerTier,
  fetchAdminClientReviews, createClientReview, updateClientReview, deleteClientReview,
  fetchAdminSubscriptionPlans, createSubscriptionPlan, updateSubscriptionPlan, deleteSubscriptionPlan,
  fetchAdminInvestmentOpportunities, createInvestmentOpportunity, updateInvestmentOpportunity, deleteInvestmentOpportunity,
} from "../../lib/siteContent";
import { uploadToR2, validateImageFile } from "../../lib/r2Upload";

const TABS = [
  { id: "tiers", label: "Partner Tiers" },
  { id: "reviews", label: "Client Reviews" },
  { id: "plans", label: "Subscription Plans" },
  { id: "investments", label: "Investment Opportunities" },
];

// ── Shared small building blocks ─────────────────────────────────────────────

function Field({ label, children, hint }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: "#6B7280" }}>{label}</label>
      {children}
      {hint && <p className="text-[11px] mt-1" style={{ color: "#6B7280" }}>{hint}</p>}
    </div>
  );
}

const inputStyle = { border: "1px solid #E2E8F0", color: "#1F2937" };

function TextInput(props) {
  return <input {...props} className={`w-full text-sm px-3 py-2.5 rounded-lg focus:outline-none ${props.className || ""}`} style={{ ...inputStyle, ...(props.style || {}) }} />;
}

function TextArea(props) {
  return <textarea {...props} className={`w-full text-sm px-3 py-2.5 rounded-lg focus:outline-none resize-none ${props.className || ""}`} style={{ ...inputStyle, ...(props.style || {}) }} />;
}

function ColorInput({ label, value, onChange }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input type="color" value={value || "#6B7280"} onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg cursor-pointer shrink-0" style={{ border: "1px solid #E2E8F0" }} />
        <TextInput value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="#6B7280" />
      </div>
    </Field>
  );
}

function ActivePill({ active }) {
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: active ? "#F0FDF4" : "#F1F5F9", color: active ? "#15803D" : "#6B7280" }}>
      {active ? "Active" : "Hidden"}
    </span>
  );
}

// Editable list of plain strings (used for partner-tier perks)
function StringListEditor({ items, onChange }) {
  const [draft, setDraft] = useState("");
  function add() {
    if (!draft.trim()) return;
    onChange([...(items || []), draft.trim()]);
    setDraft("");
  }
  function remove(i) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {(items || []).map((item, i) => (
          <span key={i} className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: "#EFF6FF", color: "#1E88E5" }}>
            {item}
            <button type="button" onClick={() => remove(i)} className="font-bold" style={{ color: "#1565C0" }}>×</button>
          </span>
        ))}
        {(!items || items.length === 0) && <span className="text-xs" style={{ color: "#6B7280" }}>No items yet.</span>}
      </div>
      <div className="flex gap-2">
        <TextInput value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="e.g. Priority Lead Sharing"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <button type="button" onClick={add} className="text-xs font-bold px-3 rounded-lg shrink-0" style={{ background: "#1E88E5", color: "#FFFFFF" }}>Add</button>
      </div>
    </div>
  );
}

// Editable list of { text, included } (used for subscription plan features)
function FeatureListEditor({ items, onChange }) {
  const list = items || [];
  function update(i, patch) { onChange(list.map((f, idx) => (idx === i ? { ...f, ...patch } : f))); }
  function remove(i) { onChange(list.filter((_, idx) => idx !== i)); }
  function add() { onChange([...list, { text: "", included: true }]); }
  return (
    <div className="space-y-2">
      {list.map((f, i) => (
        <div key={i} className="flex items-center gap-2">
          <input type="checkbox" checked={f.included !== false} onChange={(e) => update(i, { included: e.target.checked })}
            className="w-4 h-4 shrink-0" style={{ accentColor: "#1E88E5" }} />
          <TextInput value={f.text} onChange={(e) => update(i, { text: e.target.value })} placeholder="Feature name" />
          <button type="button" onClick={() => remove(i)} className="text-lg font-bold px-1 shrink-0" style={{ color: "#DC2626" }}>×</button>
        </div>
      ))}
      <button type="button" onClick={add} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: "#EFF6FF", color: "#1E88E5" }}>+ Add Feature</button>
    </div>
  );
}

function EmptyState({ label }) {
  return <p className="text-sm text-center py-10" style={{ color: "#6B7280" }}>{label}</p>;
}

function Card({ children }) {
  return <div className="rounded-2xl p-5" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>{children}</div>;
}

function RowActions({ active, onEdit, onToggle, onDelete, confirming, setConfirming }) {
  if (confirming) {
    return (
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs font-semibold" style={{ color: "#DC2626" }}>Delete?</span>
        <button onClick={onDelete} className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ background: "#DC2626", color: "#FFFFFF" }}>Yes</button>
        <button onClick={() => setConfirming(false)} className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ background: "#F1F5F9", color: "#6B7280" }}>Cancel</button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 shrink-0">
      <button onClick={onToggle} className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: "#F1F5F9", color: "#6B7280" }}>
        {active ? "Hide" : "Show"}
      </button>
      <button onClick={onEdit} className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: "#EFF6FF", color: "#1E88E5" }}>Edit</button>
      <button onClick={() => setConfirming(true)} className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: "#FEE2E2", color: "#DC2626" }}>Delete</button>
    </div>
  );
}

function SaveBar({ onCancel, onSave, saving, error }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button type="submit" disabled={saving} className="text-sm font-bold px-4 py-2.5 rounded-xl" style={{ background: "#1E88E5", color: "#FFFFFF", opacity: saving ? 0.6 : 1 }}>
        {saving ? "Saving..." : "Save"}
      </button>
      <button type="button" onClick={onCancel} className="text-sm font-semibold px-4 py-2.5 rounded-xl" style={{ background: "#F1F5F9", color: "#6B7280" }}>Cancel</button>
      {error && <span className="text-xs font-semibold" style={{ color: "#DC2626" }}>{error}</span>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Partner Tiers
// ═══════════════════════════════════════════════════════════════════════════

const EMPTY_TIER = { name: "", color: "#6B7280", borderColor: "#E2E8F0", deals: "", commission: "", perks: [], cta: "Apply Now", popular: false, active: true, order: 0 };

function TierForm({ initial, onCancel, onSaved }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name) return;
    setSaving(true); setError("");
    const fn = form.dbId ? updatePartnerTier(form.dbId, form) : createPartnerTier(form);
    const { data, error } = await fn;
    setSaving(false);
    if (error) { setError("Couldn't save."); return; }
    onSaved(data);
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Tier name"><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Silver" required /></Field>
        <div className="grid grid-cols-2 gap-4">
          <ColorInput label="Tier color" value={form.color} onChange={(v) => setForm({ ...form, color: v })} />
          <ColorInput label="Border color" value={form.borderColor} onChange={(v) => setForm({ ...form, borderColor: v })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Deals range"><TextInput value={form.deals} onChange={(e) => setForm({ ...form, deals: e.target.value })} placeholder="e.g. 6–15 deals/yr" /></Field>
          <Field label="Commission"><TextInput value={form.commission} onChange={(e) => setForm({ ...form, commission: e.target.value })} placeholder="e.g. 2%" /></Field>
        </div>
        <Field label="Perks"><StringListEditor items={form.perks} onChange={(perks) => setForm({ ...form, perks })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Button label"><TextInput value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} /></Field>
          <Field label="Display order"><TextInput type="number" value={form.order} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })} /></Field>
        </div>
        <label className="flex items-center gap-2 cursor-pointer w-fit">
          <input type="checkbox" checked={!!form.popular} onChange={(e) => setForm({ ...form, popular: e.target.checked })} className="w-4 h-4" style={{ accentColor: "#1E88E5" }} />
          <span className="text-sm" style={{ color: "#1F2937" }}>Mark as "Most Popular"</span>
        </label>
        <SaveBar onCancel={onCancel} saving={saving} error={error} />
      </form>
    </Card>
  );
}

function TiersPanel() {
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, {...} = editing
  const [confirmId, setConfirmId] = useState(null);

  function load() { fetchAdminPartnerTiers().then(({ data }) => setItems(data)); }
  useEffect(load, []);

  async function toggleActive(t) { await updatePartnerTier(t.dbId, { ...t, active: !t.active }); load(); }
  async function handleDelete(id) { await deletePartnerTier(id); setConfirmId(null); load(); }

  if (items === null) return <EmptyState label="Loading..." />;

  return (
    <div className="space-y-4">
      {editing ? (
        <TierForm initial={editing.dbId ? editing : EMPTY_TIER} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      ) : (
        <button onClick={() => setEditing(EMPTY_TIER)} className="text-sm font-bold px-4 py-2.5 rounded-xl" style={{ background: "#1E88E5", color: "#FFFFFF" }}>+ Add Tier</button>
      )}
      {items.length === 0 && !editing && <EmptyState label="No partner tiers yet — add one above. The public Channel Partner page shows built-in demo tiers until you do." />}
      {items.map((t) => (
        <Card key={t.id}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: t.color }} />
                <p className="text-sm font-bold" style={{ color: "#1F2937" }}>{t.name}</p>
                {t.popular && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#EFF6FF", color: "#1E88E5" }}>Popular</span>}
                <ActivePill active={t.active} />
              </div>
              <p className="text-xs" style={{ color: "#6B7280" }}>{t.deals} · {t.commission} commission · {t.perks.length} perks</p>
            </div>
            <RowActions active={t.active} onEdit={() => setEditing(t)} onToggle={() => toggleActive(t)}
              onDelete={() => handleDelete(t.dbId)} confirming={confirmId === t.id} setConfirming={(v) => setConfirmId(v ? t.id : null)} />
          </div>
        </Card>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Client Reviews
// ═══════════════════════════════════════════════════════════════════════════

const EMPTY_REVIEW = { name: "", role: "", location: "", avatar: "", avatarBg: "from-blue-500 to-blue-700", rating: 5, category: "", text: "", property: "", date: new Date().toISOString().slice(0, 10), verified: true, active: true, order: 0 };

function ReviewForm({ initial, onCancel, onSaved }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.text) return;
    setSaving(true); setError("");
    const fn = form.dbId ? updateClientReview(form.dbId, form) : createClientReview(form);
    const { data, error } = await fn;
    setSaving(false);
    if (error) { setError("Couldn't save."); return; }
    onSaved(data);
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name"><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
          <Field label="Role"><TextInput value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. Home Buyer" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Location"><TextInput value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Bhubaneswar" /></Field>
          <Field label="Category"><TextInput value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Home Buyers, NRIs, Investors" /></Field>
        </div>
        <Field label="Review text"><TextArea rows={4} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} required /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Property"><TextInput value={form.property} onChange={(e) => setForm({ ...form, property: e.target.value })} placeholder="e.g. 3 BHK Flat, Patia" /></Field>
          <Field label="Date"><TextInput type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Rating (1–5)"><TextInput type="number" min={1} max={5} value={form.rating} onChange={(e) => setForm({ ...form, rating: parseInt(e.target.value) || 5 })} /></Field>
          <Field label="Avatar initials"><TextInput value={form.avatar} onChange={(e) => setForm({ ...form, avatar: e.target.value.toUpperCase().slice(0, 2) })} placeholder="e.g. RG" /></Field>
          <Field label="Display order"><TextInput type="number" value={form.order} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })} /></Field>
        </div>
        <label className="flex items-center gap-2 cursor-pointer w-fit">
          <input type="checkbox" checked={!!form.verified} onChange={(e) => setForm({ ...form, verified: e.target.checked })} className="w-4 h-4" style={{ accentColor: "#1E88E5" }} />
          <span className="text-sm" style={{ color: "#1F2937" }}>Show "Verified" badge</span>
        </label>
        <SaveBar onCancel={onCancel} saving={saving} error={error} />
      </form>
    </Card>
  );
}

function ReviewsPanel() {
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  function load() { fetchAdminClientReviews().then(({ data }) => setItems(data)); }
  useEffect(load, []);

  async function toggleActive(r) { await updateClientReview(r.dbId, { ...r, active: !r.active }); load(); }
  async function handleDelete(id) { await deleteClientReview(id); setConfirmId(null); load(); }

  if (items === null) return <EmptyState label="Loading..." />;

  return (
    <div className="space-y-4">
      {editing ? (
        <ReviewForm initial={editing.dbId ? editing : EMPTY_REVIEW} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      ) : (
        <button onClick={() => setEditing(EMPTY_REVIEW)} className="text-sm font-bold px-4 py-2.5 rounded-xl" style={{ background: "#1E88E5", color: "#FFFFFF" }}>+ Add Review</button>
      )}
      {items.length === 0 && !editing && <EmptyState label="No client reviews yet — add one above. The public Reviews page shows built-in demo reviews until you do." />}
      {items.map((r) => (
        <Card key={r.id}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-bold" style={{ color: "#1F2937" }}>{r.name}</p>
                <span className="text-xs" style={{ color: "#F59E0B" }}>{"★".repeat(r.rating)}</span>
                <ActivePill active={r.active} />
              </div>
              <p className="text-xs mb-1" style={{ color: "#6B7280" }}>{r.role} · {r.location}</p>
              <p className="text-xs truncate max-w-lg" style={{ color: "#6B7280" }}>{r.text}</p>
            </div>
            <RowActions active={r.active} onEdit={() => setEditing(r)} onToggle={() => toggleActive(r)}
              onDelete={() => handleDelete(r.dbId)} confirming={confirmId === r.id} setConfirming={(v) => setConfirmId(v ? r.id : null)} />
          </div>
        </Card>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Subscription Plans
// ═══════════════════════════════════════════════════════════════════════════

const EMPTY_PLAN = { name: "", price: "", period: "/month", idealFor: "", color: "#6B7280", borderColor: "#E2E8F0", features: [], popular: false, active: true, order: 0 };

function PlanForm({ initial, onCancel, onSaved }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.price) return;
    setSaving(true); setError("");
    const fn = form.dbId ? updateSubscriptionPlan(form.dbId, form) : createSubscriptionPlan(form);
    const { data, error } = await fn;
    setSaving(false);
    if (error) { setError("Couldn't save."); return; }
    onSaved(data);
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Plan name"><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Standard" required /></Field>
          <Field label="Ideal for"><TextInput value={form.idealFor} onChange={(e) => setForm({ ...form, idealFor: e.target.value })} placeholder="e.g. NRIs & busy professionals" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Price"><TextInput value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="e.g. ₹5,499" required /></Field>
          <Field label="Billing period"><TextInput value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="e.g. /month" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <ColorInput label="Plan color" value={form.color} onChange={(v) => setForm({ ...form, color: v })} />
          <ColorInput label="Border color" value={form.borderColor} onChange={(v) => setForm({ ...form, borderColor: v })} />
        </div>
        <Field label="Features"><FeatureListEditor items={form.features} onChange={(features) => setForm({ ...form, features })} /></Field>
        <Field label="Display order"><TextInput type="number" value={form.order} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })} className="max-w-[140px]" /></Field>
        <label className="flex items-center gap-2 cursor-pointer w-fit">
          <input type="checkbox" checked={!!form.popular} onChange={(e) => setForm({ ...form, popular: e.target.checked })} className="w-4 h-4" style={{ accentColor: "#1E88E5" }} />
          <span className="text-sm" style={{ color: "#1F2937" }}>Mark as "Most Popular"</span>
        </label>
        <SaveBar onCancel={onCancel} saving={saving} error={error} />
      </form>
    </Card>
  );
}

function PlansPanel() {
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  function load() { fetchAdminSubscriptionPlans().then(({ data }) => setItems(data)); }
  useEffect(load, []);

  async function toggleActive(p) { await updateSubscriptionPlan(p.dbId, { ...p, active: !p.active }); load(); }
  async function handleDelete(id) { await deleteSubscriptionPlan(id); setConfirmId(null); load(); }

  if (items === null) return <EmptyState label="Loading..." />;

  return (
    <div className="space-y-4">
      {editing ? (
        <PlanForm initial={editing.dbId ? editing : EMPTY_PLAN} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      ) : (
        <button onClick={() => setEditing(EMPTY_PLAN)} className="text-sm font-bold px-4 py-2.5 rounded-xl" style={{ background: "#1E88E5", color: "#FFFFFF" }}>+ Add Plan</button>
      )}
      {items.length === 0 && !editing && <EmptyState label="No subscription plans yet — add one above. The public Property Management page shows built-in demo plans until you do." />}
      {items.map((p) => (
        <Card key={p.id}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: p.color }} />
                <p className="text-sm font-bold" style={{ color: "#1F2937" }}>{p.name}</p>
                {p.popular && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#EFF6FF", color: "#1E88E5" }}>Popular</span>}
                <ActivePill active={p.active} />
              </div>
              <p className="text-xs" style={{ color: "#6B7280" }}>{p.price}{p.period} · {p.idealFor} · {p.features.length} features</p>
            </div>
            <RowActions active={p.active} onEdit={() => setEditing(p)} onToggle={() => toggleActive(p)}
              onDelete={() => handleDelete(p.dbId)} confirming={confirmId === p.id} setConfirming={(v) => setConfirmId(v ? p.id : null)} />
          </div>
        </Card>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Investment Opportunities
// ═══════════════════════════════════════════════════════════════════════════

const EMPTY_INVESTMENT = { city: "Bhubaneswar", area: "", tag: "", tagColor: "bg-blue-100 text-[#1E88E5]", appreciation: "", rentalYield: "", priceRange: "", type: "Residential", image: "", active: true, order: 0 };
const PROPERTY_TYPES = ["Residential", "Apartments", "Commercial", "Plots"];

function InvestmentForm({ initial, onCancel, onSaved }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const validationError = validateImageFile(file);
    if (validationError) { setError(validationError); return; }
    setUploading(true); setError("");
    // Reuses the "listings" folder on the shared upload Worker — avoids
    // needing a Worker redeploy just to add a new folder name.
    const { url, error: uploadError } = await uploadToR2(file, "listings");
    setUploading(false);
    if (uploadError) { setError("Image upload failed."); return; }
    setForm({ ...form, image: url });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.area) return;
    setSaving(true); setError("");
    const fn = form.dbId ? updateInvestmentOpportunity(form.dbId, form) : createInvestmentOpportunity(form);
    const { data, error } = await fn;
    setSaving(false);
    if (error) { setError("Couldn't save."); return; }
    onSaved(data);
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="City"><TextInput value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
          <Field label="Area / locality"><TextInput value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="e.g. Patia" required /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tag"><TextInput value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} placeholder="e.g. High Growth" /></Field>
          <Field label="Property type">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full text-sm px-3 py-2.5 rounded-lg" style={inputStyle}>
              {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Appreciation"><TextInput value={form.appreciation} onChange={(e) => setForm({ ...form, appreciation: e.target.value })} placeholder="e.g. +18%" /></Field>
          <Field label="Rental yield"><TextInput value={form.rentalYield} onChange={(e) => setForm({ ...form, rentalYield: e.target.value })} placeholder="e.g. 4.2%" /></Field>
          <Field label="Price range"><TextInput value={form.priceRange} onChange={(e) => setForm({ ...form, priceRange: e.target.value })} placeholder="e.g. ₹45 – 80 Lac" /></Field>
        </div>
        <Field label="Image" hint="Uploads to the same photo storage as property listings.">
          <div className="flex items-center gap-3">
            {form.image && <img src={form.image} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />}
            <input type="file" accept="image/*" onChange={handleImageChange} className="text-xs" />
            {uploading && <span className="text-xs" style={{ color: "#6B7280" }}>Uploading...</span>}
          </div>
        </Field>
        <Field label="Display order"><TextInput type="number" value={form.order} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })} className="max-w-[140px]" /></Field>
        <SaveBar onCancel={onCancel} saving={saving} error={error} />
      </form>
    </Card>
  );
}

function InvestmentsPanel() {
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  function load() { fetchAdminInvestmentOpportunities().then(({ data }) => setItems(data)); }
  useEffect(load, []);

  async function toggleActive(o) { await updateInvestmentOpportunity(o.dbId, { ...o, active: !o.active }); load(); }
  async function handleDelete(id) { await deleteInvestmentOpportunity(id); setConfirmId(null); load(); }

  if (items === null) return <EmptyState label="Loading..." />;

  return (
    <div className="space-y-4">
      {editing ? (
        <InvestmentForm initial={editing.dbId ? editing : EMPTY_INVESTMENT} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      ) : (
        <button onClick={() => setEditing(EMPTY_INVESTMENT)} className="text-sm font-bold px-4 py-2.5 rounded-xl" style={{ background: "#1E88E5", color: "#FFFFFF" }}>+ Add Opportunity</button>
      )}
      {items.length === 0 && !editing && <EmptyState label="No investment opportunities yet — add one above. The public Investment Advisory page shows built-in demo corridors until you do." />}
      {items.map((o) => (
        <Card key={o.id}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {o.image && <img src={o.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />}
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-bold" style={{ color: "#1F2937" }}>{o.area}, {o.city}</p>
                  <ActivePill active={o.active} />
                </div>
                <p className="text-xs" style={{ color: "#6B7280" }}>{o.tag} · {o.type} · {o.appreciation} appreciation · {o.priceRange}</p>
              </div>
            </div>
            <RowActions active={o.active} onEdit={() => setEditing(o)} onToggle={() => toggleActive(o)}
              onDelete={() => handleDelete(o.dbId)} confirming={confirmId === o.id} setConfirming={(v) => setConfirmId(v ? o.id : null)} />
          </div>
        </Card>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Export
// ═══════════════════════════════════════════════════════════════════════════

export default function AdminSiteContent({ onNavigate, onLogout, adminProfile }) {
  const [activeTab, setActiveTab] = useState("tiers");

  return (
    <AdminLayout
      activePage="site-content"
      onNavigate={onNavigate}
      onLogout={onLogout}
      adminProfile={adminProfile}
      title="Site Content"
      subtitle="Manage partner tiers, client reviews, subscription plans, and investment opportunities"
    >
      <div className="flex gap-2 mb-6 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="text-sm font-bold px-4 py-2 rounded-xl whitespace-nowrap transition-colors"
            style={{
              background: activeTab === tab.id ? "#1E88E5" : "#F1F5F9",
              color: activeTab === tab.id ? "#FFFFFF" : "#6B7280",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "tiers" && <TiersPanel />}
      {activeTab === "reviews" && <ReviewsPanel />}
      {activeTab === "plans" && <PlansPanel />}
      {activeTab === "investments" && <InvestmentsPanel />}
    </AdminLayout>
  );
}
