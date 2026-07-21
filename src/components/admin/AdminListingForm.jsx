import { useState } from "react";
import AdminLayout from "./AdminLayout";
import { createListing, updateListing, deleteListing } from "../../lib/listings";
import { uploadToR2, validateImageFile } from "../../lib/r2Upload";

// ── Constants ─────────────────────────────────────────────────────────────────
const PROPERTY_TYPES = ["Apartment", "Villa", "Plot", "Commercial"];
const BHK_OPTIONS = ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "4+ BHK"];
const FACING_OPTIONS = ["North", "South", "East", "West", "North-East", "North-West", "South-East", "South-West"];
const POSSESSION_OPTIONS = ["Ready to Move", "Under Construction"];
const POSTED_BY_OPTIONS = ["Owner", "Builder", "Agent"];
const MODERATION_OPTIONS = ["Live", "Pending", "Flagged", "Rejected"];
const TAGS_LIST = ["Luxury", "Affordable", "Gated Community", "Office", "Retail", "Industrial", "Co-living", "Student Accommodation"];
const AMENITIES_PRESET = ["Lift", "Parking", "Power Backup", "Security", "Swimming Pool", "Gym", "Garden", "Club House", "CCTV", "24x7 Security", "Cafeteria", "WiFi", "Housekeeping"];
const BADGE_COLOR_PRESETS = [
  { label: "Blue", value: "#2C9DD5" },
  { label: "Red", value: "#BA0D0B" },
  { label: "Orange", value: "#E87C02" },
  { label: "Green", value: "#16a34a" },
  { label: "Purple", value: "#a78bfa" },
];

const EMPTY_FORM = {
  title: "",
  location: "",
  type: "Apartment",
  transactionType: "Buy",
  priceRaw: "",
  bhk: "",
  area: "",
  floor: "",
  facing: "",
  age: "",
  status: "Ready to Move",       // possession
  postedBy: "Owner",
  moderationStatus: "Pending",
  description: "",
  tags: [],
  amenities: [],
  images: [],
  featured: false,
  verified: false,
  badge: "",
  badgeColor: "#2C9DD5",
};

