import { useState, useEffect, useRef } from "react";
import AdminLayout from "./AdminLayout";
import { createListing, updateListing, deleteListing, LANDMARK_CATEGORIES } from "../../lib/listings";
import { fetchDevelopers, createDeveloper, updateDeveloper, fetchProjects, createProject, updateProject } from "../../lib/developers";
import { fetchAdminAgents } from "../../lib/agents";
import { uploadToR2, validateImageFile, validateDocumentFile, computeImageHash, hammingDistance, looksLikeScreenshot, getImageDimensions } from "../../lib/r2Upload";
import { fetchActiveListingFieldOptionsGrouped } from "../../lib/listingOptions";
import LocationPicker, { reverseGeocode } from "./LocationPicker";

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
const POSTED_BY_OPTIONS = ["Owner", "Builder", "Channel Partner", "Agent", "Property Manager"];
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
// ── New in Section 2C: Location & Connectivity ──
const ADDRESS_VISIBILITY_OPTIONS = ["Exact Address", "Approximate Location", "Locality Only"];
const NEIGHBOURHOOD_PROFILE_OPTIONS = ["Residential", "Commercial", "Mixed-Use", "Emerging Growth Corridor"];
// ── New in Section 2D: Project & Developer Information ──
const CONSTRUCTION_STAGE_OPTIONS = ["Pre-Launch", "Foundation", "Under Construction", "Structure Complete", "Finishing Stage", "Ready to Move", "Completed"];
const DOCUMENT_TYPE_OPTIONS = ["Brochure", "Floor Plan", "Master Plan", "Tower Location Map", "Specification Sheet", "Other"];
const APPROVAL_STATUS_OPTIONS = ["Approved", "Pending", "In Progress", "Not Required"];
const INDIAN_STATES = ["Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi NCR", "Goa", "Gujarat", "Haryana", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Odisha", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Other"];
// ── New in Section 2E: Legal & Verification Information ──
const RERA_STATUS_OPTIONS = ["Registered", "Not Applicable", "Pending Verification"];
const OWNERSHIP_TYPE_OPTIONS = ["Freehold", "Leasehold", "Cooperative", "Society", "Authority Lease", "Other"];
const TITLE_STATUS_OPTIONS = ["Clear Title", "Disputed", "Under Verification", "Not Verified"];
const DOC_VERIFICATION_STATUS_OPTIONS = ["Verified", "Pending", "Not Verified"];
const ENCUMBRANCE_STATUS_OPTIONS = ["No Encumbrance", "Existing Loan/Mortgage", "Under Litigation", "Not Verified"];
const CERTIFICATE_STATUS_OPTIONS = ["Available", "Applied / In Process", "Not Available", "Not Applicable"];
const BUILDING_PLAN_STATUS_OPTIONS = ["Approved", "Pending Approval", "Not Available"];
const PROPERTY_TAX_STATUS_OPTIONS = ["Paid Up to Date", "Dues Pending", "Not Verified"];
const UTILITY_STATUS_OPTIONS = ["Connected", "Partially Connected", "Not Connected", "Not Verified"];
// ── New in Section 2F: Amenities & Lifestyle ──
const UNIT_FEATURES_OPTIONS = ["Modular Kitchen", "False Ceiling", "Wooden Flooring", "Vitrified Tile Flooring", "Walk-in Closet", "Study Room", "Private Balcony", "Premium Bath Fittings", "Piped Gas Connection", "In-unit Video Door Phone", "Air Conditioning", "Wardrobes", "Home Automation", "Private Terrace/Garden"];
const PARKING_TYPE_OPTIONS = ["Open", "Covered", "Basement", "Multi-level Mechanical", "Stilt", "None"];
const EV_CHARGING_OPTIONS = ["Available", "Not Available", "Planned"];
const POWER_BACKUP_OPTIONS = ["None", "Common Areas Only", "Partial Apartment Backup", "Full Apartment Backup"];
const SECURITY_FEATURES_OPTIONS = ["Security Guards", "CCTV Surveillance", "Access Control", "Video Door Phone"];
const WATER_SOURCE_OPTIONS = ["Municipal Supply", "Borewell", "Both", "Tanker Supply", "Not Specified"];
const WATER_SEWAGE_FEATURES_OPTIONS = ["Water Treatment Plant", "Sewage Treatment Plant (STP)", "Rainwater Harvesting"];
const INTERNET_READINESS_OPTIONS = ["Fibre Ready", "Broadband Ready", "Not Ready", "Not Specified"];
const MOBILE_NETWORK_QUALITY_OPTIONS = ["Excellent", "Good", "Average", "Poor", "Not Specified"];
const PET_POLICY_OPTIONS = ["Pets Allowed", "Not Allowed", "Restrictions Apply", "Not Specified"];
const SENIOR_CITIZEN_FEATURES_OPTIONS = ["Ramps", "Lifts", "Handrails", "Common Seating Areas", "Emergency Support/Alert System"];
const ACCESSIBILITY_FEATURES_OPTIONS = ["Wheelchair Ramps", "Wide Doorways", "Accessible Restrooms", "Braille Signage", "Accessible Parking", "Elevator Access", "Tactile Flooring"];
const AMENITY_STATUS_OPTIONS = ["Available", "Under Maintenance", "Coming Soon", "Not Available"];
const AMENITY_CONDITION_OPTIONS = ["New", "Good", "Fair", "Needs Repair"];
// ── New in Section 2G: Media & Virtual Experience ──
const ROOM_LABEL_OPTIONS = ["Exterior", "Living Room", "Kitchen", "Bedroom", "Bathroom", "Balcony", "Dining Room", "Other"];
const MANDATORY_ROOM_CATEGORIES = ["Exterior", "Living Room", "Kitchen", "Bedroom", "Bathroom", "Balcony"];
const MIN_PHOTOS = 8;
const MAX_RECOMMENDED_PHOTOS = 15;
// ── New in Section 2H: Seller / Agent Information ──
const CONTACT_METHOD_OPTIONS = ["Call", "WhatsApp", "Chat", "Email"];
const BADGE_COLOR_PRESETS = [
  { label: "Blue", value: "#1565C0" },
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
  badgeColor: "#1565C0",

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

  // ── Section 2C: Location & Connectivity ──
  locality: "",
  landmark: "",
  city: "",
  pincode: "",
  addressVisibility: "Exact Address",
  nearbyLandmarks: [],
  roadWidth: "",
  approachRoadDetails: "",
  publicTransportNotes: "",
  neighbourhoodProfile: "",

  // ── Section 2D: Project & Developer Information ──
  // "none" = plain text only, "existing" = linked to a picked profile,
  // "new" = creating a fresh profile on save.
  developerMode: "none",
  developerId: null,
  developerName: "",
  developerVerified: false,
  developerExperienceYears: "",
  developerCompletedProjectsCount: "",
  developerCurrentProjectsCount: "",
  developerDescription: "",

  projectMode: "none",
  projectId: null,
  // projectName already declared above (Section 2A) — reused as this
  // project profile's name too, whether linked or freshly created.
  projectLandAreaAcres: "",
  projectTotalTowers: "",
  projectTotalFloors: "",
  projectTotalUnits: "",
  projectHomesPerFloor: "",
  projectOpenSpacePercent: "",
  projectConstructionStage: "",
  projectConstructionStageVerifiedAt: null,
  projectExpectedPossessionDate: "",
  projectHandoverTimeline: "",
  projectReraNumber: "",
  projectReraState: "",
  projectReraProjectName: "",
  projectReraVerificationLink: "",
  projectApprovals: [],
  projectDocuments: [],
  projectConstructionQuality: "",
  projectStructureType: "",
  projectKeyMaterials: "",

  // ── Section 2E: Legal & Verification Information ──
  reraStatus: "Pending Verification",
  ownershipType: "",
  titleStatus: "",
  documentVerificationStatus: "Pending",
  encumbranceStatus: "",
  encumbranceNotes: "",
  occupancyCertificateStatus: "",
  completionCertificateStatus: "",
  possessionCertificateStatus: "",
  buildingPlanStatus: "",
  propertyTaxStatus: "",
  utilityConnectionStatus: "",
  utilityConnectionNotes: "",
  posterVerified: false,
  verificationDate: "",
  verificationSource: "",

  // ── Section 2F: Amenities & Lifestyle ──
  amenityDetails: [],
  unitFeatures: [],
  parkingType: "",
  parkingSlots: "",
  evChargingStatus: "",
  powerBackupType: "",
  securityFeatures: [],
  waterSource: "",
  waterSewageFeatures: [],
  internetReadiness: "",
  mobileNetworkQuality: "",
  petPolicy: "",
  petPolicyNotes: "",
  seniorCitizenFeatures: [],
  accessibilityFeatures: [],

  // ── Section 2G: Media & Virtual Experience ──
  imageDetails: [],
  virtualTourUrl: "",
  droneViewUrl: "",
  floorPlanUrl: "",
  floorPlanCaption: "",
  projectConstructionProgressPhotos: [],

  // ── Section 2H: Seller / Agent Information ──
  agentId: null,
  posterName: "",
  posterPhone: "",
  posterEmail: "",
  posterPhotoUrl: "",
  posterPreferredContactMethods: [],
  posterAvailabilityNotes: "",
  posterPhoneMaskingEnabled: true,
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
        background: active ? "#1565C0" : "#FFFFFF",
        color: active ? "#FFFFFF" : "#6B7280",
        border: `1px solid ${active ? "#1565C0" : "#E2E8F0"}`,
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
      locality: nullToEmpty(editingListing.locality),
      landmark: nullToEmpty(editingListing.landmark),
      city: nullToEmpty(editingListing.city),
      pincode: nullToEmpty(editingListing.pincode),
      addressVisibility: nullToEmpty(editingListing.addressVisibility) || EMPTY_FORM.addressVisibility,
      nearbyLandmarks: Array.isArray(editingListing.nearbyLandmarks)
        ? editingListing.nearbyLandmarks.map((l, i) => ({ ...l, _key: `existing-${i}` }))
        : [],
      roadWidth: nullToEmpty(editingListing.roadWidth),
      approachRoadDetails: nullToEmpty(editingListing.approachRoadDetails),
      publicTransportNotes: nullToEmpty(editingListing.publicTransportNotes),
      neighbourhoodProfile: nullToEmpty(editingListing.neighbourhoodProfile),
      developerMode: editingListing.developerId ? "existing" : "none",
      developerId: editingListing.developerId || null,
      developerName: nullToEmpty(editingListing.developerName || editingListing.developer?.name),
      developerVerified: !!editingListing.developer?.verified,
      developerExperienceYears: nullToEmpty(editingListing.developer?.experienceYears),
      developerCompletedProjectsCount: nullToEmpty(editingListing.developer?.completedProjectsCount),
      developerCurrentProjectsCount: nullToEmpty(editingListing.developer?.currentProjectsCount),
      developerDescription: nullToEmpty(editingListing.developer?.description),
      projectMode: editingListing.projectId ? "existing" : "none",
      projectId: editingListing.projectId || null,
      projectLandAreaAcres: nullToEmpty(editingListing.project?.landAreaAcres),
      projectTotalTowers: nullToEmpty(editingListing.project?.totalTowers),
      projectTotalFloors: nullToEmpty(editingListing.project?.totalFloors),
      projectTotalUnits: nullToEmpty(editingListing.project?.totalUnits),
      projectHomesPerFloor: nullToEmpty(editingListing.project?.homesPerFloor),
      projectOpenSpacePercent: nullToEmpty(editingListing.project?.openSpacePercent),
      projectConstructionStage: nullToEmpty(editingListing.project?.constructionStage),
      projectConstructionStageVerifiedAt: editingListing.project?.constructionStageVerifiedAt || null,
      projectExpectedPossessionDate: nullToEmpty(editingListing.project?.expectedPossessionDate),
      projectHandoverTimeline: nullToEmpty(editingListing.project?.handoverTimeline),
      projectReraNumber: nullToEmpty(editingListing.project?.reraNumber),
      projectReraState: nullToEmpty(editingListing.project?.reraState),
      projectReraProjectName: nullToEmpty(editingListing.project?.reraProjectName),
      projectReraVerificationLink: nullToEmpty(editingListing.project?.reraVerificationLink),
      projectApprovals: Array.isArray(editingListing.project?.approvals)
        ? editingListing.project.approvals.map((a, i) => ({ ...a, _key: `existing-${i}` }))
        : [],
      projectDocuments: Array.isArray(editingListing.project?.documents)
        ? editingListing.project.documents.map((d, i) => ({ ...d, _key: `existing-${i}` }))
        : [],
      projectConstructionQuality: nullToEmpty(editingListing.project?.constructionQuality),
      projectStructureType: nullToEmpty(editingListing.project?.structureType),
      projectKeyMaterials: nullToEmpty(editingListing.project?.keyMaterials),
      reraStatus: nullToEmpty(editingListing.reraStatus) || EMPTY_FORM.reraStatus,
      ownershipType: nullToEmpty(editingListing.ownershipType),
      titleStatus: nullToEmpty(editingListing.titleStatus),
      documentVerificationStatus: nullToEmpty(editingListing.documentVerificationStatus) || EMPTY_FORM.documentVerificationStatus,
      encumbranceStatus: nullToEmpty(editingListing.encumbranceStatus),
      encumbranceNotes: nullToEmpty(editingListing.encumbranceNotes),
      occupancyCertificateStatus: nullToEmpty(editingListing.occupancyCertificateStatus),
      completionCertificateStatus: nullToEmpty(editingListing.completionCertificateStatus),
      possessionCertificateStatus: nullToEmpty(editingListing.possessionCertificateStatus),
      buildingPlanStatus: nullToEmpty(editingListing.buildingPlanStatus),
      propertyTaxStatus: nullToEmpty(editingListing.propertyTaxStatus),
      utilityConnectionStatus: nullToEmpty(editingListing.utilityConnectionStatus),
      utilityConnectionNotes: nullToEmpty(editingListing.utilityConnectionNotes),
      posterVerified: !!(editingListing.posterVerified || editingListing.verified),
      verificationDate: nullToEmpty(editingListing.verificationDate),
      verificationSource: nullToEmpty(editingListing.verificationSource),
      amenityDetails: Array.isArray(editingListing.amenityDetails)
        ? editingListing.amenityDetails.map((a, i) => ({ ...a, _key: `existing-${i}` }))
        : [],
      unitFeatures: Array.isArray(editingListing.unitFeatures) ? editingListing.unitFeatures : [],
      parkingType: nullToEmpty(editingListing.parkingType),
      parkingSlots: nullToEmpty(editingListing.parkingSlots),
      evChargingStatus: nullToEmpty(editingListing.evChargingStatus),
      powerBackupType: nullToEmpty(editingListing.powerBackupType),
      securityFeatures: Array.isArray(editingListing.securityFeatures) ? editingListing.securityFeatures : [],
      waterSource: nullToEmpty(editingListing.waterSource),
      waterSewageFeatures: Array.isArray(editingListing.waterSewageFeatures) ? editingListing.waterSewageFeatures : [],
      internetReadiness: nullToEmpty(editingListing.internetReadiness),
      mobileNetworkQuality: nullToEmpty(editingListing.mobileNetworkQuality),
      petPolicy: nullToEmpty(editingListing.petPolicy),
      petPolicyNotes: nullToEmpty(editingListing.petPolicyNotes),
      seniorCitizenFeatures: Array.isArray(editingListing.seniorCitizenFeatures) ? editingListing.seniorCitizenFeatures : [],
      accessibilityFeatures: Array.isArray(editingListing.accessibilityFeatures) ? editingListing.accessibilityFeatures : [],
      imageDetails: Array.isArray(editingListing.imageDetails) ? editingListing.imageDetails : [],
      virtualTourUrl: nullToEmpty(editingListing.virtualTourUrl),
      droneViewUrl: nullToEmpty(editingListing.droneViewUrl),
      floorPlanUrl: nullToEmpty(editingListing.floorPlanUrl),
      floorPlanCaption: nullToEmpty(editingListing.floorPlanCaption),
      projectConstructionProgressPhotos: Array.isArray(editingListing.project?.constructionProgressPhotos)
        ? editingListing.project.constructionProgressPhotos.map((p, i) => ({ ...p, _key: `existing-${i}` }))
        : [],
      agentId: editingListing.agentId || null,
      posterName: nullToEmpty(editingListing.posterName),
      posterPhone: nullToEmpty(editingListing.posterPhone),
      posterEmail: nullToEmpty(editingListing.posterEmail),
      posterPhotoUrl: nullToEmpty(editingListing.posterPhotoUrl),
      posterPreferredContactMethods: Array.isArray(editingListing.posterPreferredContactMethods) ? editingListing.posterPreferredContactMethods : [],
      posterAvailabilityNotes: nullToEmpty(editingListing.posterAvailabilityNotes),
      posterPhoneMaskingEnabled: editingListing.posterPhoneMaskingEnabled !== false,
    };
  });
  const [availableDevelopers, setAvailableDevelopers] = useState([]);
  const [availableProjects, setAvailableProjects] = useState([]);
  const [availableAgents, setAvailableAgents] = useState([]);
  const [docUploading, setDocUploading] = useState(false);
  const [docUploadError, setDocUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [photoWarnings, setPhotoWarnings] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [options, setOptions] = useState(null); // null = loading
  const [videoDraft, setVideoDraft] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchActiveListingFieldOptionsGrouped().then(({ data }) => { if (!cancelled) setOptions(data); });
    fetchDevelopers().then(({ data }) => { if (!cancelled) setAvailableDevelopers(data); });
    fetchProjects().then(({ data }) => { if (!cancelled) setAvailableProjects(data); });
    fetchAdminAgents().then(({ data }) => { if (!cancelled) setAvailableAgents(data); });
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

  // ── Section 2C: nearby landmarks (repeatable rows) ──
  function addLandmark() {
    setForm((f) => ({
      ...f,
      nearbyLandmarks: [...f.nearbyLandmarks, { _key: `new-${Date.now()}-${f.nearbyLandmarks.length}`, category: "School", name: "", distance: "", travelTime: "" }],
    }));
  }
  function updateLandmark(key, field, value) {
    setForm((f) => ({
      ...f,
      nearbyLandmarks: f.nearbyLandmarks.map((l) => (l._key === key ? { ...l, [field]: value } : l)),
    }));
  }
  function removeLandmark(key) {
    setForm((f) => ({ ...f, nearbyLandmarks: f.nearbyLandmarks.filter((l) => l._key !== key) }));
  }

  // Best-effort: when a pin is (re)dropped, suggest locality/city/pincode from
  // it — but only fill in fields the admin hasn't already typed something
  // into, and never blocks/breaks pin-picking if the lookup fails.
  async function handlePinChange({ latitude, longitude }) {
    setForm((f) => ({ ...f, latitude, longitude }));
    if (latitude == null || longitude == null) return;
    try {
      const suggestion = await reverseGeocode(latitude, longitude);
      setForm((f) => ({
        ...f,
        locality: f.locality || suggestion.locality || f.locality,
        city: f.city || suggestion.city || f.city,
        pincode: f.pincode || suggestion.pincode || f.pincode,
      }));
    } catch {
      // silent — reverse geocoding is a convenience, not a requirement
    }
  }

  const imageHashesRef = useRef(new Map()); // url -> perceptual hash, this session only — not persisted

  async function handleFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadError("");
    setPhotoWarnings([]);
    setUploading(true);

    const newWarnings = [];
    for (const file of files) {
      const validationError = validateImageFile(file);
      if (validationError) {
        setUploadError(validationError);
        continue;
      }

      // Best-effort, client-side only — see r2Upload.js for what these can
      // and can't actually detect.
      try {
        const [hash, dims] = await Promise.all([computeImageHash(file), getImageDimensions(file)]);
        if (looksLikeScreenshot(file, dims.width, dims.height)) {
          newWarnings.push(`"${file.name}" looks like it might be a screenshot — double-check before publishing.`);
        }
        for (const [existingUrl, existingHash] of imageHashesRef.current) {
          if (hammingDistance(hash, existingHash) <= 5) {
            newWarnings.push(`"${file.name}" looks like a duplicate (or near-duplicate) of a photo already added.`);
            break;
          }
        }
        imageHashesRef.current.set(file.name, hash); // keyed by name until we have the real url below
      } catch {
        // hashing is a convenience check — never block the actual upload over it
      }

      const result = await uploadToR2(file, "listings");
      if (result.error) {
        setUploadError(result.error);
      } else {
        setForm((f) => ({ ...f, images: [...f.images, result.url] }));
        const hash = imageHashesRef.current.get(file.name);
        if (hash) { imageHashesRef.current.delete(file.name); imageHashesRef.current.set(result.url, hash); }
      }
    }

    if (newWarnings.length) setPhotoWarnings(newWarnings);
    setUploading(false);
    e.target.value = ""; // allow re-selecting the same file again later
  }

  function removeImage(url) {
    setForm((f) => ({ ...f, images: f.images.filter((u) => u !== url), imageDetails: f.imageDetails.filter((d) => d.url !== url) }));
    imageHashesRef.current.delete(url);
  }

  function moveImage(url, direction) {
    setForm((f) => {
      const idx = f.images.indexOf(url);
      const swapWith = idx + direction;
      if (swapWith < 0 || swapWith >= f.images.length) return f;
      const images = [...f.images];
      [images[idx], images[swapWith]] = [images[swapWith], images[idx]];
      return { ...f, images };
    });
  }

  function makeCoverImage(url) {
    setForm((f) => ({ ...f, images: [url, ...f.images.filter((u) => u !== url)] }));
  }

  function missingMandatoryCategories() {
    const covered = new Set(form.imageDetails.filter((d) => d.roomLabel).map((d) => d.roomLabel));
    return MANDATORY_ROOM_CATEGORIES.filter((c) => !covered.has(c));
  }

  function imageDetailFor(f, url) {
    return f.imageDetails.find((d) => d.url === url) || { url, caption: "", roomLabel: "" };
  }

  function setImageDetail(url, field, value) {
    setForm((f) => {
      const existing = f.imageDetails.find((d) => d.url === url);
      const imageDetails = existing
        ? f.imageDetails.map((d) => (d.url === url ? { ...d, [field]: value } : d))
        : [...f.imageDetails, { url, caption: "", roomLabel: "", [field]: value }];
      return { ...f, imageDetails };
    });
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

  // ── Section 2D live preview ──
  function unitsPerAcrePreview() {
    const acres = Number(form.projectLandAreaAcres) || 0;
    const units = Number(form.projectTotalUnits) || 0;
    if (!acres || !units) return null;
    return Math.round((units / acres) * 10) / 10;
  }

  function markVerifiedToday() {
    setForm((f) => ({ ...f, posterVerified: true, verificationDate: new Date().toISOString().slice(0, 10) }));
  }

  // ── Section 2F: amenity details (repeatable rows) ──
  function addAmenityDetail() {
    setForm((f) => ({ ...f, amenityDetails: [...f.amenityDetails, { _key: `new-${Date.now()}`, name: f.amenities[0] || "", status: "Available", condition: "Good" }] }));
  }
  function updateAmenityDetail(key, field, value) {
    setForm((f) => ({ ...f, amenityDetails: f.amenityDetails.map((a) => (a._key === key ? { ...a, [field]: value } : a)) }));
  }
  function removeAmenityDetail(key) {
    setForm((f) => ({ ...f, amenityDetails: f.amenityDetails.filter((a) => a._key !== key) }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaveError("");

    if (!form.title || !form.location || !form.priceRaw) {
      setSaveError("Title, location, and price are required.");
      return;
    }

    setSaving(true);
    try {
      const developerId = await resolveDeveloperId();
      const projectId = await resolveProjectId(developerId);
      const payload = { ...form, price: priceLabelFromRaw(form.priceRaw), developerId, projectId };

      const { error } = isEditing
        ? await updateListing(editingListing.dbId, payload)
        : await createListing(payload);

      if (error) {
        setSaveError(error.message || "Something went wrong while saving. Check your Supabase connection.");
        setSaving(false);
        return;
      }
      setSaving(false);
      onNavigate("listings");
    } catch (err) {
      setSaving(false);
      setSaveError(err?.message || "Something went wrong while saving the developer/project details.");
    }
  }

  // Creates or updates the developer profile (if any) and returns its id —
  // called from handleSave, right before the listing itself is saved.
  async function resolveDeveloperId() {
    if (form.developerMode === "none" || !form.developerName) return null;
    const developerData = {
      name: form.developerName,
      verified: form.developerVerified,
      experienceYears: form.developerExperienceYears,
      completedProjectsCount: form.developerCompletedProjectsCount,
      currentProjectsCount: form.developerCurrentProjectsCount,
      description: form.developerDescription,
    };
    if (form.developerMode === "existing" && form.developerId) {
      const { data, error } = await updateDeveloper(form.developerId, developerData);
      if (error) throw new Error(error.message || "Failed to update developer profile.");
      return data.id;
    }
    const { data, error } = await createDeveloper(developerData);
    if (error) throw new Error(error.message || "Failed to create developer profile.");
    return data.id;
  }

  // Same idea for the project profile — also links it to whichever
  // developer was just resolved above, if any.
  async function resolveProjectId(developerId) {
    if (form.projectMode === "none" || !form.projectName) return null;
    const projectData = {
      name: form.projectName,
      developerId,
      landAreaAcres: form.projectLandAreaAcres,
      totalTowers: form.projectTotalTowers,
      totalFloors: form.projectTotalFloors,
      totalUnits: form.projectTotalUnits,
      homesPerFloor: form.projectHomesPerFloor,
      openSpacePercent: form.projectOpenSpacePercent,
      constructionStage: form.projectConstructionStage,
      expectedPossessionDate: form.projectExpectedPossessionDate || null,
      handoverTimeline: form.projectHandoverTimeline,
      reraNumber: form.projectReraNumber,
      reraState: form.projectReraState,
      reraProjectName: form.projectReraProjectName,
      reraVerificationLink: form.projectReraVerificationLink,
      approvals: form.projectApprovals,
      documents: form.projectDocuments,
      constructionQuality: form.projectConstructionQuality,
      structureType: form.projectStructureType,
      keyMaterials: form.projectKeyMaterials,
      constructionProgressPhotos: form.projectConstructionProgressPhotos,
    };
    if (form.projectMode === "existing" && form.projectId) {
      const { data, error } = await updateProject(form.projectId, projectData);
      if (error) throw new Error(error.message || "Failed to update project profile.");
      return data.id;
    }
    const { data, error } = await createProject(projectData);
    if (error) throw new Error(error.message || "Failed to create project profile.");
    return data.id;
  }

  // Populates the form from a picked existing developer/project — lets the
  // admin still tweak details (e.g. bump completed-projects count) before saving.
  function selectExistingDeveloper(id) {
    const d = availableDevelopers.find((x) => x.id === id);
    if (!d) return;
    setForm((f) => ({
      ...f,
      developerId: d.id,
      developerName: d.name,
      developerVerified: d.verified,
      developerExperienceYears: d.experienceYears ?? "",
      developerCompletedProjectsCount: d.completedProjectsCount ?? "",
      developerCurrentProjectsCount: d.currentProjectsCount ?? "",
      developerDescription: d.description ?? "",
    }));
  }

  function selectExistingProject(id) {
    const p = availableProjects.find((x) => x.id === id);
    if (!p) return;
    setForm((f) => ({
      ...f,
      projectId: p.id,
      projectName: p.name,
      projectLandAreaAcres: p.landAreaAcres ?? "",
      projectTotalTowers: p.totalTowers ?? "",
      projectTotalFloors: p.totalFloors ?? "",
      projectTotalUnits: p.totalUnits ?? "",
      projectHomesPerFloor: p.homesPerFloor ?? "",
      projectOpenSpacePercent: p.openSpacePercent ?? "",
      projectConstructionStage: p.constructionStage ?? "",
      projectConstructionStageVerifiedAt: p.constructionStageVerifiedAt || null,
      projectExpectedPossessionDate: p.expectedPossessionDate ?? "",
      projectHandoverTimeline: p.handoverTimeline ?? "",
      projectReraNumber: p.reraNumber ?? "",
      projectReraState: p.reraState ?? "",
      projectReraProjectName: p.reraProjectName ?? "",
      projectReraVerificationLink: p.reraVerificationLink ?? "",
      projectApprovals: (p.approvals || []).map((a, i) => ({ ...a, _key: `sel-${i}` })),
      projectDocuments: (p.documents || []).map((d, i) => ({ ...d, _key: `sel-${i}` })),
      projectConstructionQuality: p.constructionQuality ?? "",
      projectStructureType: p.structureType ?? "",
      projectKeyMaterials: p.keyMaterials ?? "",
      projectConstructionProgressPhotos: (p.constructionProgressPhotos || []).map((cp, i) => ({ ...cp, _key: `sel-${i}` })),
      // If this project already has a linked developer, adopt it too.
      ...(p.developerId ? { developerMode: "existing", developerId: p.developerId } : {}),
    }));
    if (p.developerId) selectExistingDeveloper(p.developerId);
  }

  // ── Project approvals & documents (repeatable rows) ──
  function addApproval() {
    setForm((f) => ({ ...f, projectApprovals: [...f.projectApprovals, { _key: `new-${Date.now()}`, name: "", status: "Pending", documentUrl: "" }] }));
  }
  function updateApproval(key, field, value) {
    setForm((f) => ({ ...f, projectApprovals: f.projectApprovals.map((a) => (a._key === key ? { ...a, [field]: value } : a)) }));
  }
  function removeApproval(key) {
    setForm((f) => ({ ...f, projectApprovals: f.projectApprovals.filter((a) => a._key !== key) }));
  }

  function addDocument() {
    setForm((f) => ({ ...f, projectDocuments: [...f.projectDocuments, { _key: `new-${Date.now()}`, type: "Brochure", label: "", url: "" }] }));
  }
  function updateDocument(key, field, value) {
    setForm((f) => ({ ...f, projectDocuments: f.projectDocuments.map((d) => (d._key === key ? { ...d, [field]: value } : d)) }));
  }
  function removeDocument(key) {
    setForm((f) => ({ ...f, projectDocuments: f.projectDocuments.filter((d) => d._key !== key) }));
  }

  async function handleDocumentFileSelected(key, e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const validationError = validateDocumentFile(file);
    if (validationError) { setDocUploadError(validationError); return; }
    setDocUploadError("");
    setDocUploading(true);
    const { url, error } = await uploadToR2(file, "documents");
    setDocUploading(false);
    if (error) { setDocUploadError(error); return; }
    updateDocument(key, "url", url);
  }

  // ── Section 2G: construction-progress photos (repeatable rows) ──
  function addProgressPhoto() {
    setForm((f) => ({ ...f, projectConstructionProgressPhotos: [...f.projectConstructionProgressPhotos, { _key: `new-${Date.now()}`, url: "", date: new Date().toISOString().slice(0, 10), caption: "" }] }));
  }
  function updateProgressPhoto(key, field, value) {
    setForm((f) => ({ ...f, projectConstructionProgressPhotos: f.projectConstructionProgressPhotos.map((p) => (p._key === key ? { ...p, [field]: value } : p)) }));
  }
  function removeProgressPhoto(key) {
    setForm((f) => ({ ...f, projectConstructionProgressPhotos: f.projectConstructionProgressPhotos.filter((p) => p._key !== key) }));
  }
  async function handleProgressPhotoFileSelected(key, e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const validationError = validateImageFile(file);
    if (validationError) { setDocUploadError(validationError); return; }
    setDocUploadError("");
    setDocUploading(true);
    const { url, error } = await uploadToR2(file, "listings");
    setDocUploading(false);
    if (error) { setDocUploadError(error); return; }
    updateProgressPhoto(key, "url", url);
  }

  // ── Section 2G: floor plan upload (image or PDF, same as project documents) ──
  async function handleFloorPlanFileSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const validationError = validateDocumentFile(file);
    if (validationError) { setDocUploadError(validationError); return; }
    setDocUploadError("");
    setDocUploading(true);
    const { url, error } = await uploadToR2(file, "documents");
    setDocUploading(false);
    if (error) { setDocUploadError(error); return; }
    set("floorPlanUrl", url);
  }

  // ── Section 2H: poster photo upload (used only when no agent is linked) ──
  async function handlePosterPhotoFileSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const validationError = validateImageFile(file);
    if (validationError) { setDocUploadError(validationError); return; }
    setDocUploadError("");
    setDocUploading(true);
    const { url, error } = await uploadToR2(file, "avatars");
    setDocUploading(false);
    if (error) { setDocUploadError(error); return; }
    set("posterPhotoUrl", url);
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
              onChange={handlePinChange}
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
              Will display as <span className="font-bold" style={{ color: "#1565C0" }}>{priceLabelFromRaw(form.priceRaw)}</span>
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
            <Field label="Project Name" hint="Same field as in Project & Developer Information below.">
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
            <input type="checkbox" checked={form.unitNumberPublic} onChange={(e) => set("unitNumberPublic", e.target.checked)} className="w-4 h-4 rounded accent-[#1565C0]" />
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
                <input type="checkbox" checked={form.servantRoom} onChange={(e) => set("servantRoom", e.target.checked)} className="w-4 h-4 rounded accent-[#1565C0]" />
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
              <input type="checkbox" checked={form.priceNegotiable} onChange={(e) => set("priceNegotiable", e.target.checked)} className="w-4 h-4 rounded accent-[#1565C0]" />
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
              Price per sqft: <span className="font-bold" style={{ color: "#1565C0" }}>₹{pricePerSqftPreview().toLocaleString("en-IN")}/sqft</span>
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
                {downPaymentPreview() && <>Down payment ≈ <span className="font-bold" style={{ color: "#1565C0" }}>₹{downPaymentPreview().toLocaleString("en-IN")}</span>. </>}
                {emiPreview() && <>Estimated EMI ≈ <span className="font-bold" style={{ color: "#1565C0" }}>₹{emiPreview().toLocaleString("en-IN")}/month</span>.</>}
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
                Estimated rental yield: <span className="font-bold" style={{ color: "#1565C0" }}>{rentalYieldPreview()}%</span> per year.
              </p>
            )}
          </div>
        </div>

        {/* ── Location & Connectivity (Section 2C) ── */}
        <div className="rounded-2xl p-6 space-y-5" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color: "#1F2937" }}>Location &amp; Connectivity</h2>
            <p className="text-xs mt-1" style={{ color: "#6B7280" }}>Auto-suggested from the map pin above where possible — feel free to edit.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="Locality">
              <TextInput value={form.locality} onChange={(e) => set("locality", e.target.value)} placeholder="e.g. Patia" />
            </Field>
            <Field label="Landmark">
              <TextInput value={form.landmark} onChange={(e) => set("landmark", e.target.value)} placeholder="e.g. Near KIIT Square" />
            </Field>
            <Field label="City">
              <TextInput value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Bhubaneswar" />
            </Field>
            <Field label="Pincode">
              <TextInput value={form.pincode} onChange={(e) => set("pincode", e.target.value)} placeholder="e.g. 751024" />
            </Field>
          </div>

          <Field label="Address Visibility" hint="Controls how precisely the map pin/address shows on the public listing.">
            <Select value={form.addressVisibility} onChange={(e) => set("addressVisibility", e.target.value)}>
              {ADDRESS_VISIBILITY_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </Select>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Road Width">
              <TextInput value={form.roadWidth} onChange={(e) => set("roadWidth", e.target.value)} placeholder="e.g. 40 ft wide" />
            </Field>
            <Field label="Approach Road Details">
              <TextInput value={form.approachRoadDetails} onChange={(e) => set("approachRoadDetails", e.target.value)} placeholder="e.g. Tar road, well maintained" />
            </Field>
            <Field label="Neighbourhood Profile">
              <Select value={form.neighbourhoodProfile} onChange={(e) => set("neighbourhoodProfile", e.target.value)}>
                <option value="">— N/A —</option>
                {NEIGHBOURHOOD_PROFILE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </Select>
            </Field>
          </div>

          <Field label="Public Transport Availability">
            <TextInput value={form.publicTransportNotes} onChange={(e) => set("publicTransportNotes", e.target.value)} placeholder="e.g. Bus routes 12, 45 nearby; auto stand 100m" />
          </Field>

          <Field label="Nearby Landmarks & Key Destinations" hint="Powers the 'What's Nearby' section (with layer filters) on the public page.">
            <div className="space-y-2.5">
              {form.nearbyLandmarks.map((l) => (
                <div key={l._key} className="grid grid-cols-[1fr_1.4fr_0.8fr_0.8fr_auto] gap-2 items-center">
                  <Select value={l.category} onChange={(e) => updateLandmark(l._key, "category", e.target.value)}>
                    {LANDMARK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                  <TextInput value={l.name} onChange={(e) => updateLandmark(l._key, "name", e.target.value)} placeholder="Name (e.g. DAV Public School)" />
                  <TextInput value={l.distance} onChange={(e) => updateLandmark(l._key, "distance", e.target.value)} placeholder="Distance (1.2 km)" />
                  <TextInput value={l.travelTime} onChange={(e) => updateLandmark(l._key, "travelTime", e.target.value)} placeholder="Time (5 min)" />
                  <button type="button" onClick={() => removeLandmark(l._key)} className="text-xs font-bold px-2 py-2.5 rounded-lg hover:opacity-80" style={{ color: "#DC2626" }}>
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" onClick={addLandmark} className="text-xs font-bold px-3 py-2 rounded-lg" style={{ background: "#EFF6FF", color: "#1565C0" }}>
                + Add Nearby Landmark
              </button>
            </div>
          </Field>
        </div>

        {/* ── Project & Developer Information (Section 2D) ── */}
        <div className="rounded-2xl p-6 space-y-6" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color: "#1F2937" }}>Project &amp; Developer Information</h2>
            <p className="text-xs mt-1" style={{ color: "#6B7280" }}>
              Shared across every listing in the same project — editing these updates them everywhere, not just this listing.
            </p>
          </div>

          {/* ── Developer ── */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wide" style={{ color: "#6B7280" }}>Developer / Owner</h3>
            <div className="flex flex-wrap gap-2">
              {[["none", "No Profile"], ["existing", "Select Existing"], ["new", "Add New"]].map(([mode, label]) => (
                <button key={mode} type="button" onClick={() => set("developerMode", mode)}
                  className="text-xs font-bold px-3 py-1.5 rounded-full"
                  style={form.developerMode === mode ? { background: "#1565C0", color: "#FFFFFF" } : { background: "#F1F5F9", color: "#1F2937" }}>
                  {label}
                </button>
              ))}
            </div>

            {form.developerMode === "none" && (
              <Field label="Developer / Builder Name" hint="Plain text — no verified profile.">
                <TextInput value={form.developerName} onChange={(e) => set("developerName", e.target.value)} placeholder="e.g. Skyline Builders" />
              </Field>
            )}

            {form.developerMode === "existing" && (
              <Field label="Select Developer">
                <Select value={form.developerId || ""} onChange={(e) => selectExistingDeveloper(e.target.value)}>
                  <option value="">— Select —</option>
                  {availableDevelopers.map((d) => <option key={d.id} value={d.id}>{d.name}{d.verified ? " ✓" : ""}</option>)}
                </Select>
              </Field>
            )}

            {(form.developerMode === "existing" || form.developerMode === "new") && (
              <>
                {form.developerMode === "new" && (
                  <Field label="Developer Name">
                    <TextInput value={form.developerName} onChange={(e) => set("developerName", e.target.value)} placeholder="e.g. Skyline Builders" />
                  </Field>
                )}
                <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer" style={{ color: "#1F2937" }}>
                  <input type="checkbox" checked={form.developerVerified} onChange={(e) => set("developerVerified", e.target.checked)} className="w-4 h-4 rounded accent-[#1565C0]" />
                  Verified Developer
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Experience (years)">
                    <TextInput type="number" min="0" value={form.developerExperienceYears} onChange={(e) => set("developerExperienceYears", e.target.value)} placeholder="e.g. 15" />
                  </Field>
                  <Field label="Completed Projects">
                    <TextInput type="number" min="0" value={form.developerCompletedProjectsCount} onChange={(e) => set("developerCompletedProjectsCount", e.target.value)} placeholder="e.g. 22" />
                  </Field>
                  <Field label="Current Projects">
                    <TextInput type="number" min="0" value={form.developerCurrentProjectsCount} onChange={(e) => set("developerCurrentProjectsCount", e.target.value)} placeholder="e.g. 4" />
                  </Field>
                </div>
                <Field label="About the Developer">
                  <textarea value={form.developerDescription} onChange={(e) => set("developerDescription", e.target.value)} rows={2}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 resize-none" style={inputStyle} />
                </Field>
              </>
            )}
          </div>

          {/* ── Project ── */}
          <div className="space-y-3 pt-2" style={{ borderTop: "1px solid #E2E8F0" }}>
            <h3 className="text-xs font-bold uppercase tracking-wide pt-3" style={{ color: "#6B7280" }}>Project</h3>
            <div className="flex flex-wrap gap-2">
              {[["none", "No Profile"], ["existing", "Select Existing"], ["new", "Add New"]].map(([mode, label]) => (
                <button key={mode} type="button" onClick={() => set("projectMode", mode)}
                  className="text-xs font-bold px-3 py-1.5 rounded-full"
                  style={form.projectMode === mode ? { background: "#1565C0", color: "#FFFFFF" } : { background: "#F1F5F9", color: "#1F2937" }}>
                  {label}
                </button>
              ))}
            </div>

            {form.projectMode === "none" && (
              <Field label="Project Name" hint="Plain text — no shared project profile.">
                <TextInput value={form.projectName} onChange={(e) => set("projectName", e.target.value)} placeholder="e.g. Skyline Residency" />
              </Field>
            )}

            {form.projectMode === "existing" && (
              <Field label="Select Project">
                <Select value={form.projectId || ""} onChange={(e) => selectExistingProject(e.target.value)}>
                  <option value="">— Select —</option>
                  {availableProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </Field>
            )}

            {(form.projectMode === "existing" || form.projectMode === "new") && (
              <>
                {form.projectMode === "new" && (
                  <Field label="Project Name">
                    <TextInput value={form.projectName} onChange={(e) => set("projectName", e.target.value)} placeholder="e.g. Skyline Residency" />
                  </Field>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Field label="Land Area (acres)">
                    <TextInput type="number" min="0" step="0.01" value={form.projectLandAreaAcres} onChange={(e) => set("projectLandAreaAcres", e.target.value)} placeholder="e.g. 5.2" />
                  </Field>
                  <Field label="Total Towers">
                    <TextInput type="number" min="0" value={form.projectTotalTowers} onChange={(e) => set("projectTotalTowers", e.target.value)} placeholder="e.g. 5" />
                  </Field>
                  <Field label="Total Floors">
                    <TextInput type="number" min="0" value={form.projectTotalFloors} onChange={(e) => set("projectTotalFloors", e.target.value)} placeholder="e.g. 18" />
                  </Field>
                  <Field label="Total Units">
                    <TextInput type="number" min="0" value={form.projectTotalUnits} onChange={(e) => set("projectTotalUnits", e.target.value)} placeholder="e.g. 420" />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Homes per Floor">
                    <TextInput type="number" min="0" value={form.projectHomesPerFloor} onChange={(e) => set("projectHomesPerFloor", e.target.value)} placeholder="e.g. 4" />
                  </Field>
                  <Field label="Open Space / Green Area (%)">
                    <TextInput type="number" min="0" max="100" value={form.projectOpenSpacePercent} onChange={(e) => set("projectOpenSpacePercent", e.target.value)} placeholder="e.g. 65" />
                  </Field>
                </div>
                {unitsPerAcrePreview() && (
                  <p className="text-xs" style={{ color: "#6B7280" }}>
                    Density: <span className="font-bold" style={{ color: "#1565C0" }}>{unitsPerAcrePreview()} units/acre</span> — auto-computed from land area and total units, saved automatically.
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Construction Stage">
                    <Select value={form.projectConstructionStage} onChange={(e) => set("projectConstructionStage", e.target.value)}>
                      <option value="">— N/A —</option>
                      {CONSTRUCTION_STAGE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </Select>
                  </Field>
                  <Field label="Expected Possession Date">
                    <TextInput type="date" value={form.projectExpectedPossessionDate} onChange={(e) => set("projectExpectedPossessionDate", e.target.value)} />
                  </Field>
                </div>
                {form.projectConstructionStageVerifiedAt && (
                  <p className="text-xs" style={{ color: "#6B7280" }}>
                    Stage last verified {new Date(form.projectConstructionStageVerifiedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} — updates automatically whenever the stage changes.
                  </p>
                )}
                <Field label="Handover Timeline" hint="Realistic timeline notes — phasing, typical grace period, etc.">
                  <TextInput value={form.projectHandoverTimeline} onChange={(e) => set("projectHandoverTimeline", e.target.value)} placeholder="e.g. Phase 1 by Q4 2027, 3-6 month grace period typical" />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="RERA Registration Number">
                    <TextInput value={form.projectReraNumber} onChange={(e) => set("projectReraNumber", e.target.value)} placeholder="e.g. RP/12/2026/000123" />
                  </Field>
                  <Field label="RERA State">
                    <Select value={form.projectReraState} onChange={(e) => set("projectReraState", e.target.value)}>
                      <option value="">— N/A —</option>
                      {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </Select>
                  </Field>
                  <Field label="RERA Project Name" hint="If different from the marketing name above.">
                    <TextInput value={form.projectReraProjectName} onChange={(e) => set("projectReraProjectName", e.target.value)} />
                  </Field>
                  <Field label="RERA Verification Link">
                    <TextInput value={form.projectReraVerificationLink} onChange={(e) => set("projectReraVerificationLink", e.target.value)} placeholder="https://rera...gov.in/..." />
                  </Field>
                </div>

                <Field label="Approvals & Statutory Documents" hint="All optional — track whichever approvals apply.">
                  <div className="space-y-2.5">
                    {form.projectApprovals.map((a) => (
                      <div key={a._key} className="grid grid-cols-1 sm:grid-cols-[1.5fr_1fr_1.5fr_auto] gap-2 sm:items-center">
                        <TextInput value={a.name} onChange={(e) => updateApproval(a._key, "name", e.target.value)} placeholder="e.g. Environmental Clearance" />
                        <Select value={a.status} onChange={(e) => updateApproval(a._key, "status", e.target.value)}>
                          {APPROVAL_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </Select>
                        <TextInput value={a.documentUrl} onChange={(e) => updateApproval(a._key, "documentUrl", e.target.value)} placeholder="Document link (optional)" />
                        <button type="button" onClick={() => removeApproval(a._key)} className="text-xs font-bold px-2 py-2.5 rounded-lg hover:opacity-80" style={{ color: "#DC2626" }}>Remove</button>
                      </div>
                    ))}
                    <button type="button" onClick={addApproval} className="text-xs font-bold px-3 py-2 rounded-lg" style={{ background: "#EFF6FF", color: "#1565C0" }}>+ Add Approval</button>
                  </div>
                </Field>

                <Field label="Project Documents" hint="Brochure, floor plans, master plan, specification sheet — upload a PDF/image or paste a link.">
                  <div className="space-y-2.5">
                    {form.projectDocuments.map((d) => (
                      <div key={d._key} className="grid grid-cols-1 sm:grid-cols-[1fr_1.2fr_1.5fr_auto_auto] gap-2 sm:items-center">
                        <Select value={d.type} onChange={(e) => updateDocument(d._key, "type", e.target.value)}>
                          {DOCUMENT_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                        </Select>
                        <TextInput value={d.label} onChange={(e) => updateDocument(d._key, "label", e.target.value)} placeholder="Label (e.g. 2026 Brochure)" />
                        <TextInput value={d.url} onChange={(e) => updateDocument(d._key, "url", e.target.value)} placeholder="Link, or upload →" />
                        <label className="text-xs font-bold px-2.5 py-2.5 rounded-lg text-center cursor-pointer" style={{ background: "#F1F5F9", color: "#1F2937" }}>
                          Upload
                          <input type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => handleDocumentFileSelected(d._key, e)} />
                        </label>
                        <button type="button" onClick={() => removeDocument(d._key)} className="text-xs font-bold px-2 py-2.5 rounded-lg hover:opacity-80" style={{ color: "#DC2626" }}>Remove</button>
                      </div>
                    ))}
                    <button type="button" onClick={addDocument} className="text-xs font-bold px-3 py-2 rounded-lg" style={{ background: "#EFF6FF", color: "#1565C0" }}>+ Add Document</button>
                    {docUploading && <p className="text-xs" style={{ color: "#6B7280" }}>Uploading…</p>}
                    {docUploadError && <p className="text-xs" style={{ color: "#DC2626" }}>{docUploadError}</p>}
                  </div>
                </Field>

                <Field label="Construction Progress Photos" hint="Dated photos showing progress over time — shown as a timeline on the property page.">
                  <div className="space-y-2.5">
                    {form.projectConstructionProgressPhotos.map((p) => (
                      <div key={p._key} className="grid grid-cols-1 sm:grid-cols-[1fr_1.5fr_1fr_auto] gap-2 sm:items-center">
                        <TextInput type="date" value={p.date} onChange={(e) => updateProgressPhoto(p._key, "date", e.target.value)} />
                        <TextInput value={p.caption} onChange={(e) => updateProgressPhoto(p._key, "caption", e.target.value)} placeholder="Caption (e.g. Structure work, 8th floor)" />
                        <div className="flex gap-2 items-center">
                          <TextInput value={p.url} onChange={(e) => updateProgressPhoto(p._key, "url", e.target.value)} placeholder="Link, or upload →" />
                          <label className="text-xs font-bold px-2.5 py-2.5 rounded-lg text-center cursor-pointer shrink-0" style={{ background: "#F1F5F9", color: "#1F2937" }}>
                            Upload
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleProgressPhotoFileSelected(p._key, e)} />
                          </label>
                        </div>
                        <button type="button" onClick={() => removeProgressPhoto(p._key)} className="text-xs font-bold px-2 py-2.5 rounded-lg hover:opacity-80" style={{ color: "#DC2626" }}>Remove</button>
                      </div>
                    ))}
                    <button type="button" onClick={addProgressPhoto} className="text-xs font-bold px-3 py-2 rounded-lg" style={{ background: "#EFF6FF", color: "#1565C0" }}>+ Add Progress Photo</button>
                  </div>
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Structure Type">
                    <TextInput value={form.projectStructureType} onChange={(e) => set("projectStructureType", e.target.value)} placeholder="e.g. RCC framed structure" />
                  </Field>
                  <Field label="Construction Quality">
                    <TextInput value={form.projectConstructionQuality} onChange={(e) => set("projectConstructionQuality", e.target.value)} placeholder="e.g. Premium, ISO-certified contractor" />
                  </Field>
                </div>
                <Field label="Key Materials & Brand Specifications">
                  <textarea value={form.projectKeyMaterials} onChange={(e) => set("projectKeyMaterials", e.target.value)} rows={2}
                    placeholder="e.g. UPVC windows, vitrified tile flooring, modular kitchen, Kohler/Jaguar fittings"
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 resize-none" style={inputStyle} />
                </Field>
              </>
            )}
          </div>
        </div>

        {/* ── Legal & Verification Information (Section 2E) ── */}
        <div className="rounded-2xl p-6 space-y-5" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color: "#1F2937" }}>Legal &amp; Verification Information</h2>
            <p className="text-xs mt-1" style={{ color: "#6B7280" }}>Shown on the public listing alongside the standard due-diligence disclaimer.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="RERA Status">
              <Select value={form.reraStatus} onChange={(e) => set("reraStatus", e.target.value)}>
                {RERA_STATUS_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </Select>
            </Field>
            <Field label="Ownership Type">
              <Select value={form.ownershipType} onChange={(e) => set("ownershipType", e.target.value)}>
                <option value="">— N/A —</option>
                {OWNERSHIP_TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </Select>
            </Field>
            <Field label="Title Status">
              <Select value={form.titleStatus} onChange={(e) => set("titleStatus", e.target.value)}>
                <option value="">— N/A —</option>
                {TITLE_STATUS_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Document Verification Status">
              <Select value={form.documentVerificationStatus} onChange={(e) => set("documentVerificationStatus", e.target.value)}>
                {DOC_VERIFICATION_STATUS_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Encumbrance / Loan Status">
              <Select value={form.encumbranceStatus} onChange={(e) => set("encumbranceStatus", e.target.value)}>
                <option value="">— N/A —</option>
                {ENCUMBRANCE_STATUS_OPTIONS.map((e_) => <option key={e_} value={e_}>{e_}</option>)}
              </Select>
            </Field>
            <Field label="Encumbrance Notes">
              <TextInput value={form.encumbranceNotes} onChange={(e) => set("encumbranceNotes", e.target.value)} placeholder="e.g. Existing loan with SBI, NOC pending" />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Occupancy Certificate">
              <Select value={form.occupancyCertificateStatus} onChange={(e) => set("occupancyCertificateStatus", e.target.value)}>
                <option value="">— N/A —</option>
                {CERTIFICATE_STATUS_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Completion Certificate">
              <Select value={form.completionCertificateStatus} onChange={(e) => set("completionCertificateStatus", e.target.value)}>
                <option value="">— N/A —</option>
                {CERTIFICATE_STATUS_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Possession Certificate">
              <Select value={form.possessionCertificateStatus} onChange={(e) => set("possessionCertificateStatus", e.target.value)}>
                <option value="">— N/A —</option>
                {CERTIFICATE_STATUS_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Approved Building Plan">
              <Select value={form.buildingPlanStatus} onChange={(e) => set("buildingPlanStatus", e.target.value)}>
                <option value="">— N/A —</option>
                {BUILDING_PLAN_STATUS_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
              </Select>
            </Field>
            <Field label="Property Tax Status">
              <Select value={form.propertyTaxStatus} onChange={(e) => set("propertyTaxStatus", e.target.value)}>
                <option value="">— N/A —</option>
                {PROPERTY_TAX_STATUS_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </Select>
            </Field>
            <Field label="Utility Connection Status">
              <Select value={form.utilityConnectionStatus} onChange={(e) => set("utilityConnectionStatus", e.target.value)}>
                <option value="">— N/A —</option>
                {UTILITY_STATUS_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Utility Connection Notes">
            <TextInput value={form.utilityConnectionNotes} onChange={(e) => set("utilityConnectionNotes", e.target.value)} placeholder="e.g. Water connected; power meter pending" />
          </Field>

          <div className="rounded-xl p-4" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
            <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer" style={{ color: "#1F2937" }}>
              <input type="checkbox" checked={form.posterVerified} onChange={(e) => setForm((f) => ({ ...f, posterVerified: e.target.checked, verified: e.target.checked }))} className="w-4 h-4 rounded accent-[#1565C0]" />
              Verified {form.postedBy || "Owner"} — shows a "Verified" badge on the public listing
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              <Field label="Verification Date">
                <TextInput type="date" value={form.verificationDate} onChange={(e) => set("verificationDate", e.target.value)} />
              </Field>
              <Field label="Verification Source">
                <TextInput value={form.verificationSource} onChange={(e) => set("verificationSource", e.target.value)} placeholder="e.g. Site visit, document review" />
              </Field>
            </div>
            <button type="button" onClick={markVerifiedToday} className="text-xs font-bold px-3 py-1.5 rounded-lg mt-3" style={{ background: "#EFF6FF", color: "#1565C0" }}>
              Mark Verified Today
            </button>
          </div>

          <p className="text-xs" style={{ color: "#6B7280" }}>
            The standard due-diligence disclaimer is shown automatically alongside this section on every listing — edit its wording under Admin → Site Content → Settings.
          </p>
        </div>

        {/* ── Seller / Agent Information (Section 2H) ── */}
        <div className="rounded-2xl p-6 space-y-5" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color: "#1F2937" }}>Seller &amp; Agent Information</h2>
            <p className="text-xs mt-1" style={{ color: "#6B7280" }}>
              Link an existing agent for their full profile (photo, RERA number, rating, areas served), or fill in plain contact details below — used whenever no agent is linked.
            </p>
          </div>

          <Field label="Link Agent" hint="Only agents you manage in Agents & Partners appear here.">
            <Select value={form.agentId || ""} onChange={(e) => set("agentId", e.target.value || null)}>
              <option value="">— No agent linked (use contact details below) —</option>
              {availableAgents.map((a) => <option key={a.id} value={a.id}>{a.name}{a.agency ? ` · ${a.agency}` : ""} ({a.status})</option>)}
            </Select>
          </Field>

          {!form.agentId && (
            <>
              <div className="flex items-center gap-3">
                {form.posterPhotoUrl ? (
                  <img src={form.posterPhotoUrl} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "#F1F5F9", color: "#6B7280" }}>?</div>
                )}
                <label className="text-xs font-bold px-3 py-2 rounded-lg cursor-pointer" style={{ background: "#F1F5F9", color: "#1F2937" }}>
                  Upload Photo
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={handlePosterPhotoFileSelected} />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Contact Name">
                  <TextInput value={form.posterName} onChange={(e) => set("posterName", e.target.value)} placeholder="e.g. Rajesh Kumar" />
                </Field>
                <Field label="Contact Phone">
                  <TextInput value={form.posterPhone} onChange={(e) => set("posterPhone", e.target.value)} placeholder="e.g. 98765 43210" />
                </Field>
                <Field label="Contact Email">
                  <TextInput value={form.posterEmail} onChange={(e) => set("posterEmail", e.target.value)} placeholder="e.g. rajesh@example.com" />
                </Field>
              </div>

              <Field label="Preferred Contact Methods">
                <div className="flex flex-wrap gap-2">
                  {CONTACT_METHOD_OPTIONS.map((m) => (
                    <Chip key={m} label={m} active={form.posterPreferredContactMethods.includes(m)} onClick={() => toggleInArray("posterPreferredContactMethods", m)} />
                  ))}
                </div>
              </Field>

              <Field label="Availability for Site Visits">
                <TextInput value={form.posterAvailabilityNotes} onChange={(e) => set("posterAvailabilityNotes", e.target.value)} placeholder="e.g. Weekends only, 10am–6pm" />
              </Field>

              <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer" style={{ color: "#1F2937" }}>
                <input type="checkbox" checked={form.posterPhoneMaskingEnabled} onChange={(e) => set("posterPhoneMaskingEnabled", e.target.checked)} className="w-4 h-4 rounded accent-[#1565C0]" />
                Mask phone number until a visitor taps "Reveal"
              </label>
            </>
          )}

          {form.agentId && (
            <p className="text-xs px-3.5 py-2.5 rounded-xl" style={{ background: "#EFF6FF", color: "#1565C0" }}>
              Using the linked agent's profile — manage their photo, contact details, and availability from Admin → Agents &amp; Partners.
            </p>
          )}
        </div>

        {/* ── Photos (Section 2G: Media & Virtual Experience) ── */}
        <div className="rounded-2xl p-6 space-y-4" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
          <h2 className="text-sm font-bold" style={{ color: "#1F2937" }}>Photos</h2>
          <p className="text-xs" style={{ color: "#6B7280" }}>
            Uploaded directly to Cloudflare R2. The first photo is the cover image shown on cards — use "Make Cover" to change it.
          </p>

          {/* Count + mandatory-category checklist — a clear warning, not a hard block (some units genuinely lack a category, e.g. no balcony). */}
          {(() => {
            const missing = missingMandatoryCategories();
            const count = form.images.length;
            if (count >= MIN_PHOTOS && missing.length === 0) {
              return (
                <div className="px-3.5 py-2.5 rounded-xl text-xs font-semibold" style={{ background: "#F0FDF4", color: "#16A34A" }}>
                  ✓ {count} photo{count === 1 ? "" : "s"}, all mandatory categories covered.
                </div>
              );
            }
            return (
              <div className="px-3.5 py-2.5 rounded-xl text-xs" style={{ background: "#FFFBEB", color: "#92400E" }}>
                <p className="font-semibold">
                  {count} of {MIN_PHOTOS}–{MAX_RECOMMENDED_PHOTOS} recommended photos{count < MIN_PHOTOS ? ` (${MIN_PHOTOS - count} more recommended)` : ""}.
                </p>
                {missing.length > 0 && <p className="mt-0.5">Missing room labels for: {missing.join(", ")}. Set a Room Label on at least one photo per category below.</p>}
              </div>
            );
          })()}

          {uploadError && (
            <div className="px-3.5 py-2.5 rounded-xl text-xs font-semibold" style={{ background: "#FEE2E2", color: "#DC2626" }}>{uploadError}</div>
          )}
          {photoWarnings.length > 0 && (
            <div className="px-3.5 py-2.5 rounded-xl text-xs space-y-1" style={{ background: "#FFFBEB", color: "#92400E" }}>
              {photoWarnings.map((w, i) => <p key={i}>⚠ {w}</p>)}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {form.images.map((url, idx) => {
              const detail = imageDetailFor(form, url);
              return (
                <div key={url} className="rounded-xl overflow-hidden" style={{ border: "1px solid #E2E8F0" }}>
                  <div className="relative w-full aspect-square group">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    {idx === 0 && (
                      <span className="absolute top-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#1565C0", color: "#FFFFFF" }}>COVER</span>
                    )}
                    <button type="button" onClick={() => removeImage(url)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: "rgba(0,0,0,0.7)", color: "#FFFFFF" }}>×</button>
                    <div className="absolute bottom-1 left-1 right-1 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                      <button type="button" disabled={idx === 0} onClick={() => moveImage(url, -1)} className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold disabled:opacity-30" style={{ background: "rgba(0,0,0,0.7)", color: "#FFFFFF" }}>‹</button>
                      {idx !== 0 && (
                        <button type="button" onClick={() => makeCoverImage(url)} className="text-[9px] font-bold px-1.5 rounded" style={{ background: "rgba(0,0,0,0.7)", color: "#FFFFFF" }}>Cover</button>
                      )}
                      <button type="button" disabled={idx === form.images.length - 1} onClick={() => moveImage(url, 1)} className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold disabled:opacity-30" style={{ background: "rgba(0,0,0,0.7)", color: "#FFFFFF" }}>›</button>
                    </div>
                  </div>
                  <div className="p-1.5 space-y-1">
                    <Select value={detail.roomLabel} onChange={(e) => setImageDetail(url, "roomLabel", e.target.value)}>
                      <option value="">Room label…</option>
                      {ROOM_LABEL_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </Select>
                    <TextInput value={detail.caption} onChange={(e) => setImageDetail(url, "caption", e.target.value)} placeholder="Caption (optional)" />
                  </div>
                </div>
              );
            })}

            <label className="rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors aspect-square" style={{ border: "1.5px dashed #E2E8F0", color: "#6B7280" }}>
              {uploading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" style={{ color: "#1565C0" }}>
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

        {/* ── Virtual Experience (Section 2G) ── */}
        <div className="rounded-2xl p-6 space-y-5" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color: "#1F2937" }}>Virtual Experience &amp; Floor Plan</h2>
            <p className="text-xs mt-1" style={{ color: "#6B7280" }}>All optional. Project-wide Master Plan / Tower Location Map documents live under Project &amp; Developer Information above.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="360° Virtual Tour Link" hint="Matterport, Kuula, or similar.">
              <TextInput value={form.virtualTourUrl} onChange={(e) => set("virtualTourUrl", e.target.value)} placeholder="https://my.matterport.com/show/?m=..." />
            </Field>
            <Field label="Drone View Link" hint="Only where legally permitted to fly/film.">
              <TextInput value={form.droneViewUrl} onChange={(e) => set("droneViewUrl", e.target.value)} placeholder="https://youtube.com/watch?v=..." />
            </Field>
          </div>
          <Field label="Unit Floor Plan" hint="This unit's own layout — upload an image/PDF or paste a link.">
            <div className="flex gap-2 items-center flex-wrap">
              <TextInput value={form.floorPlanUrl} onChange={(e) => set("floorPlanUrl", e.target.value)} placeholder="Link, or upload →" />
              <label className="text-xs font-bold px-3 py-2.5 rounded-lg text-center cursor-pointer shrink-0" style={{ background: "#F1F5F9", color: "#1F2937" }}>
                Upload
                <input type="file" accept="application/pdf,image/*" className="hidden" onChange={handleFloorPlanFileSelected} />
              </label>
            </div>
          </Field>
          <Field label="Floor Plan Caption">
            <TextInput value={form.floorPlanCaption} onChange={(e) => set("floorPlanCaption", e.target.value)} placeholder="e.g. 3BHK · 1450 sqft, with dimensions" />
          </Field>
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
            <button type="button" onClick={addVideoUrl} className="text-xs font-bold px-4 rounded-xl shrink-0" style={{ background: "#1565C0", color: "#FFFFFF" }}>Add</button>
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

          <Field label="Amenity Availability & Condition" hint="Optional — add detail for any amenity checked above.">
            <div className="space-y-2.5">
              {form.amenityDetails.map((a) => (
                <div key={a._key} className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr_1fr_auto] gap-2 sm:items-center">
                  <Select value={a.name} onChange={(e) => updateAmenityDetail(a._key, "name", e.target.value)}>
                    {form.amenities.length === 0 && <option value="">— No amenities checked —</option>}
                    {form.amenities.map((am) => <option key={am} value={am}>{am}</option>)}
                  </Select>
                  <Select value={a.status} onChange={(e) => updateAmenityDetail(a._key, "status", e.target.value)}>
                    {AMENITY_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
                  <Select value={a.condition} onChange={(e) => updateAmenityDetail(a._key, "condition", e.target.value)}>
                    {AMENITY_CONDITION_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                  <button type="button" onClick={() => removeAmenityDetail(a._key)} className="text-xs font-bold px-2 py-2.5 rounded-lg hover:opacity-80" style={{ color: "#DC2626" }}>Remove</button>
                </div>
              ))}
              <button type="button" onClick={addAmenityDetail} disabled={form.amenities.length === 0} className="text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-40" style={{ background: "#EFF6FF", color: "#1565C0" }}>
                + Add Detail
              </button>
            </div>
          </Field>
        </div>

        {/* ── Amenities & Lifestyle (Section 2F) ── */}
        <div className="rounded-2xl p-6 space-y-6" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color: "#1F2937" }}>Amenities &amp; Lifestyle</h2>
            <p className="text-xs mt-1" style={{ color: "#6B7280" }}>Unit-level features, parking, security, utilities, and accessibility.</p>
          </div>

          <Field label="Unit-Level Features" hint="Specific to this unit — separate from the shared amenities above.">
            <div className="flex flex-wrap gap-2">
              {UNIT_FEATURES_OPTIONS.map((u) => (
                <Chip key={u} label={u} active={form.unitFeatures.includes(u)} onClick={() => toggleInArray("unitFeatures", u)} />
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Parking Type">
              <Select value={form.parkingType} onChange={(e) => set("parkingType", e.target.value)}>
                <option value="">— N/A —</option>
                {PARKING_TYPE_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </Select>
            </Field>
            <Field label="Parking Slots">
              <TextInput type="number" min="0" value={form.parkingSlots} onChange={(e) => set("parkingSlots", e.target.value)} placeholder="e.g. 2" />
            </Field>
            <Field label="EV Charging">
              <Select value={form.evChargingStatus} onChange={(e) => set("evChargingStatus", e.target.value)}>
                <option value="">— N/A —</option>
                {EV_CHARGING_OPTIONS.map((e_) => <option key={e_} value={e_}>{e_}</option>)}
              </Select>
            </Field>
          </div>

          <Field label="Power Backup">
            <Select value={form.powerBackupType} onChange={(e) => set("powerBackupType", e.target.value)}>
              <option value="">— N/A —</option>
              {POWER_BACKUP_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </Field>

          <Field label="Security Features">
            <div className="flex flex-wrap gap-2">
              {SECURITY_FEATURES_OPTIONS.map((s) => (
                <Chip key={s} label={s} active={form.securityFeatures.includes(s)} onClick={() => toggleInArray("securityFeatures", s)} />
              ))}
            </div>
          </Field>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "#6B7280" }}>Water &amp; Sewage</h3>
            <Field label="Water Source">
              <Select value={form.waterSource} onChange={(e) => set("waterSource", e.target.value)}>
                <option value="">— N/A —</option>
                {WATER_SOURCE_OPTIONS.map((w) => <option key={w} value={w}>{w}</option>)}
              </Select>
            </Field>
            <div className="mt-3">
              <Field label="Water & Sewage Features">
                <div className="flex flex-wrap gap-2">
                  {WATER_SEWAGE_FEATURES_OPTIONS.map((w) => (
                    <Chip key={w} label={w} active={form.waterSewageFeatures.includes(w)} onClick={() => toggleInArray("waterSewageFeatures", w)} />
                  ))}
                </div>
              </Field>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Internet / Fibre Readiness">
              <Select value={form.internetReadiness} onChange={(e) => set("internetReadiness", e.target.value)}>
                <option value="">— N/A —</option>
                {INTERNET_READINESS_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
              </Select>
            </Field>
            <Field label="Mobile Network Quality">
              <Select value={form.mobileNetworkQuality} onChange={(e) => set("mobileNetworkQuality", e.target.value)}>
                <option value="">— N/A —</option>
                {MOBILE_NETWORK_QUALITY_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Pet Policy">
              <Select value={form.petPolicy} onChange={(e) => set("petPolicy", e.target.value)}>
                <option value="">— N/A —</option>
                {PET_POLICY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </Select>
            </Field>
            <Field label="Pet Policy Notes">
              <TextInput value={form.petPolicyNotes} onChange={(e) => set("petPolicyNotes", e.target.value)} placeholder="e.g. Small breeds only, registration required" />
            </Field>
          </div>

          <Field label="Senior-Citizen-Friendly Features">
            <div className="flex flex-wrap gap-2">
              {SENIOR_CITIZEN_FEATURES_OPTIONS.map((s) => (
                <Chip key={s} label={s} active={form.seniorCitizenFeatures.includes(s)} onClick={() => toggleInArray("seniorCitizenFeatures", s)} />
              ))}
            </div>
          </Field>

          <Field label="Accessibility Features">
            <div className="flex flex-wrap gap-2">
              {ACCESSIBILITY_FEATURES_OPTIONS.map((a) => (
                <Chip key={a} label={a} active={form.accessibilityFeatures.includes(a)} onClick={() => toggleInArray("accessibilityFeatures", a)} />
              ))}
            </div>
          </Field>
        </div>

        {/* ── Display Options ── */}
        <div className="rounded-2xl p-6 space-y-5" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
          <h2 className="text-sm font-bold" style={{ color: "#1F2937" }}>Display Options</h2>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer" style={{ color: "#1F2937" }}>
              <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} className="w-4 h-4 rounded accent-[#1565C0]" />
              Featured listing
            </label>
          </div>
          <p className="text-xs" style={{ color: "#6B7280" }}>The Verified badge is set from the Legal &amp; Verification section above.</p>

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
              style={{ background: "#1565C0", color: "#FFFFFF" }}>
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
