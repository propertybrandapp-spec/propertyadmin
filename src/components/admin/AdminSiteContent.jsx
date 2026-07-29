import { useState, useEffect } from "react";
import AdminLayout from "./AdminLayout";
import {
  fetchAdminHeroContent, updateHeroContent,
  fetchAdminHeroCards, createHeroCard, updateHeroCard, deleteHeroCard,
  fetchAdminPartnerTiers, createPartnerTier, updatePartnerTier, deletePartnerTier,
  fetchAdminClientReviews, createClientReview, updateClientReview, deleteClientReview,
  fetchAdminSubscriptionPlans, createSubscriptionPlan, updateSubscriptionPlan, deleteSubscriptionPlan,
  fetchAdminInvestmentOpportunities, createInvestmentOpportunity, updateInvestmentOpportunity, deleteInvestmentOpportunity,
  fetchAdminSiteSettings, updateSiteSettings,
  fetchAdminOfficeLocations, createOfficeLocation, updateOfficeLocation, deleteOfficeLocation,
} from "../../lib/siteContent";
import {
  FIELD_TYPES, fetchAdminListingFieldOptions, createListingFieldOption, updateListingFieldOption, deleteListingFieldOption,
} from "../../lib/listingOptions";
import { uploadToR2, validateImageFile } from "../../lib/r2Upload";

const TABS = [
  { id: "hero", label: "Hero Content" },
  { id: "hero-cards", label: "Hero Cards" },
  { id: "settings", label: "Contact & Social" },
  { id: "listing-options", label: "Listing Options" },
  { id: "tiers", label: "Partner Tiers" },
  { id: "reviews", label: "Client Reviews" },
  { id: "plans", label: "Subscription Plans" },
  { id: "investments", label: "Investment Opportunities" },
  { id: "offices", label: "Office Locations" },
];

// Known page keys the app's simple client-side router understands (see
// propertybrand/src/App.jsx) — used by the link picker below wherever an
// admin points a Hero button or card somewhere on the site.
const PAGE_OPTIONS = [
  { value: "home", label: "Home" },
  { value: "search", label: "Search / Listings" },
  { value: "post-property", label: "Post a Property" },
  { value: "channel-partner", label: "Channel Partner" },
  { value: "property-management", label: "Property Management" },
  { value: "investment-advisory", label: "Investment Advisory" },
  { value: "architects-design", label: "Home Interiors (Architects & Design)" },
  { value: "agents", label: "Preferred Agents" },
  { value: "blog", label: "Blog / Insights" },
  { value: "about", label: "About Us" },
  { value: "contact", label: "Contact Us" },
  { value: "careers", label: "Careers" },
  { value: "faq", label: "FAQ" },
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

// Picks where a button/card should go — an internal page (from the app's
// known page list) or a plain external URL. Used by Hero Cards, the Hero
// quick-action buttons, and the sidebar promo card button.
function LinkPicker({ linkType, linkValue, onChange }) {
  const type = linkType || "page";
  return (
    <div>
      <div className="flex gap-2 mb-2">
        <button type="button" onClick={() => onChange({ linkType: "page", linkValue: linkValue && type === "page" ? linkValue : PAGE_OPTIONS[0].value })}
          className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: type === "page" ? "#1F2937" : "#F1F5F9", color: type === "page" ? "#FFFFFF" : "#6B7280" }}>
          Page on this site
        </button>
        <button type="button" onClick={() => onChange({ linkType: "url", linkValue: type === "url" ? linkValue : "" })}
          className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: type === "url" ? "#1F2937" : "#F1F5F9", color: type === "url" ? "#FFFFFF" : "#6B7280" }}>
          Custom URL
        </button>
      </div>
      {type === "page" ? (
        <select value={linkValue || PAGE_OPTIONS[0].value} onChange={(e) => onChange({ linkType: "page", linkValue: e.target.value })}
          className="w-full text-sm px-3 py-2.5 rounded-lg focus:outline-none" style={inputStyle}>
          {PAGE_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      ) : (
        <TextInput value={linkValue || ""} onChange={(e) => onChange({ linkType: "url", linkValue: e.target.value })} placeholder="https://..." />
      )}
    </div>
  );
}

