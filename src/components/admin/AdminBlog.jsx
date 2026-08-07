import { useState, useEffect } from "react";
import AdminLayout from "./AdminLayout";
import { fetchAdminPosts, updatePostStatus, deletePost } from "../../lib/blogPosts";

// ── Data ──────────────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  Published: { bg: "#F0FDF4", color: "#16A34A" },
  Draft: { bg: "#F1F5F9", color: "#6B7280" },
  Archived: { bg: "#FEE2E2", color: "#DC2626" },
};
const FILTER_TABS = ["All", "Published", "Draft", "Archived"];

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.Draft;
  return <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: s.bg, color: s.color }}>{status}</span>;
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function AdminBlog({ onNavigate, onLogout, adminProfile }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [busyIds, setBusyIds] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await fetchAdminPosts();
    setPosts(data);
    setErrorMsg(error ? (error.message || "Couldn't load posts — check your Supabase connection (see SETUP.md).") : "");
    setLoading(false);
  }

  const filtered = posts.filter((p) => {
    if (activeFilter !== "All" && p.status !== activeFilter) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    All: posts.length,
    Published: posts.filter((p) => p.status === "Published").length,
    Draft: posts.filter((p) => p.status === "Draft").length,
    Archived: posts.filter((p) => p.status === "Archived").length,
  };

  async function handlePublishToggle(post) {
    setBusyIds((b) => [...b, post.id]);
    await updatePostStatus(post.dbId, post.status === "Published" ? "Draft" : "Published");
    await load();
    setBusyIds((b) => b.filter((x) => x !== post.id));
  }

  async function handleDelete(post) {
    setBusyIds((b) => [...b, post.id]);
    await deletePost(post.dbId);
    await load();
  }

  return (
    <AdminLayout activePage="blog" onNavigate={onNavigate} onLogout={onLogout} adminProfile={adminProfile} title="Blog & Insights" subtitle="Write and publish articles for the public site">
      <div className="space-y-5">

        {errorMsg && (
          <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: "#FEE2E2", color: "#DC2626" }}>{errorMsg}</div>
        )}

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 w-full sm:w-72" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: "#6B7280" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search articles..."
              className="flex-1 text-sm bg-transparent focus:outline-none" style={{ color: "#1F2937" }} />
          </div>
          <button onClick={() => onNavigate("blog-form", null)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: "#1565C0", color: "#FFFFFF" }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Write Article
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {FILTER_TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveFilter(tab)}
              className="shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all"
              style={{
                background: activeFilter === tab ? "#1565C0" : "#FFFFFF",
                color: activeFilter === tab ? "#FFFFFF" : "#6B7280",
                border: `1px solid ${activeFilter === tab ? "#1565C0" : "#E2E8F0"}`,
              }}>
              {tab}
              <span className="text-[10px] font-bold px-1.5 rounded-full"
                style={{ background: activeFilter === tab ? "rgba(255,255,255,0.25)" : "#F1F5F9", color: activeFilter === tab ? "#FFFFFF" : "#6B7280" }}>
                {counts[tab]}
              </span>
            </button>
          ))}
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" style={{ color: "#1565C0" }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <span className="text-sm" style={{ color: "#6B7280" }}>Loading articles...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-4xl mb-3">📰</span>
              <p className="text-sm font-bold" style={{ color: "#1F2937" }}>{posts.length === 0 ? "No articles yet" : "No articles match this filter"}</p>
              <p className="text-xs mt-1 mb-4" style={{ color: "#6B7280" }}>
                {posts.length === 0 ? "Write your first article to populate the public Blog & Insights page." : "Try a different filter or search."}
              </p>
              {posts.length === 0 && (
                <button onClick={() => onNavigate("blog-form", null)} className="text-xs font-bold px-4 py-2 rounded-lg" style={{ background: "#1565C0", color: "#FFFFFF" }}>
                  Write Article
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "#F1F5F9", borderBottom: "1px solid #E2E8F0" }}>
                    <th className="px-5 py-3.5 text-left font-bold" style={{ color: "#1F2937" }}>Article</th>
                    <th className="px-3 py-3.5 text-left font-bold hidden md:table-cell" style={{ color: "#1F2937" }}>Category</th>
                    <th className="px-3 py-3.5 text-left font-bold hidden lg:table-cell" style={{ color: "#1F2937" }}>Author</th>
                    <th className="px-3 py-3.5 text-left font-bold hidden lg:table-cell" style={{ color: "#1F2937" }}>Views</th>
                    <th className="px-3 py-3.5 text-left font-bold">Status</th>
                    <th className="px-5 py-3.5 text-right font-bold" style={{ color: "#1F2937" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((post, i) => (
                    <tr key={post.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid #F1F5F9" : "none", opacity: busyIds.includes(post.id) ? 0.5 : 1 }}>
                      <td className="px-5 py-3.5">
                        <button onClick={() => onNavigate("blog-form", post)} className="flex items-center gap-3 text-left">
                          <div className="w-10 h-10 rounded-lg shrink-0 bg-cover bg-center" style={{ backgroundImage: `url(${post.image})` }} />
                          <p className="font-semibold truncate max-w-[220px]" style={{ color: "#1F2937" }}>{post.title}</p>
                        </button>
                      </td>
                      <td className="px-3 py-3.5 hidden md:table-cell" style={{ color: "#6B7280" }}>{post.category}</td>
                      <td className="px-3 py-3.5 hidden lg:table-cell" style={{ color: "#6B7280" }}>{post.author}</td>
                      <td className="px-3 py-3.5 hidden lg:table-cell" style={{ color: "#6B7280" }}>{post.views}</td>
                      <td className="px-3 py-3.5"><StatusBadge status={post.status} /></td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => handlePublishToggle(post)}
                            className="text-xs font-bold px-2.5 py-1.5 rounded-lg"
                            style={{ background: post.status === "Published" ? "#F1F5F9" : "#F0FDF4", color: post.status === "Published" ? "#6B7280" : "#16A34A" }}>
                            {post.status === "Published" ? "Unpublish" : "Publish"}
                          </button>
                          <button onClick={() => onNavigate("blog-form", post)}
                            className="text-xs font-bold px-2.5 py-1.5 rounded-lg" style={{ background: "#EFF6FF", color: "#1565C0" }}>
                            Edit
                          </button>
                          <button onClick={() => handleDelete(post)}
                            className="text-xs font-bold px-2.5 py-1.5 rounded-lg" style={{ background: "#FEE2E2", color: "#DC2626" }}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
