import { useState } from "react";
import AdminLayout from "./AdminLayout";
import { createPost, updatePost, deletePost, slugify } from "../../lib/blogPosts";
import { uploadToR2, validateImageFile } from "../../lib/r2Upload";

const CATEGORIES = ["Buying Guide", "Investment Insights", "Project Reviews", "Home & Lifestyle", "Market Reports"];

const EMPTY_FORM = {
  title: "",
  slug: "",
  category: "Buying Guide",
  excerpt: "",
  content: "",
  author: "",
  image: "",
  tags: [],
  readTimeMinutes: "",
  status: "Draft",
};

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

const inputStyle = { background: "#FFFFFF", border: "1px solid #E5E8EB", color: "#15191C" };

function TextInput(props) {
  return <input {...props} className="w-full text-sm px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2" style={inputStyle} />;
}

function Select({ children, ...props }) {
  return <select {...props} className="w-full text-sm px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2" style={inputStyle}>{children}</select>;
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function AdminBlogForm({ onNavigate, onLogout, adminProfile, editingListing: editingPost }) {
  const isEditing = !!editingPost;
  const [form, setForm] = useState(() => (isEditing ? { ...EMPTY_FORM, ...editingPost, tags: editingPost.tags || [] } : EMPTY_FORM));
  const [tagInput, setTagInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addTag() {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) set("tags", [...form.tags, t]);
    setTagInput("");
  }

  function removeTag(t) {
    set("tags", form.tags.filter((x) => x !== t));
  }

  async function handleCoverUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    const validationError = validateImageFile(file);
    if (validationError) { setUploadError(validationError); return; }
    setUploading(true);
    const result = await uploadToR2(file, "blog");
    setUploading(false);
    if (result.error) { setUploadError(result.error); return; }
    set("image", result.url);
    e.target.value = "";
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaveError("");

    if (!form.title || !form.author || !form.content) {
      setSaveError("Title, author, and content are required.");
      return;
    }

    setSaving(true);
    const payload = { ...form, slug: form.slug || slugify(form.title) };
    const { error } = isEditing
      ? await updatePost(editingPost.dbId, payload)
      : await createPost(payload);
    setSaving(false);

    if (error) {
      setSaveError(error.message || "Something went wrong while saving. Check your Supabase connection.");
      return;
    }
    onNavigate("blog");
  }

  async function handleDelete() {
    setDeleting(true);
    const { error } = await deletePost(editingPost.dbId);
    setDeleting(false);
    if (error) { setSaveError(error.message || "Failed to delete article."); return; }
    onNavigate("blog");
  }

  return (
    <AdminLayout
      activePage="blog"
      onNavigate={onNavigate}
      onLogout={onLogout}
      adminProfile={adminProfile}
      title={isEditing ? "Edit Article" : "Write Article"}
      subtitle={isEditing ? form.title : "Publish a new post to the public Blog & Insights page"}
    >
      <form onSubmit={handleSave} className="max-w-3xl space-y-6">

        {saveError && (
          <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: "#FCEAEA", color: "#BA0D0B" }}>{saveError}</div>
        )}

        <div className="rounded-2xl p-6 space-y-5" style={{ background: "#FFFFFF", border: "1px solid #E5E8EB" }}>
          <Field label="Title" required>
            <TextInput value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. 5 Things to Check Before Buying in Ranchi" required />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Category">
              <Select value={form.category} onChange={(e) => set("category", e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Author">
              <TextInput value={form.author} onChange={(e) => set("author", e.target.value)} placeholder="e.g. Priya Sharma" required />
            </Field>
          </div>

          <Field label="Excerpt">
            <textarea value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} rows={2}
              placeholder="A short 1-2 sentence summary shown on article cards..."
              className="w-full text-sm px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 resize-none" style={inputStyle} />
          </Field>

          <Field label="Content" required>
            <textarea value={form.content} onChange={(e) => set("content", e.target.value)} rows={10}
              placeholder="Write the full article..."
              className="w-full text-sm px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 resize-none font-mono" style={inputStyle} required />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Read Time (minutes)">
              <TextInput type="number" min="1" value={form.readTimeMinutes} onChange={(e) => set("readTimeMinutes", e.target.value)} placeholder="e.g. 5" />
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="Draft">Draft</option>
                <option value="Published">Published</option>
                <option value="Archived">Archived</option>
              </Select>
            </Field>
          </div>
        </div>

        {/* ── Cover Image ── */}
        <div className="rounded-2xl p-6 space-y-4" style={{ background: "#FFFFFF", border: "1px solid #E5E8EB" }}>
          <h2 className="text-sm font-bold" style={{ color: "#15191C" }}>Cover Image</h2>
          {uploadError && <div className="px-3.5 py-2.5 rounded-xl text-xs font-semibold" style={{ background: "#FCEAEA", color: "#BA0D0B" }}>{uploadError}</div>}
          <div className="flex items-center gap-4">
            {form.image && (
              <div className="relative w-32 h-20 rounded-xl overflow-hidden" style={{ border: "1px solid #E5E8EB" }}>
                <img src={form.image} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => set("image", "")}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: "rgba(0,0,0,0.7)", color: "#FFFFFF" }}>×</button>
              </div>
            )}
            <label className="px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer" style={{ background: "#F2F4F6", color: "#495057" }}>
              {uploading ? "Uploading..." : form.image ? "Replace Image" : "Upload Image"}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={handleCoverUpload} className="hidden" disabled={uploading} />
            </label>
          </div>
        </div>

        {/* ── Tags ── */}
        <div className="rounded-2xl p-6 space-y-3" style={{ background: "#FFFFFF", border: "1px solid #E5E8EB" }}>
          <h2 className="text-sm font-bold" style={{ color: "#15191C" }}>Tags</h2>
          <div className="flex flex-wrap gap-2">
            {form.tags.map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: "#EAF4FB", color: "#2C9DD5" }}>
                {t}
                <button type="button" onClick={() => removeTag(t)} className="font-bold">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              placeholder="Type a tag and press Enter" className="flex-1 text-sm px-3.5 py-2.5 rounded-xl focus:outline-none" style={inputStyle} />
            <button type="button" onClick={addTag} className="px-4 py-2.5 rounded-xl text-sm font-bold" style={{ background: "#F2F4F6", color: "#495057" }}>Add</button>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-8">
          <div className="flex gap-3">
            <button type="submit" disabled={saving || uploading}
              className="px-6 py-3 rounded-xl text-sm font-bold disabled:opacity-50" style={{ background: "#BA0D0B", color: "#FFFFFF" }}>
              {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Article"}
            </button>
            <button type="button" onClick={() => onNavigate("blog")} className="px-6 py-3 rounded-xl text-sm font-bold" style={{ background: "#F2F4F6", color: "#495057" }}>
              Cancel
            </button>
          </div>

          {isEditing && (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold" style={{ color: "#BA0D0B" }}>Delete this article permanently?</span>
                <button type="button" onClick={handleDelete} disabled={deleting} className="px-4 py-2 rounded-xl text-xs font-bold" style={{ background: "#BA0D0B", color: "#FFFFFF" }}>
                  {deleting ? "Deleting..." : "Yes, Delete"}
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="px-4 py-2 rounded-xl text-xs font-bold" style={{ background: "#F2F4F6", color: "#495057" }}>Cancel</button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="text-sm font-bold hover:underline" style={{ color: "#BA0D0B" }}>Delete Article</button>
            )
          )}
        </div>
      </form>
    </AdminLayout>
  );
}