// ── Small building blocks ──────────────────────────────────────────────────────
function Field({ label, children, required }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "#495057" }}>
        {label}{required && <span style={{ color: "#BA0D0B" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  background: "#FFFFFF",
  border: "1px solid #E5E8EB",
  color: "#15191C",
};

function TextInput(props) {
  return <input {...props} className={`w-full text-sm px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 ${props.className || ""}`}
    style={{ ...inputStyle, ...(props.style || {}) }} />;
}

function Select({ children, ...props }) {
  return <select {...props} className="w-full text-sm px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2" style={inputStyle}>{children}</select>;
}

function Chip({ label, active, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
      style={{
        background: active ? "#2C9DD5" : "#FFFFFF",
        color: active ? "#FFFFFF" : "#495057",
        border: `1px solid ${active ? "#2C9DD5" : "#E5E8EB"}`,
      }}
    >
      {label}
    </button>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function AdminListingForm({ onNavigate, onLogout, adminProfile, editingListing }) {
  const isEditing = !!editingListing;
  const [form, setForm] = useState(() => {
    if (!isEditing) return EMPTY_FORM;
    // editingListing.area comes back as a display string like "1865 sqft" —
    // the number input needs just the numeric part.
    const areaNumeric = editingListing.area ? parseInt(editingListing.area, 10) || "" : "";
    return { ...EMPTY_FORM, ...editingListing, area: areaNumeric };
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleInArray(key, value) {
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((x) => x !== value) : [...f[key], value],
    }));
  }

  async function handleFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadError("");
    setUploading(true);

    for (const file of files) {
      const validationError = validateImageFile(file);
      if (validationError) {
        setUploadError(validationError);
        continue;
      }
      const result = await uploadToR2(file, "listings");
      if (result.error) {
        setUploadError(result.error);
      } else {
        setForm((f) => ({ ...f, images: [...f.images, result.url] }));
      }
    }

    setUploading(false);
    e.target.value = ""; // allow re-selecting the same file again later
  }

  function removeImage(url) {
    setForm((f) => ({ ...f, images: f.images.filter((u) => u !== url) }));
  }

  function priceLabelFromRaw(raw) {
    const n = Number(raw) || 0;
    if (form.transactionType === "Rent") return `₹${n.toLocaleString("en-IN")}/month`;
    return n >= 10000000 ? `₹${(n / 10000000).toFixed(2)} Cr` : `₹${(n / 100000).toFixed(0)} Lac`;
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaveError("");

    if (!form.title || !form.location || !form.priceRaw) {
      setSaveError("Title, location, and price are required.");
      return;
    }

    setSaving(true);
    const payload = { ...form, price: priceLabelFromRaw(form.priceRaw) };

    const { error } = isEditing
      ? await updateListing(editingListing.dbId, payload)
      : await createListing(payload);

    setSaving(false);

    if (error) {
      setSaveError(error.message || "Something went wrong while saving. Check your Supabase connection.");
      return;
    }

    onNavigate("listings");
  }

  async function handleDelete() {
    setDeleting(true);
    const { error } = await deleteListing(editingListing.dbId, form.images);
    setDeleting(false);
    if (error) {
      setSaveError(error.message || "Failed to delete listing.");
      return;
    }
    onNavigate("listings");
  }

  return (
    <AdminLayout
      activePage="listings"
      onNavigate={onNavigate}
      onLogout={onLogout}
      adminProfile={adminProfile}
      title={isEditing ? "Edit Listing" : "Add Listing"}
      subtitle={isEditing ? form.title : "Create a new property listing"}
    >
      <form onSubmit={handleSave} className="max-w-4xl space-y-6">

        {saveError && (
          <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: "#FCEAEA", color: "#BA0D0B" }}>
            {saveError}
          </div>
        )}

        {/* ── Basic Info ── */}
        <div className="rounded-2xl p-6 space-y-5" style={{ background: "#FFFFFF", border: "1px solid #E5E8EB" }}>
          <h2 className="text-sm font-bold" style={{ color: "#15191C" }}>Basic Information</h2>

          <Field label="Title" required>
            <TextInput value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. 3 BHK Apartment" required />
          </Field>

          <Field label="Location" required>
            <TextInput value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Harmu Housing Colony, Ranchi" required />
          </Field>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="Listing Type">
              <Select value={form.transactionType} onChange={(e) => set("transactionType", e.target.value)}>
                <option value="Buy">For Sale (Buy)</option>
                <option value="Rent">For Rent</option>
              </Select>
            </Field>
            <Field label="Property Type">
              <Select value={form.type} onChange={(e) => set("type", e.target.value)}>
                {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="BHK">
              <Select value={form.bhk} onChange={(e) => set("bhk", e.target.value)}>
                <option value="">— N/A —</option>
                {BHK_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
              </Select>
            </Field>
            <Field label="Possession">
              <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
                {POSSESSION_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label={`Price (${form.transactionType === "Rent" ? "₹ / month" : "₹ total"})`} required>
              <TextInput type="number" min="0" value={form.priceRaw} onChange={(e) => set("priceRaw", e.target.value)} placeholder="e.g. 24000000" required />
            </Field>
            <Field label="Area (sqft)">
              <TextInput type="number" min="0" value={form.area} onChange={(e) => set("area", e.target.value)} placeholder="e.g. 1865" />
            </Field>
            <Field label="Floor">
              <TextInput value={form.floor} onChange={(e) => set("floor", e.target.value)} placeholder="e.g. 8th of 12" />
            </Field>
            <Field label="Facing">
              <Select value={form.facing} onChange={(e) => set("facing", e.target.value)}>
                <option value="">— N/A —</option>
                {FACING_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
              </Select>
            </Field>
          </div>

          {form.priceRaw && (
            <p className="text-xs" style={{ color: "#495057" }}>
              Will display as <span className="font-bold" style={{ color: "#2C9DD5" }}>{priceLabelFromRaw(form.priceRaw)}</span>
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Age of Property">
              <TextInput value={form.age} onChange={(e) => set("age", e.target.value)} placeholder="e.g. 2 years / New" />
            </Field>
            <Field label="Posted By">
              <Select value={form.postedBy} onChange={(e) => set("postedBy", e.target.value)}>
                {POSTED_BY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </Select>
            </Field>
            <Field label="Moderation Status">
              <Select value={form.moderationStatus} onChange={(e) => set("moderationStatus", e.target.value)}>
                {MODERATION_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
          </div>

          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              placeholder="A short description shown on the property detail page..."
              className="w-full text-sm px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 resize-none"
              style={inputStyle}
            />
          </Field>
        </div>

        {/* ── Photos ── */}
        <div className="rounded-2xl p-6 space-y-4" style={{ background: "#FFFFFF", border: "1px solid #E5E8EB" }}>
          <h2 className="text-sm font-bold" style={{ color: "#15191C" }}>Photos</h2>
          <p className="text-xs" style={{ color: "#495057" }}>
            Uploaded directly to Cloudflare R2. The first photo becomes the cover image shown on cards.
          </p>

          {uploadError && (
            <div className="px-3.5 py-2.5 rounded-xl text-xs font-semibold" style={{ background: "#FCEAEA", color: "#BA0D0B" }}>{uploadError}</div>
          )}

          <div className="flex flex-wrap gap-3">
            {form.images.map((url) => (
              <div key={url} className="relative w-28 h-28 rounded-xl overflow-hidden group" style={{ border: "1px solid #E5E8EB" }}>
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(url)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: "rgba(0,0,0,0.7)", color: "#FFFFFF" }}
                >
                  ×
                </button>
              </div>
            ))}

            <label
              className="w-28 h-28 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors"
              style={{ border: "1.5px dashed #E5E8EB", color: "#495057" }}
            >
              {uploading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" style={{ color: "#2C9DD5" }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                  <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-[10px] font-semibold text-center px-1">Add Photo</span>
                </>
              )}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={handleFilesSelected} className="hidden" disabled={uploading} />
            </label>
          </div>
        </div>

        {/* ── Category & Amenities ── */}
        <div className="rounded-2xl p-6 space-y-5" style={{ background: "#FFFFFF", border: "1px solid #E5E8EB" }}>
          <h2 className="text-sm font-bold" style={{ color: "#15191C" }}>Category &amp; Amenities</h2>

          <Field label="Category Tags (used by Buy/Rent nav filters)">
            <div className="flex flex-wrap gap-2">
              {TAGS_LIST.map((t) => (
                <Chip key={t} label={t} active={form.tags.includes(t)} onClick={() => toggleInArray("tags", t)} />
              ))}
            </div>
          </Field>

          <Field label="Amenities">
            <div className="flex flex-wrap gap-2">
              {AMENITIES_PRESET.map((a) => (
                <Chip key={a} label={a} active={form.amenities.includes(a)} onClick={() => toggleInArray("amenities", a)} />
              ))}
            </div>
          </Field>
        </div>

        {/* ── Display Options ── */}
        <div className="rounded-2xl p-6 space-y-5" style={{ background: "#FFFFFF", border: "1px solid #E5E8EB" }}>
          <h2 className="text-sm font-bold" style={{ color: "#15191C" }}>Display Options</h2>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer" style={{ color: "#15191C" }}>
              <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} className="w-4 h-4 rounded accent-[#2C9DD5]" />
              Featured listing
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer" style={{ color: "#15191C" }}>
              <input type="checkbox" checked={form.verified} onChange={(e) => set("verified", e.target.checked)} className="w-4 h-4 rounded accent-[#2C9DD5]" />
              Verified badge
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Badge Text (optional)">
              <TextInput value={form.badge} onChange={(e) => set("badge", e.target.value)} placeholder="e.g. New Launch, Luxury" />
            </Field>
            <Field label="Badge Color">
              <div className="flex gap-2 items-center">
                {BADGE_COLOR_PRESETS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => set("badgeColor", c.value)}
                    title={c.label}
                    className="w-7 h-7 rounded-full shrink-0 transition-transform"
                    style={{ background: c.value, border: form.badgeColor === c.value ? "2.5px solid #15191C" : "2px solid transparent" }}
                  />
                ))}
              </div>
            </Field>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-8">
          <div className="flex gap-3">
            <button type="submit" disabled={saving || uploading}
              className="px-6 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              style={{ background: "#BA0D0B", color: "#FFFFFF" }}>
              {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Listing"}
            </button>
            <button type="button" onClick={() => onNavigate("listings")}
              className="px-6 py-3 rounded-xl text-sm font-bold transition-all"
              style={{ background: "#F2F4F6", color: "#495057" }}>
              Cancel
            </button>
          </div>

          {isEditing && (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold" style={{ color: "#BA0D0B" }}>Delete this listing permanently?</span>
                <button type="button" onClick={handleDelete} disabled={deleting}
                  className="px-4 py-2 rounded-xl text-xs font-bold" style={{ background: "#BA0D0B", color: "#FFFFFF" }}>
                  {deleting ? "Deleting..." : "Yes, Delete"}
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold" style={{ background: "#F2F4F6", color: "#495057" }}>
                  Cancel
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)}
                className="text-sm font-bold hover:underline" style={{ color: "#BA0D0B" }}>
                Delete Listing
              </button>
            )
          )}
        </div>
      </form>
    </AdminLayout>
  );
}
