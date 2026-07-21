import { supabase, safeQuery } from "./supabaseClient";

// ── Blog Posts Data Layer ─────────────────────────────────────────────────────

const CATEGORY_COLORS = {
  "Buying Guide": "bg-[#16a34a]",
  "Investment Insights": "bg-purple-600",
  "Project Reviews": "bg-[#a78bfa]",
  "Home & Lifestyle": "bg-[#E87C02]",
  "Market Reports": "bg-blue-600",
};

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=240&fit=crop";

function formatViews(n) {
  const v = n || 0;
  return v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v);
}

export function normalizePost(row) {
  const displayDate = row.published_at || row.created_at;
  return {
    id: row.id,
    dbId: row.id,
    category: row.category,
    categoryColor: CATEGORY_COLORS[row.category] || "bg-slate-600",
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt || "",
    content: row.content || "",
    author: row.author_name,
    date: displayDate ? new Date(displayDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "",
    readTime: row.read_time_minutes ? `${row.read_time_minutes} min read` : "5 min read",
    image: row.cover_image_url || PLACEHOLDER_IMAGE,
    tags: row.tags || [],
    views: formatViews(row.views),
    viewsRaw: row.views || 0,
    status: row.status,
    publishedAt: row.published_at,
    createdAt: row.created_at,
  };
}

export function denormalizePost(f) {
  return {
    title: f.title,
    slug: f.slug || slugify(f.title),
    category: f.category,
    excerpt: f.excerpt || null,
    content: f.content || null,
    author_name: f.author,
    cover_image_url: f.image || null,
    tags: f.tags || [],
    read_time_minutes: f.readTimeMinutes ? Number(f.readTimeMinutes) : null,
    status: f.status || "Draft",
    published_at: f.status === "Published" ? (f.publishedAt || new Date().toISOString()) : f.publishedAt || null,
    updated_at: new Date().toISOString(),
  };
}

export function slugify(title) {
  return (title || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function fetchPublicPosts() {
  const { data, error } = await safeQuery(
    supabase.from("blog_posts").select("*").eq("status", "Published").order("published_at", { ascending: false })
  );
  if (error) return { data: [], error };
  return { data: (data || []).map(normalizePost), error: null };
}

export async function fetchAdminPosts() {
  const { data, error } = await safeQuery(
    supabase.from("blog_posts").select("*").order("created_at", { ascending: false })
  );
  if (error) return { data: [], error };
  return { data: (data || []).map(normalizePost), error: null };
}

export async function fetchPostBySlug(slug) {
  const { data, error } = await safeQuery(supabase.from("blog_posts").select("*").eq("slug", slug).single());
  if (error) return { data: null, error };
  return { data: normalizePost(data), error: null };
}

// Used by the Saved Properties page's "Articles" tab.
export async function fetchPostsByIds(ids) {
  if (!ids || ids.length === 0) return { data: [], error: null };
  const { data, error } = await safeQuery(supabase.from("blog_posts").select("*").in("id", ids));
  if (error) return { data: [], error };
  return { data: (data || []).map(normalizePost), error: null };
}

export async function createPost(post) {
  const { data, error } = await safeQuery(supabase.from("blog_posts").insert(denormalizePost(post)).select().single());
  if (error) return { data: null, error };
  return { data: normalizePost(data), error: null };
}

export async function updatePost(id, post) {
  const { data, error } = await safeQuery(
    supabase.from("blog_posts").update(denormalizePost(post)).eq("id", id).select().single()
  );
  if (error) return { data: null, error };
  return { data: normalizePost(data), error: null };
}

export async function updatePostStatus(id, status) {
  const payload = { status, updated_at: new Date().toISOString() };
  if (status === "Published") payload.published_at = new Date().toISOString();
  const { data, error } = await safeQuery(supabase.from("blog_posts").update(payload).eq("id", id).select().single());
  if (error) return { data: null, error };
  return { data: normalizePost(data), error: null };
}

export async function deletePost(id) {
  const { error } = await safeQuery(supabase.from("blog_posts").delete().eq("id", id));
  return { error };
}
