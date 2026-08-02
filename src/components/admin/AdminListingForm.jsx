import { useState, useEffect } from "react";
import AdminLayout from "./AdminLayout";
import { createListing, updateListing, deleteListing } from "../../lib/listings";
import { uploadToR2, validateImageFile } from "../../lib/r2Upload";
import { fetchActiveListingFieldOptionsGrouped } from "../../lib/listingOptions";
import LocationPicker from "./LocationPicker";

// ── Constants ─────────────────────────────────────────────────────────────────
// Fallback defaults — used until the dynamic options load (or if "Site
// Content" → Listing Options is still empty). Manage the live lists from
// that admin tab instead of editing these.
const DEFAULT_PROPERTY_TYPES = ["Apartment", "Villa", "Independent House", "Plot", "Commercial", "Office Space", "Shop / Showroom", "Warehouse / Industrial Shed", "Farmhouse", "Penthouse", "Studio Apartment", "Agricultural Land", "Office", "Retail", "Industrial", "Co-living", "Student Accommodation"];
const DEFAULT_BHK_OPTIONS = ["1 RK", "1 BHK", "2 BHK", "3 BHK", "4 BHK", "5 BHK", "5+ BHK"];
const DEFAULT_TAGS_LIST = ["Luxury", "Affordable", "Gated Community", "Office", "Retail", "Industrial", "Co-living", "Student Accommodation", "New Launch", "Ready to Move", "RERA Approved", "Corner Plot", "Investment Opportunity"];
const DEFAULT_AMENITIES = ["Lift", "Parking", "Visitor Parking", "Power Backup", "Security", "24x7 Security", "CCTV", "Intercom", "Swimming Pool", "Gym", "Garden", "Club House", "Multipurpose Hall", "Indoor Games", "Kids Play Area", "Jogging Track", "Amphitheatre", "Yoga / Meditation Area", "Senior Citizen Sitout", "Cafeteria", "WiFi", "Housekeeping", "Fire Safety", "Rain Water Harvesting", "Sewage Treatment Plant", "Solar Water Heating", "EV Charging Point", "Water Softener Plant", "Vaastu Compliant", "Pet Friendly", "Gated Community"];
const FACING_OPTIONS = ["North", "South", "East", "West", "North-East", "North-West", "South-East", "South-West"];
const POSSESSION_OPTIONS = ["Ready to Move", "Under Construction"];
const POSTED_BY_OPTIONS = ["Owner", "Builder", "Agent"];
const MODERATION_OPTIONS = ["Live", "Pending", "Flagged", "Rejected"];
// ── New in Section 2A: Property Identity & Basic Details ──
const LISTING_TYPE_OPTIONS = ["Sale", "Rent", "Lease", "Resale", "New Launch", "Under Construction"];
const VASTU_OPTIONS = ["Vastu Compliant", "Not Vastu Compliant", "Not Specified"];
const FURNISHING_OPTIONS = ["Unfurnished", "Semi-furnished", "Fully furnished"];
const CONDITION_OPTIONS = ["New", "Renovated", "Well maintained", "Needs renovation"];
// ── New in Section 2B: Price & Financial Transparency ──
const PRICE_TYPE_OPTIONS = ["All-Inclusive", "Base Price"];
const MAINTENANCE_FREQUENCY_OPTIONS = ["Monthly", "Quarterly", "Half-Yearly", "Annually"];
const BROKERAGE_TYPE_OPTIONS = ["None", "One Month Rent", "Fixed Amount", "Percentage of Rent"];
const APPRECIATION_OPTIONS = ["Low", "Moderate", "High", "Very High"];
const BANK_PRESETS = ["SBI", "HDFC", "ICICI", "Axis Bank", "Bank of Baroda", "Punjab National Bank", "Kotak Mahindra", "LIC Housing Finance", "IDFC First", "Yes Bank"];
const BADGE_COLOR_PRESETS = [
  { label: "Blue", value: "#1E88E5" },
  { label: "Green", value: "#16A34A" },
  { label: "Orange", value: "#F59E0B" },
  { label: "Gold", value: "#D4AF37" },
  { label: "Red", value: "#DC2626" },
  { label: "Purple", value: "#a78bfa" },
];