// Editable list of { label, linkType, linkValue } — the row of quick-action
// buttons under the Hero search bar (Explore Properties, Talk to an Expert, etc).
function QuickCtaListEditor({ items, onChange }) {
  const list = items || [];
  function update(i, patch) { onChange(list.map((c, idx) => (idx === i ? { ...c, ...patch } : c))); }
  function remove(i) { onChange(list.filter((_, idx) => idx !== i)); }
  function add() { onChange([...list, { label: "", linkType: "page", linkValue: PAGE_OPTIONS[0].value }]); }
  return (
    <div className="space-y-3">
      {list.map((c, i) => (
        <div key={i} className="rounded-lg p-3" style={{ border: "1px solid #E2E8F0" }}>
          <div className="flex items-center gap-2 mb-2">
            <TextInput value={c.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="Button label, e.g. Explore Properties" />
            <button type="button" onClick={() => remove(i)} className="text-lg font-bold px-1 shrink-0" style={{ color: "#DC2626" }}>×</button>
          </div>
          <LinkPicker linkType={c.linkType} linkValue={c.linkValue} onChange={(patch) => update(i, patch)} />
        </div>
      ))}
      {list.length === 0 && <p className="text-xs" style={{ color: "#6B7280" }}>No buttons yet.</p>}
      <button type="button" onClick={add} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: "#EFF6FF", color: "#1E88E5" }}>+ Add Button</button>
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
// Hero Content (singleton — headline, subtext, search tabs, quick CTAs, promo card)
// ═══════════════════════════════════════════════════════════════════════════

function HeroContentPanel() {
  const [content, setContent] = useState(null); // null = loading
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);

  function load() { fetchAdminHeroContent().then(({ data }) => { setContent(data); setForm(data); }); }
  useEffect(load, []);

  async function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const validationError = validateImageFile(file);
    if (validationError) { setMessage({ type: "error", text: validationError }); return; }
    setUploading(true); setMessage(null);
    // Reuses the "listings" folder on the shared upload Worker — avoids
    // needing a Worker redeploy just to add a new folder name.
    const { url, error } = await uploadToR2(file, "listings");
    setUploading(false);
    if (error) { setMessage({ type: "error", text: "Image upload failed." }); return; }
    setForm({ ...form, promoImage: url });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setMessage(null);
    const { data, error } = await updateHeroContent(content.dbId, form);
    setSaving(false);
    if (error) { setMessage({ type: "error", text: "Couldn't save." }); return; }
    setContent(data); setForm(data);
    setMessage({ type: "success", text: "Saved." });
  }

  if (content === null) return <EmptyState label="Loading..." />;
  if (!content) {
    return <EmptyState label="Hero content hasn't been set up yet — run migration_011_hero_content.sql in Supabase, then reload this page." />;
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
        <p className="text-xs" style={{ color: "#6B7280" }}>
          Controls the homepage Hero — the headline, search tabs, the quick-action buttons under the search bar, and the sidebar promo card. The property card grid below the search box is managed separately in the "Hero Cards" tab.
        </p>
        {message && (
          <div className="px-3 py-2 rounded-lg text-xs font-semibold" style={{ background: message.type === "success" ? "#F0FDF4" : "#FEE2E2", color: message.type === "success" ? "#15803D" : "#DC2626" }}>
            {message.text}
          </div>
        )}

        <p className="text-xs font-bold" style={{ color: "#1F2937" }}>Headline</p>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Prefix"><TextInput value={form.headlinePrefix} onChange={(e) => setForm({ ...form, headlinePrefix: e.target.value })} placeholder="Start your" /></Field>
          <Field label="Highlighted phrase" hint="Shown in blue"><TextInput value={form.headlineHighlight} onChange={(e) => setForm({ ...form, headlineHighlight: e.target.value })} placeholder="#DiscoverInvestGrow" /></Field>
          <Field label="Suffix"><TextInput value={form.headlineSuffix} onChange={(e) => setForm({ ...form, headlineSuffix: e.target.value })} placeholder="Journey" /></Field>
        </div>
        <Field label="Subtext"><TextInput value={form.subtext} onChange={(e) => setForm({ ...form, subtext: e.target.value })} placeholder="Discover. Invest. Build. Grow. Compare. Discuss. Decide." /></Field>

        <p className="text-xs font-bold pt-2" style={{ color: "#1F2937" }}>Search tabs</p>
        <StringListEditor items={form.searchTabs} onChange={(searchTabs) => setForm({ ...form, searchTabs })} />

        <p className="text-xs font-bold pt-2" style={{ color: "#1F2937" }}>Quick-action buttons</p>
        <QuickCtaListEditor items={form.quickCtas} onChange={(quickCtas) => setForm({ ...form, quickCtas })} />

        <p className="text-xs font-bold pt-2" style={{ color: "#1F2937" }}>Sidebar promo card</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Eyebrow text"><TextInput value={form.promoEyebrow} onChange={(e) => setForm({ ...form, promoEyebrow: e.target.value })} placeholder="Get Home Interiors from" /></Field>
          <Field label="Heading"><TextInput value={form.promoHeading} onChange={(e) => setForm({ ...form, promoHeading: e.target.value })} placeholder="Top Architects & Designers" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Badge text" hint="Small tag over the image — leave blank to hide it"><TextInput value={form.promoBadge} onChange={(e) => setForm({ ...form, promoBadge: e.target.value })} placeholder="Save 40%" /></Field>
          <Field label="Button label"><TextInput value={form.promoCtaLabel} onChange={(e) => setForm({ ...form, promoCtaLabel: e.target.value })} placeholder="Check Offers" /></Field>
        </div>
        <Field label="Image">
          <div className="flex items-center gap-3">
            {form.promoImage && <img src={form.promoImage} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />}
            <input type="file" accept="image/*" onChange={handleImageChange} className="text-xs" />
            {uploading && <span className="text-xs" style={{ color: "#6B7280" }}>Uploading...</span>}
          </div>
        </Field>
        <Field label="Button link">
          <LinkPicker linkType={form.promoCtaLinkType} linkValue={form.promoCtaLinkValue}
            onChange={({ linkType, linkValue }) => setForm({ ...form, promoCtaLinkType: linkType, promoCtaLinkValue: linkValue })} />
        </Field>

        <div className="pt-2">
          <button type="submit" disabled={saving} className="text-sm font-bold px-4 py-2.5 rounded-xl" style={{ background: "#1E88E5", color: "#FFFFFF", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Hero Cards (the property-type card grid under the Hero search box)
// ═══════════════════════════════════════════════════════════════════════════

const EMPTY_HERO_CARD = { image: "", backgroundColor: "", title: "", subtitle: "", cta: "Explore", linkType: "page", linkValue: PAGE_OPTIONS[0].value, active: true, order: 0 };

function HeroCardForm({ initial, onCancel, onSaved }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const cardStyle = form.backgroundColor ? "solid" : "image";

  async function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const validationError = validateImageFile(file);
    if (validationError) { setError(validationError); return; }
    setUploading(true); setError("");
    const { url, error: uploadError } = await uploadToR2(file, "listings");
    setUploading(false);
    if (uploadError) { setError("Image upload failed."); return; }
    setForm({ ...form, image: url, backgroundColor: "" });
  }

  function setStyle(style) {
    if (style === "solid") setForm({ ...form, image: "", backgroundColor: form.backgroundColor || "#1E88E5" });
    else setForm({ ...form, backgroundColor: "" });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title) return;
    if (cardStyle === "image" && !form.image) { setError("Add an image, or switch to a solid-color card."); return; }
    setSaving(true); setError("");
    const fn = form.dbId ? updateHeroCard(form.dbId, form) : createHeroCard(form);
    const { data, error } = await fn;
    setSaving(false);
    if (error) { setError("Couldn't save."); return; }
    onSaved(data);
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Card style">
          <div className="flex gap-2">
            <button type="button" onClick={() => setStyle("image")} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: cardStyle === "image" ? "#1F2937" : "#F1F5F9", color: cardStyle === "image" ? "#FFFFFF" : "#6B7280" }}>Photo card</button>
            <button type="button" onClick={() => setStyle("solid")} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: cardStyle === "solid" ? "#1F2937" : "#F1F5F9", color: cardStyle === "solid" ? "#FFFFFF" : "#6B7280" }}>Solid color card</button>
          </div>
        </Field>

        {cardStyle === "image" ? (
          <Field label="Image" hint="Shows as a full-bleed photo with the title/subtitle overlaid at the bottom.">
            <div className="flex items-center gap-3">
              {form.image && <img src={form.image} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />}
              <input type="file" accept="image/*" onChange={handleImageChange} className="text-xs" />
              {uploading && <span className="text-xs" style={{ color: "#6B7280" }}>Uploading...</span>}
            </div>
          </Field>
        ) : (
          <ColorInput label="Background color" value={form.backgroundColor} onChange={(v) => setForm({ ...form, backgroundColor: v })} />
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Title" hint="Big headline text, e.g. 12,400+ or a short phrase"><TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></Field>
          <Field label="Subtitle"><TextInput value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="e.g. Verified Listings" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Button label"><TextInput value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} placeholder="Explore" /></Field>
          <Field label="Display order"><TextInput type="number" value={form.order} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })} /></Field>
        </div>
        <Field label="Card links to">
          <LinkPicker linkType={form.linkType} linkValue={form.linkValue} onChange={({ linkType, linkValue }) => setForm({ ...form, linkType, linkValue })} />
        </Field>
        <SaveBar onCancel={onCancel} saving={saving} error={error} />
      </form>
    </Card>
  );
}

