import AdminLayout from "./AdminLayout";

const FAQS = [
  {
    q: "How do I publish a new listing?",
    a: "Property Listings → Add Listing, fill in the details and photos, then flip Moderation Status to Live once you're ready for it to go public.",
  },
  {
    q: "Why isn't a new listing showing on the public site?",
    a: "New listings — including ones visitors submit themselves via Post Property — start as Pending. Approve them from the Listings table to make them Live.",
  },
  {
    q: "How do I verify an agent?",
    a: "Agents & Partners → find their row → change status from Pending to Verified.",
  },
  {
    q: "Photo upload is failing",
    a: "This usually means the shared upload Worker doesn't have this console's domain in its allowed origins. Ask whoever manages the Cloudflare Worker to check its ALLOWED_ORIGINS secret.",
  },
];

// ⚠️ Update this to your real support inbox.
const SUPPORT_EMAIL = "support@propertybrands.in";

export default function AdminHelpSupport({ onNavigate, onLogout, adminProfile }) {
  return (
    <AdminLayout
      activePage="help"
      onNavigate={onNavigate}
      onLogout={onLogout}
      adminProfile={adminProfile}
      title="Help & Support"
      subtitle="Common questions and how to get help"
    >
      <div className="max-w-lg space-y-5">
        <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
          {FAQS.map((item, i) => (
            <div key={i} className="px-6 py-4" style={{ borderBottom: i < FAQS.length - 1 ? "1px solid #F1F5F9" : "none" }}>
              <p className="text-sm font-bold mb-1" style={{ color: "#1F2937" }}>{item.q}</p>
              <p className="text-xs" style={{ color: "#6B7280" }}>{item.a}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl p-6" style={{ background: "#EFF6FF", border: "1px solid #1565C0" }}>
          <h2 className="text-sm font-bold mb-2" style={{ color: "#1F2937" }}>Still stuck?</h2>
          <p className="text-xs mb-3" style={{ color: "#6B7280" }}>
            Reach out and include what you were trying to do and any error message you saw.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="inline-block text-sm font-bold px-4 py-2.5 rounded-xl"
            style={{ background: "#1565C0", color: "#FFFFFF" }}
          >
            Email {SUPPORT_EMAIL}
          </a>
        </div>
      </div>
    </AdminLayout>
  );
}