const EMPTY_FORM = {
  title: "",
  location: "",
  type: "Apartment",
  transactionType: "Buy",
  listingType: "Sale",
  priceRaw: "",
  bhk: [],
  area: "",
  floor: "",
  facing: "",
  age: "",
  status: "Ready to Move",       // possession
  postedBy: "Owner",
  moderationStatus: "Pending",
  description: "",
  googleMapsLink: "",
  latitude: null,
  longitude: null,
  videoUrls: [],
  tags: [],
  amenities: [],
  images: [],
  featured: false,
  verified: false,
  badge: "",
  badgeColor: "#1E88E5",

  // ── Section 2A: Property Identity & Basic Details ──
  listingCode: "",          // read-only, server-generated — never submitted
  projectName: "",
  towerBlock: "",
  unitNumber: "",
  unitNumberPublic: true,
  bathrooms: "",
  balconies: "",
  servantRoom: false,
  builtUpArea: "",
  superBuiltUpArea: "",
  carpetArea: "",
  plotArea: "",
  floorNumber: "",
  totalFloors: "",
  totalUnits: "",
  entranceDirection: "",
  vastuStatus: "Not Specified",
  furnishing: "",
  condition: "",

  // ── Section 2B: Price & Financial Transparency ──
  priceNegotiable: false,
  priceType: "All-Inclusive",
  costBase: "",
  costFloorRise: "",
  costParking: "",
  costClubhouse: "",
  costPlc: "",
  costGst: "",
  costRegistration: "",
  costMaintenanceDeposit: "",
  costOther: "",
  costOtherLabel: "",
  maintenanceAmount: "",
  maintenanceFrequency: "Monthly",
  securityDeposit: "",
  brokerageType: "None",
  brokerageAmount: "",
  lockInPeriod: "",
  noticePeriod: "",
  leaseTerms: "",
  emiInterestRate: 8.5,
  emiTenureYears: 20,
  emiDownPaymentPercent: 20,
  approvedBanks: [],
  loanEligibilityNotes: "",
  estimatedMonthlyRent: "",
  appreciationPotential: "",
  recommendedHoldingPeriod: "",
};

// ── Small building blocks ──────────────────────────────────────────────────────
function Field({ label, children, required, hint }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "#6B7280" }}>
        {label}{required && <span style={{ color: "#DC2626" }}> *</span>}
      </label>
      {children}
      {hint && <p className="text-xs mt-1.5" style={{ color: "#6B7280" }}>{hint}</p>}
    </div>
  );
}