function HeroCardsPanel() {
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  function load() { fetchAdminHeroCards().then(({ data }) => setItems(data)); }
  useEffect(load, []);

  async function toggleActive(c) { await updateHeroCard(c.dbId, { ...c, active: !c.active }); load(); }
  async function handleDelete(id) { await deleteHeroCard(id); setConfirmId(null); load(); }

  if (items === null) return <EmptyState label="Loading..." />;

  return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: "#6B7280" }}>
        The "We've got properties for everyone" card grid on the homepage, right under the search box. Add, reorder, hide, or delete cards freely — the grid adjusts to however many are active.
      </p>
      {editing ? (
        <HeroCardForm initial={editing.dbId ? editing : EMPTY_HERO_CARD} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      ) : (
        <button onClick={() => setEditing(EMPTY_HERO_CARD)} className="text-sm font-bold px-4 py-2.5 rounded-xl" style={{ background: "#1E88E5", color: "#FFFFFF" }}>+ Add Card</button>
      )}
      {items.length === 0 && !editing && <EmptyState label="No hero cards yet — add one above. The homepage shows built-in demo cards until you do." />}
      {items.map((c) => (
        <Card key={c.id}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {c.image ? (
                <img src={c.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
              ) : (
                <span className="w-12 h-12 rounded-lg shrink-0 block" style={{ background: c.backgroundColor || "#E2E8F0" }} />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-bold" style={{ color: "#1F2937" }}>{c.title}</p>
                  <ActivePill active={c.active} />
                </div>
                <p className="text-xs" style={{ color: "#6B7280" }}>{c.subtitle}{c.cta ? ` · "${c.cta}"` : ""}</p>
              </div>
            </div>
            <RowActions active={c.active} onEdit={() => setEditing(c)} onToggle={() => toggleActive(c)}
              onDelete={() => handleDelete(c.dbId)} confirming={confirmId === c.id} setConfirming={(v) => setConfirmId(v ? c.id : null)} />
          </div>
        </Card>
      ))}
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
// Contact & Social Settings (singleton — no add/delete, just one edit form)
// ═══════════════════════════════════════════════════════════════════════════

function SettingsPanel() {
  const [settings, setSettings] = useState(null); // null = loading
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  function load() {
    fetchAdminSiteSettings().then(({ data }) => { setSettings(data); setForm(data); });
  }
  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setMessage(null);
    const { data, error } = await updateSiteSettings(settings.dbId, form);
    setSaving(false);
    if (error) { setMessage({ type: "error", text: "Couldn't save." }); return; }
    setSettings(data); setForm(data);
    setMessage({ type: "success", text: "Saved." });
  }

  if (settings === null) return <EmptyState label="Loading..." />;
  if (!settings) {
    return <EmptyState label="Site settings haven't been set up yet — run migration_009_site_settings.sql in Supabase, then reload this page." />;
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
        <p className="text-xs" style={{ color: "#6B7280" }}>
          Shown in the Footer and Contact Us page across the public site — including the social icons in the footer, which will keep pointing nowhere useful until you add real URLs here.
        </p>
        {message && (
          <div className="px-3 py-2 rounded-lg text-xs font-semibold" style={{ background: message.type === "success" ? "#F0FDF4" : "#FEE2E2", color: message.type === "success" ? "#15803D" : "#DC2626" }}>
            {message.text}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone"><TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 94301 00000" /></Field>
          <Field label="WhatsApp"><TextInput value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+91 98765 00000" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email"><TextInput value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="info@propertybrands.in" /></Field>
          <Field label="Website"><TextInput value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="www.propertybrands.in" /></Field>
        </div>
        <Field label="Corporate address"><TextArea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
        <Field label="Business hours"><TextInput value={form.businessHours} onChange={(e) => setForm({ ...form, businessHours: e.target.value })} placeholder="Mon – Sat, 9:00 AM – 7:00 PM" /></Field>
        <p className="text-xs font-bold pt-2" style={{ color: "#1F2937" }}>Social media (leave blank to hide the icon)</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Facebook URL"><TextInput value={form.facebook} onChange={(e) => setForm({ ...form, facebook: e.target.value })} placeholder="https://facebook.com/yourpage" /></Field>
          <Field label="Instagram URL"><TextInput value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} placeholder="https://instagram.com/yourpage" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="LinkedIn URL"><TextInput value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} placeholder="https://linkedin.com/company/yourpage" /></Field>
          <Field label="YouTube URL"><TextInput value={form.youtube} onChange={(e) => setForm({ ...form, youtube: e.target.value })} placeholder="https://youtube.com/@yourchannel" /></Field>
        </div>
        <div className="pt-2">
          <button type="submit" disabled={saving} className="text-sm font-bold px-4 py-2.5 rounded-xl" style={{ background: "#1E88E5", color: "#FFFFFF", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Office Locations
// ═══════════════════════════════════════════════════════════════════════════

const EMPTY_OFFICE = { city: "", address: "", phone: "", active: true, order: 0 };

function OfficeForm({ initial, onCancel, onSaved }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.city || !form.address) return;
    setSaving(true); setError("");
    const fn = form.dbId ? updateOfficeLocation(form.dbId, form) : createOfficeLocation(form);
    const { data, error } = await fn;
    setSaving(false);
    if (error) { setError("Couldn't save."); return; }
    onSaved(data);
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="City"><TextInput value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required /></Field>
          <Field label="Phone"><TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        </div>
        <Field label="Address"><TextInput value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required /></Field>
        <Field label="Display order"><TextInput type="number" value={form.order} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })} className="max-w-[140px]" /></Field>
        <SaveBar onCancel={onCancel} saving={saving} error={error} />
      </form>
    </Card>
  );
}

function OfficesPanel() {
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  function load() { fetchAdminOfficeLocations().then(({ data }) => setItems(data)); }
  useEffect(load, []);

  async function toggleActive(o) { await updateOfficeLocation(o.dbId, { ...o, active: !o.active }); load(); }
  async function handleDelete(id) { await deleteOfficeLocation(id); setConfirmId(null); load(); }

  if (items === null) return <EmptyState label="Loading..." />;

  return (
    <div className="space-y-4">
      {editing ? (
        <OfficeForm initial={editing.dbId ? editing : EMPTY_OFFICE} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      ) : (
        <button onClick={() => setEditing(EMPTY_OFFICE)} className="text-sm font-bold px-4 py-2.5 rounded-xl" style={{ background: "#1E88E5", color: "#FFFFFF" }}>+ Add Office</button>
      )}
      {items.length === 0 && !editing && <EmptyState label="No office locations yet — add one above." />}
      {items.map((o) => (
        <Card key={o.id}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-bold" style={{ color: "#1F2937" }}>{o.city}</p>
                <ActivePill active={o.active} />
              </div>
              <p className="text-xs" style={{ color: "#6B7280" }}>{o.address}{o.phone ? ` · ${o.phone}` : ""}</p>
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
// Listing Options (property types, BHK, amenities, tags)
// ═══════════════════════════════════════════════════════════════════════════

function ListingOptionsPanel() {
  const [items, setItems] = useState(null);
  const [activeType, setActiveType] = useState("property_type");
  const [draft, setDraft] = useState("");

  function load() { fetchAdminListingFieldOptions().then(({ data }) => setItems(data)); }
  useEffect(load, []);

  async function handleAdd() {
    if (!draft.trim()) return;
    await createListingFieldOption(activeType, draft.trim());
    setDraft("");
    load();
  }
  async function toggleActive(o) { await updateListingFieldOption(o.dbId, { active: !o.active }); load(); }
  async function handleDelete(id) { await deleteListingFieldOption(id); load(); }

  if (items === null) return <EmptyState label="Loading..." />;
  const filtered = items.filter((o) => o.fieldType === activeType);

  return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: "#6B7280" }}>
        These populate the dropdowns and checklists in "Post Property" (public site) and the admin listing form. Hiding an option keeps it on existing listings but removes it from the picker for new ones.
      </p>
      <div className="flex gap-2 flex-wrap">
        {FIELD_TYPES.map((ft) => (
          <button
            key={ft.id}
            onClick={() => setActiveType(ft.id)}
            className="text-xs font-bold px-3 py-1.5 rounded-lg"
            style={{ background: activeType === ft.id ? "#1F2937" : "#F1F5F9", color: activeType === ft.id ? "#FFFFFF" : "#6B7280" }}
          >
            {ft.label}
          </button>
        ))}
      </div>
      <Card>
        <div className="flex gap-2 mb-4">
          <TextInput
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Add a new ${FIELD_TYPES.find((f) => f.id === activeType)?.label.toLowerCase().replace(/s$/, "")}...`}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
          />
          <button onClick={handleAdd} className="text-xs font-bold px-4 rounded-lg shrink-0" style={{ background: "#1E88E5", color: "#FFFFFF" }}>Add</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {filtered.map((o) => (
            <span
              key={o.id}
              className="flex items-center gap-2 text-xs font-semibold pl-3 pr-2 py-1.5 rounded-lg"
              style={{ background: o.active ? "#EFF6FF" : "#F1F5F9", color: o.active ? "#1E88E5" : "#6B7280" }}
            >
              {o.value}
              <button onClick={() => toggleActive(o)} className="text-[10px] font-bold underline">{o.active ? "Hide" : "Show"}</button>
              <button onClick={() => handleDelete(o.dbId)} className="text-sm font-bold" style={{ color: "#DC2626" }}>×</button>
            </span>
          ))}
          {filtered.length === 0 && <span className="text-xs" style={{ color: "#6B7280" }}>No options yet — add one above.</span>}
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Export
// ═══════════════════════════════════════════════════════════════════════════

export default function AdminSiteContent({ onNavigate, onLogout, adminProfile }) {
  const [activeTab, setActiveTab] = useState("hero");

  return (
    <AdminLayout
      activePage="site-content"
      onNavigate={onNavigate}
      onLogout={onLogout}
      adminProfile={adminProfile}
      title="Site Content"
      subtitle="Manage the homepage Hero, partner tiers, client reviews, subscription plans, and investment opportunities"
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

      {activeTab === "hero" && <HeroContentPanel />}
      {activeTab === "hero-cards" && <HeroCardsPanel />}
      {activeTab === "settings" && <SettingsPanel />}
      {activeTab === "listing-options" && <ListingOptionsPanel />}
      {activeTab === "tiers" && <TiersPanel />}
      {activeTab === "reviews" && <ReviewsPanel />}
      {activeTab === "plans" && <PlansPanel />}
      {activeTab === "investments" && <InvestmentsPanel />}
      {activeTab === "offices" && <OfficesPanel />}
    </AdminLayout>
  );
}