const inputStyle = {
  background: "#FFFFFF",
  border: "1px solid #E2E8F0",
  color: "#1F2937",
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
        background: active ? "#1E88E5" : "#FFFFFF",
        color: active ? "#FFFFFF" : "#6B7280",
        border: `1px solid ${active ? "#1E88E5" : "#E2E8F0"}`,
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
    // Nullable DB-backed fields come back as `null` from normalizeListing —
    // swap those for "" so number/text inputs stay controlled (avoids the
    // "value prop should not be null" React warning).
    const nullToEmpty = (v) => (v === null || v === undefined ? "" : v);
    return {
      ...EMPTY_FORM,
      ...editingListing,
      area: areaNumeric,
      listingCode: nullToEmpty(editingListing.listingCode),
      listingType: nullToEmpty(editingListing.listingType) || EMPTY_FORM.listingType,
      projectName: nullToEmpty(editingListing.projectName),
      towerBlock: nullToEmpty(editingListing.towerBlock),
      unitNumber: nullToEmpty(editingListing.unitNumber),
      bathrooms: nullToEmpty(editingListing.bathrooms),
      balconies: nullToEmpty(editingListing.balconies),
      builtUpArea: nullToEmpty(editingListing.builtUpArea),
      superBuiltUpArea: nullToEmpty(editingListing.superBuiltUpArea),
      carpetArea: nullToEmpty(editingListing.carpetArea),
      plotArea: nullToEmpty(editingListing.plotArea),
      floorNumber: nullToEmpty(editingListing.floorNumber),
      totalFloors: nullToEmpty(editingListing.totalFloors),
      totalUnits: nullToEmpty(editingListing.totalUnits),
      entranceDirection: nullToEmpty(editingListing.entranceDirection),
      vastuStatus: nullToEmpty(editingListing.vastuStatus) || EMPTY_FORM.vastuStatus,
      furnishing: nullToEmpty(editingListing.furnishing),
      condition: nullToEmpty(editingListing.condition),
      costBase: nullToEmpty(editingListing.costBase),
      costFloorRise: nullToEmpty(editingListing.costFloorRise),
      costParking: nullToEmpty(editingListing.costParking),
      costClubhouse: nullToEmpty(editingListing.costClubhouse),
      costPlc: nullToEmpty(editingListing.costPlc),
      costGst: nullToEmpty(editingListing.costGst),
      costRegistration: nullToEmpty(editingListing.costRegistration),
      costMaintenanceDeposit: nullToEmpty(editingListing.costMaintenanceDeposit),
      costOther: nullToEmpty(editingListing.costOther),
      costOtherLabel: nullToEmpty(editingListing.costOtherLabel),
      maintenanceAmount: nullToEmpty(editingListing.maintenanceAmount),
      securityDeposit: nullToEmpty(editingListing.securityDeposit),
      brokerageAmount: nullToEmpty(editingListing.brokerageAmount),
      lockInPeriod: nullToEmpty(editingListing.lockInPeriod),
      noticePeriod: nullToEmpty(editingListing.noticePeriod),
      leaseTerms: nullToEmpty(editingListing.leaseTerms),
      emiInterestRate: editingListing.emiInterestRate ?? EMPTY_FORM.emiInterestRate,
      emiTenureYears: editingListing.emiTenureYears ?? EMPTY_FORM.emiTenureYears,
      emiDownPaymentPercent: editingListing.emiDownPaymentPercent ?? EMPTY_FORM.emiDownPaymentPercent,
      approvedBanks: Array.isArray(editingListing.approvedBanks) ? editingListing.approvedBanks : [],
      loanEligibilityNotes: nullToEmpty(editingListing.loanEligibilityNotes),
      estimatedMonthlyRent: nullToEmpty(editingListing.estimatedMonthlyRent),
      recommendedHoldingPeriod: nullToEmpty(editingListing.recommendedHoldingPeriod),
    };
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [options, setOptions] = useState(null); // null = loading
  const [videoDraft, setVideoDraft] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchActiveListingFieldOptionsGrouped().then(({ data }) => { if (!cancelled) setOptions(data); });
    return () => { cancelled = true; };
  }, []);

  const PROPERTY_TYPES = options?.propertyTypes?.length ? options.propertyTypes : DEFAULT_PROPERTY_TYPES;
  const BHK_OPTIONS = options?.bhkOptions?.length ? options.bhkOptions : DEFAULT_BHK_OPTIONS;
  const TAGS_LIST = options?.tags?.length ? options.tags : DEFAULT_TAGS_LIST;
  const AMENITIES_PRESET = options?.amenities?.length ? options.amenities : DEFAULT_AMENITIES;

  function addVideoUrl() {
    if (!videoDraft.trim()) return;
    setForm((f) => ({ ...f, videoUrls: [...f.videoUrls, videoDraft.trim()] }));
    setVideoDraft("");
  }

  function removeVideoUrl(url) {
    setForm((f) => ({ ...f, videoUrls: f.videoUrls.filter((u) => u !== url) }));
  }

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

  // ── Section 2B live previews ── computed straight from current form state,
  // so admins see the effect of what they type without needing to save first.
  // (The real price_per_sqft / rental_yield_percent are DB-generated columns —
  // these are just client-side estimates shown ahead of that.)
  function estimatedAreaSqft() {
    return Number(form.builtUpArea) || Number(form.superBuiltUpArea) || Number(form.carpetArea) || Number(form.plotArea) || null;
  }

  function pricePerSqftPreview() {
    const area = estimatedAreaSqft();
    const price = Number(form.priceRaw) || 0;
    if (!area || !price) return null;
    return Math.round(price / area);
  }

  function emiPreview() {
    const price = Number(form.priceRaw) || 0;
    const rate = Number(form.emiInterestRate) || 0;
    const years = Number(form.emiTenureYears) || 0;
    const downPct = Number(form.emiDownPaymentPercent) || 0;
    if (!price || !years) return null;
    const principal = price * (1 - downPct / 100);
    const monthlyRate = rate / 100 / 12;
    const months = years * 12;
    if (monthlyRate === 0) return Math.round(principal / months);
    const factor = Math.pow(1 + monthlyRate, months);
    const emi = (principal * monthlyRate * factor) / (factor - 1);
    return isFinite(emi) && emi > 0 ? Math.round(emi) : null;
  }

  function downPaymentPreview() {
    const price = Number(form.priceRaw) || 0;
    const downPct = Number(form.emiDownPaymentPercent) || 0;
    if (!price) return null;
    return Math.round(price * (downPct / 100));
  }

  function rentalYieldPreview() {
    const price = Number(form.priceRaw) || 0;
    const rent = Number(form.estimatedMonthlyRent) || 0;
    if (!price || !rent) return null;
    return ((rent * 12 / price) * 100).toFixed(2);
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
          <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: "#FEE2E2", color: "#DC2626" }}>
            {saveError}
          </div>
        )}

        {/* ── Basic Info ── */}
        <div className="rounded-2xl p-6 space-y-5" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
          <h2 className="text-sm font-bold" style={{ color: "#1F2937" }}>Basic Information</h2>

          <Field label="Title" required>
            <TextInput value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. 3 BHK Apartment" required />
          </Field>

          <Field label="Location" required>
            <TextInput value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Patia, Bhubaneswar" required />
          </Field>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Transaction Type" hint="Drives the site's Buy/Rent nav filter.">
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
            <Field label="Possession">
              <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
                {POSSESSION_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </Select>
            </Field>
          </div>

          <Field label="BHK" hint="Select all that apply — e.g. a project offering both 2 BHK and 3 BHK units.">
            <div className="flex flex-wrap gap-2">
              {BHK_OPTIONS.map((b) => (
                <Chip key={b} label={b} active={form.bhk.includes(b)} onClick={() => toggleInArray("bhk", b)} />
              ))}
            </div>
          </Field>

          <Field label="Pin Location on Map" hint="Powers the interactive map shown on the property's public page.">
            <LocationPicker
              latitude={form.latitude}
              longitude={form.longitude}
              onChange={({ latitude, longitude }) => setForm((f) => ({ ...f, latitude, longitude }))}
            />
          </Field>

          <Field label="Google Maps Link (optional)" hint="Only needed to make the &quot;Get Directions&quot; button open a specific saved link instead of the pin above.">
            <TextInput value={form.googleMapsLink} onChange={(e) => set("googleMapsLink", e.target.value)} placeholder="Paste a Google Maps share link (optional)" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label={`Price (${form.transactionType === "Rent" ? "₹ / month" : "₹ total"})`} required>
              <TextInput type="number" min="0" value={form.priceRaw} onChange={(e) => set("priceRaw", e.target.value)} placeholder="e.g. 24000000" required />
            </Field>
          </div>

          {form.priceRaw && (
            <p className="text-xs" style={{ color: "#6B7280" }}>
              Will display as <span className="font-bold" style={{ color: "#1E88E5" }}>{priceLabelFromRaw(form.priceRaw)}</span>
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
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

        {/* ── Property Identity & Configuration (Section 2A) ── */}
        <div className="rounded-2xl p-6 space-y-5" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color: "#1F2937" }}>Property Identity &amp; Configuration</h2>
            <p className="text-xs mt-1" style={{ color: "#6B7280" }}>Project identity, room configuration, area breakdown, and structural details.</p>
          </div>

          {isEditing && form.listingCode && (
            <Field label="Listing ID" hint="Auto-assigned when the listing was created — not editable.">
              <div className="text-sm font-bold px-3.5 py-2.5 rounded-xl" style={{ background: "#F1F5F9", color: "#1F2937" }}>{form.listingCode}</div>
            </Field>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Project Name" hint="Optional — e.g. builder project name.">
              <TextInput value={form.projectName} onChange={(e) => set("projectName", e.target.value)} placeholder="e.g. Skyline Residency" />
            </Field>
            <Field label="Tower / Block">
              <TextInput value={form.towerBlock} onChange={(e) => set("towerBlock", e.target.value)} placeholder="e.g. Tower B" />
            </Field>
            <Field label="Unit Number">
              <TextInput value={form.unitNumber} onChange={(e) => set("unitNumber", e.target.value)} placeholder="e.g. 1204" />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer" style={{ color: "#1F2937" }}>
            <input type="checkbox" checked={form.unitNumberPublic} onChange={(e) => set("unitNumberPublic", e.target.checked)} className="w-4 h-4 rounded accent-[#1E88E5]" />
            Show unit number on the public listing
          </label>

          <Field label="Listing Type" hint="Independent of Transaction Type / Possession above — the richer classification used for badges and filters.">
            <Select value={form.listingType} onChange={(e) => set("listingType", e.target.value)}>
              {LISTING_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Bathrooms">
              <TextInput type="number" min="0" value={form.bathrooms} onChange={(e) => set("bathrooms", e.target.value)} placeholder="e.g. 2" />
            </Field>
            <Field label="Balconies">
              <TextInput type="number" min="0" value={form.balconies} onChange={(e) => set("balconies", e.target.value)} placeholder="e.g. 1" />
            </Field>
            <div className="flex items-end pb-2.5">
              <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer" style={{ color: "#1F2937" }}>
                <input type="checkbox" checked={form.servantRoom} onChange={(e) => set("servantRoom", e.target.checked)} className="w-4 h-4 rounded accent-[#1E88E5]" />
                Servant Room
              </label>
            </div>
          </div>

          <Field label="Area Breakdown (sqft)" hint="Fill in whichever apply — e.g. plots typically only need Plot Area.">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <TextInput type="number" min="0" value={form.builtUpArea} onChange={(e) => set("builtUpArea", e.target.value)} placeholder="Built-up" />
              <TextInput type="number" min="0" value={form.superBuiltUpArea} onChange={(e) => set("superBuiltUpArea", e.target.value)} placeholder="Super Built-up" />
              <TextInput type="number" min="0" value={form.carpetArea} onChange={(e) => set("carpetArea", e.target.value)} placeholder="Carpet" />
              <TextInput type="number" min="0" value={form.plotArea} onChange={(e) => set("plotArea", e.target.value)} placeholder="Plot" />
            </div>
          </Field>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Floor Number" hint="0 = ground floor">
              <TextInput type="number" min="0" value={form.floorNumber} onChange={(e) => set("floorNumber", e.target.value)} placeholder="e.g. 8" />
            </Field>
            <Field label="Total Floors">
              <TextInput type="number" min="0" value={form.totalFloors} onChange={(e) => set("totalFloors", e.target.value)} placeholder="e.g. 12" />
            </Field>
            <Field label="Total Units in Project">
              <TextInput type="number" min="0" value={form.totalUnits} onChange={(e) => set("totalUnits", e.target.value)} placeholder="e.g. 240" />
            </Field>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Facing">
              <Select value={form.facing} onChange={(e) => set("facing", e.target.value)}>
                <option value="">— N/A —</option>
                {FACING_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
              </Select>
            </Field>
            <Field label="Entrance Direction">
              <Select value={form.entranceDirection} onChange={(e) => set("entranceDirection", e.target.value)}>
                <option value="">— N/A —</option>
                {FACING_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
              </Select>
            </Field>
            <Field label="Vastu Status">
              <Select value={form.vastuStatus} onChange={(e) => set("vastuStatus", e.target.value)}>
                {VASTU_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Furnishing">
              <Select value={form.furnishing} onChange={(e) => set("furnishing", e.target.value)}>
                <option value="">— N/A —</option>
                {FURNISHING_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
              </Select>
            </Field>
            <Field label="Condition">
              <Select value={form.condition} onChange={(e) => set("condition", e.target.value)}>
                <option value="">— N/A —</option>
                {CONDITION_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Age of Property">
              <TextInput value={form.age} onChange={(e) => set("age", e.target.value)} placeholder="e.g. 2 years / New" />
            </Field>
          </div>
        </div>

        {/* ── Price & Financial Transparency (Section 2B) ── */}
        <div className="rounded-2xl p-6 space-y-5" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color: "#1F2937" }}>Price &amp; Financial Transparency</h2>
            <p className="text-xs mt-1" style={{ color: "#6B7280" }}>Cost breakup, maintenance, EMI assumptions, and investment indicators.</p>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer" style={{ color: "#1F2937" }}>
              <input type="checkbox" checked={form.priceNegotiable} onChange={(e) => set("priceNegotiable", e.target.checked)} className="w-4 h-4 rounded accent-[#1E88E5]" />
              Price is negotiable
            </label>
            <div className="flex-1 min-w-[180px]">
              <Field label="Price Type">
                <Select value={form.priceType} onChange={(e) => set("priceType", e.target.value)}>
                  {PRICE_TYPE_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </Select>
              </Field>
            </div>
          </div>

          {pricePerSqftPreview() && (
            <p className="text-xs" style={{ color: "#6B7280" }}>
              Price per sqft: <span className="font-bold" style={{ color: "#1E88E5" }}>₹{pricePerSqftPreview().toLocaleString("en-IN")}/sqft</span>
              {" "}— auto-computed from Price and Area, saved automatically.
            </p>
          )}

          <Field label="Cost Breakup" hint="All optional — fill in whichever line items apply to this property.">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <TextInput type="number" min="0" value={form.costBase} onChange={(e) => set("costBase", e.target.value)} placeholder="Base Cost" />
              <TextInput type="number" min="0" value={form.costFloorRise} onChange={(e) => set("costFloorRise", e.target.value)} placeholder="Floor Rise" />
              <TextInput type="number" min="0" value={form.costParking} onChange={(e) => set("costParking", e.target.value)} placeholder="Parking" />
              <TextInput type="number" min="0" value={form.costClubhouse} onChange={(e) => set("costClubhouse", e.target.value)} placeholder="Clubhouse" />
              <TextInput type="number" min="0" value={form.costPlc} onChange={(e) => set("costPlc", e.target.value)} placeholder="PLC" />
              <TextInput type="number" min="0" value={form.costGst} onChange={(e) => set("costGst", e.target.value)} placeholder="GST" />
              <TextInput type="number" min="0" value={form.costRegistration} onChange={(e) => set("costRegistration", e.target.value)} placeholder="Registration" />
              <TextInput type="number" min="0" value={form.costMaintenanceDeposit} onChange={(e) => set("costMaintenanceDeposit", e.target.value)} placeholder="Maintenance Deposit" />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <TextInput type="number" min="0" value={form.costOther} onChange={(e) => set("costOther", e.target.value)} placeholder="Other Charges" />
              <TextInput value={form.costOtherLabel} onChange={(e) => set("costOtherLabel", e.target.value)} placeholder="What does 'Other' cover?" />
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Monthly Maintenance">
              <TextInput type="number" min="0" value={form.maintenanceAmount} onChange={(e) => set("maintenanceAmount", e.target.value)} placeholder="e.g. 3500" />
            </Field>
            <Field label="Maintenance Frequency">
              <Select value={form.maintenanceFrequency} onChange={(e) => set("maintenanceFrequency", e.target.value)}>
                {MAINTENANCE_FREQUENCY_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </Field>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "#6B7280" }}>Rental Terms <span className="normal-case font-normal">(for Rent / Lease listings)</span></h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="Security Deposit">
                <TextInput type="number" min="0" value={form.securityDeposit} onChange={(e) => set("securityDeposit", e.target.value)} placeholder="e.g. 100000" />
              </Field>
              <Field label="Brokerage">
                <Select value={form.brokerageType} onChange={(e) => set("brokerageType", e.target.value)}>
                  {BROKERAGE_TYPE_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
                </Select>
              </Field>
              {(form.brokerageType === "Fixed Amount" || form.brokerageType === "Percentage of Rent") && (
                <Field label={form.brokerageType === "Percentage of Rent" ? "Brokerage (%)" : "Brokerage (₹)"}>
                  <TextInput type="number" min="0" value={form.brokerageAmount} onChange={(e) => set("brokerageAmount", e.target.value)} />
                </Field>
              )}
              <Field label="Lock-in Period">
                <TextInput value={form.lockInPeriod} onChange={(e) => set("lockInPeriod", e.target.value)} placeholder="e.g. 11 months" />
              </Field>
              <Field label="Notice Period">
                <TextInput value={form.noticePeriod} onChange={(e) => set("noticePeriod", e.target.value)} placeholder="e.g. 1 month" />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Other Lease Terms" hint="Escalation clause, renewal terms, restrictions, etc.">
                <textarea value={form.leaseTerms} onChange={(e) => set("leaseTerms", e.target.value)} rows={2}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 resize-none" style={inputStyle} />
              </Field>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "#6B7280" }}>EMI Assumptions <span className="normal-case font-normal">(shown on the property's public page)</span></h3>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Interest Rate (% p.a.)">
                <TextInput type="number" min="0" step="0.1" value={form.emiInterestRate} onChange={(e) => set("emiInterestRate", e.target.value)} />
              </Field>
              <Field label="Tenure (years)">
                <TextInput type="number" min="1" value={form.emiTenureYears} onChange={(e) => set("emiTenureYears", e.target.value)} />
              </Field>
              <Field label="Down Payment (%)">
                <TextInput type="number" min="0" max="100" value={form.emiDownPaymentPercent} onChange={(e) => set("emiDownPaymentPercent", e.target.value)} />
              </Field>
            </div>
            {(emiPreview() || downPaymentPreview()) && (
              <p className="text-xs mt-2" style={{ color: "#6B7280" }}>
                {downPaymentPreview() && <>Down payment ≈ <span className="font-bold" style={{ color: "#1E88E5" }}>₹{downPaymentPreview().toLocaleString("en-IN")}</span>. </>}
                {emiPreview() && <>Estimated EMI ≈ <span className="font-bold" style={{ color: "#1E88E5" }}>₹{emiPreview().toLocaleString("en-IN")}/month</span>.</>}
              </p>
            )}
          </div>

          <Field label="Loan Eligibility — Approved Banks" hint="Select banks that have pre-approved this project, if known.">
            <div className="flex flex-wrap gap-2">
              {BANK_PRESETS.map((b) => (
                <Chip key={b} label={b} active={form.approvedBanks.includes(b)} onClick={() => toggleInArray("approvedBanks", b)} />
              ))}
            </div>
          </Field>

          <Field label="Loan Eligibility Notes">
            <TextInput value={form.loanEligibilityNotes} onChange={(e) => set("loanEligibilityNotes", e.target.value)} placeholder="e.g. Pre-approved by SBI up to 80% LTV" />
          </Field>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "#6B7280" }}>Investment Indicators</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Estimated Monthly Rent" hint="Used to compute rental yield below.">
                <TextInput type="number" min="0" value={form.estimatedMonthlyRent} onChange={(e) => set("estimatedMonthlyRent", e.target.value)} placeholder="e.g. 25000" />
              </Field>
              <Field label="Appreciation Potential">
                <Select value={form.appreciationPotential} onChange={(e) => set("appreciationPotential", e.target.value)}>
                  <option value="">— N/A —</option>
                  {APPRECIATION_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                </Select>
              </Field>
              <Field label="Recommended Holding Period">
                <TextInput value={form.recommendedHoldingPeriod} onChange={(e) => set("recommendedHoldingPeriod", e.target.value)} placeholder="e.g. 5-7 years" />
              </Field>
            </div>
            {rentalYieldPreview() && (
              <p className="text-xs mt-2" style={{ color: "#6B7280" }}>
                Estimated rental yield: <span className="font-bold" style={{ color: "#1E88E5" }}>{rentalYieldPreview()}%</span> per year.
              </p>
            )}
          </div>
        </div>

        {/* ── Photos ── */}
        <div className="rounded-2xl p-6 space-y-4" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
          <h2 className="text-sm font-bold" style={{ color: "#1F2937" }}>Photos</h2>
          <p className="text-xs" style={{ color: "#6B7280" }}>
            Uploaded directly to Cloudflare R2. The first photo becomes the cover image shown on cards.
          </p>

          {uploadError && (
            <div className="px-3.5 py-2.5 rounded-xl text-xs font-semibold" style={{ background: "#FEE2E2", color: "#DC2626" }}>{uploadError}</div>
          )}

          <div className="flex flex-wrap gap-3">
            {form.images.map((url) => (
              <div key={url} className="relative w-28 h-28 rounded-xl overflow-hidden group" style={{ border: "1px solid #E2E8F0" }}>
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
              style={{ border: "1.5px dashed #E2E8F0", color: "#6B7280" }}
            >
              {uploading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" style={{ color: "#1E88E5" }}>
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

        {/* ── Videos ── */}
        <div className="rounded-2xl p-6 space-y-4" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
          <h2 className="text-sm font-bold" style={{ color: "#1F2937" }}>Videos</h2>
          <p className="text-xs" style={{ color: "#6B7280" }}>Paste links to walkthrough videos (YouTube, Vimeo, etc.) — optional.</p>
          <div className="flex flex-wrap gap-2">
            {form.videoUrls.map((url) => (
              <span key={url} className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "#F1F5F9", color: "#1F2937" }}>
                {url.length > 50 ? url.slice(0, 50) + "…" : url}
                <button type="button" onClick={() => removeVideoUrl(url)} className="font-bold" style={{ color: "#DC2626" }}>×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <TextInput value={videoDraft} onChange={(e) => setVideoDraft(e.target.value)} placeholder="https://youtube.com/watch?v=..."
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addVideoUrl(); } }} />
            <button type="button" onClick={addVideoUrl} className="text-xs font-bold px-4 rounded-xl shrink-0" style={{ background: "#1E88E5", color: "#FFFFFF" }}>Add</button>
          </div>
        </div>

        {/* ── Category & Amenities ── */}
        <div className="rounded-2xl p-6 space-y-5" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
          <h2 className="text-sm font-bold" style={{ color: "#1F2937" }}>Category &amp; Amenities</h2>

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
        <div className="rounded-2xl p-6 space-y-5" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
          <h2 className="text-sm font-bold" style={{ color: "#1F2937" }}>Display Options</h2>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer" style={{ color: "#1F2937" }}>
              <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} className="w-4 h-4 rounded accent-[#1E88E5]" />
              Featured listing
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer" style={{ color: "#1F2937" }}>
              <input type="checkbox" checked={form.verified} onChange={(e) => set("verified", e.target.checked)} className="w-4 h-4 rounded accent-[#1E88E5]" />
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
                    style={{ background: c.value, border: form.badgeColor === c.value ? "2.5px solid #1F2937" : "2px solid transparent" }}
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
              style={{ background: "#1E88E5", color: "#FFFFFF" }}>
              {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Listing"}
            </button>
            <button type="button" onClick={() => onNavigate("listings")}
              className="px-6 py-3 rounded-xl text-sm font-bold transition-all"
              style={{ background: "#F1F5F9", color: "#6B7280" }}>
              Cancel
            </button>
          </div>

          {isEditing && (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold" style={{ color: "#DC2626" }}>Delete this listing permanently?</span>
                <button type="button" onClick={handleDelete} disabled={deleting}
                  className="px-4 py-2 rounded-xl text-xs font-bold" style={{ background: "#DC2626", color: "#FFFFFF" }}>
                  {deleting ? "Deleting..." : "Yes, Delete"}
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold" style={{ background: "#F1F5F9", color: "#6B7280" }}>
                  Cancel
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)}
                className="text-sm font-bold hover:underline" style={{ color: "#DC2626" }}>
                Delete Listing
              </button>
            )
          )}
        </div>
      </form>
    </AdminLayout>
  );
}
