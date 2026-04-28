import { useEffect, useState } from "react";
import Layout from "../components/Sidebar/Layout";
import { getTechnicians, addTechnician, toggleTechnician, deleteTechnician } from "../services/api";

const downloadReport = async (type, token) => {
  const urls = {
    Energy:     "/api/reports/energy",
    Fault:      "/api/reports/fault",
    Monthly:    "/api/reports/monthly",
    Controller: "/api/reports/controller",
  };
  const res  = await fetch(urls[type], { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const url  = window.URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${type.toLowerCase()}-report.pdf`;
  a.click();
  window.URL.revokeObjectURL(url);
};

const REPORT_BTNS = [
  { label: "⚡ Energy Report",     type: "Energy",     color: "linear-gradient(135deg,#1D4ED8,#3B82F6)", shadow: "rgba(37,99,235,0.25)",  icon: "⚡" },
  { label: "⚠️ Fault Report",      type: "Fault",      color: "linear-gradient(135deg,#B91C1C,#EF4444)", shadow: "rgba(239,68,68,0.25)",  icon: "⚠️" },
  { label: "📊 Monthly Summary",   type: "Monthly",    color: "linear-gradient(135deg,#5B21B6,#7C3AED)", shadow: "rgba(124,58,237,0.25)", icon: "📊" },
  { label: "📡 Controller Health", type: "Controller", color: "linear-gradient(135deg,#057A50,#10B981)", shadow: "rgba(16,185,129,0.25)", icon: "📡" },
];

const inputStyle = {
  background: "#F8FAFC",
  border: "1px solid #E2E8F0",
  borderRadius: "10px",
  padding: "10px 14px",
  color: "#0F172A",
  width: "100%",
  fontSize: "13px",
  fontFamily: "'Inter', sans-serif",
  outline: "none",
  transition: "all 0.2s ease",
};

const ReportsPage = () => {
  const [techs,     setTechs]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showAdd,   setShowAdd]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [generating, setGenerating] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const admin = JSON.parse(localStorage.getItem("admin") || "{}");

  const loadTechs = async () => {
    try {
      const { data } = await getTechnicians();
      setTechs(data.data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { loadTechs(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault(); setError(""); setSaving(true);
    try {
      await addTechnician({ ...form });
      setForm({ name: "", email: "", password: "", phone: "" });
      setShowAdd(false);
      await loadTechs();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add technician");
    } finally { setSaving(false); }
  };

  const handleToggle = async (id) => {
    try { await toggleTechnician(id); await loadTechs(); } catch {}
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this technician?")) return;
    try { await deleteTechnician(id); await loadTechs(); } catch {}
  };

  const handleGenerate = async (type) => {
    setGenerating(type);
    try {
      const token = localStorage.getItem("token");
      await downloadReport(type, token);
    } catch (err) {
      alert("Download failed — is the server running? " + err.message);
    } finally {
      setGenerating(null);
    }
  };

  return (
    <Layout title="Reports & Users">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left: Reports + System Info */}
        <div className="space-y-5">
          {/* Generate Reports */}
          <div
            className="rounded-2xl p-5 fade-up"
            style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", boxShadow: "0 1px 4px rgba(15,23,42,0.06)" }}
          >
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: "#0F172A" }}>
              📄 Generate Reports
            </h3>
            <div className="space-y-2.5">
              {REPORT_BTNS.map((r, idx) => (
                <button
                  key={r.type}
                  onClick={() => handleGenerate(r.type)}
                  disabled={generating === r.type}
                  className="w-full py-3 text-white rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2 btn-ripple"
                  style={{
                    background: r.color,
                    boxShadow: `0 3px 12px ${r.shadow}`,
                    animationDelay: `${idx * 0.05}s`,
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
                >
                  {generating === r.type ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating...
                    </span>
                  ) : r.label}
                </button>
              ))}
            </div>
          </div>

          {/* System Info */}
          <div
            className="rounded-2xl p-5 slide-left"
            style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", boxShadow: "0 1px 4px rgba(15,23,42,0.06)", animationDelay: "0.15s" }}
          >
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: "#0F172A" }}>
              ℹ️ System Info
            </h3>
            {[
              { label: "City",    val: admin.city  },
              { label: "Admin",   val: admin.name  },
              { label: "Role",    val: admin.role  },
              { label: "Version", val: "v1.0.0"    },
            ].map((r) => (
              <div
                key={r.label}
                className="flex justify-between items-center py-2.5 border-b text-xs"
                style={{ borderColor: "#F1F5F9" }}
              >
                <span style={{ color: "#94A3B8" }}>{r.label}</span>
                <span className="mono font-semibold capitalize" style={{ color: "#0F172A" }}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Technician Management */}
        <div className="lg:col-span-2">
          <div
            className="rounded-2xl overflow-hidden slide-right"
            style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", boxShadow: "0 1px 4px rgba(15,23,42,0.06)", animationDelay: "0.1s" }}
          >
            {/* Header */}
            <div
              className="px-5 py-4 border-b flex items-center justify-between"
              style={{ borderColor: "#F1F5F9", background: "#FAFBFD" }}
            >
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: "#0F172A" }}>
                  👥 Technician Management
                </h3>
                <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>Technicians added by the administrator</p>
              </div>
              <button
                onClick={() => { setShowAdd(!showAdd); setError(""); }}
                className="px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 btn-ripple"
                style={showAdd ? {
                  background: "#FEF2F2", color: "#991B1B", border: "1px solid #FECACA",
                } : {
                  background: "linear-gradient(135deg,#1D4ED8,#2563EB)",
                  color: "white",
                  boxShadow: "0 3px 12px rgba(37,99,235,0.3)",
                }}
              >
                {showAdd ? "✕ Cancel" : "+ Add Technician"}
              </button>
            </div>

            {/* Add Form */}
            {showAdd && (
              <div
                className="p-5 border-b scale-in"
                style={{ borderColor: "#F1F5F9", background: "#F8FAFC" }}
              >
                <h4 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: "#0F172A" }}>
                  ➕ New Technician
                </h4>
                {error && (
                  <div
                    className="mb-3 p-3 rounded-xl text-sm scale-in"
                    style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B" }}
                  >
                    ⚠️ {error}
                  </div>
                )}
                <form onSubmit={handleAdd}>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {[
                      { name: "name",     type: "text",     label: "Full Name",  ph: "Ramesh Kumar",     required: true,  icon: "👤" },
                      { name: "email",    type: "email",    label: "Email",       ph: "tech@example.com", required: true,  icon: "📧" },
                      { name: "password", type: "password", label: "Password",    ph: "Min 6 characters", required: true,  icon: "🔒" },
                      { name: "phone",    type: "text",     label: "Phone",       ph: "9876543210",       required: false, icon: "📱" },
                    ].map((f) => (
                      <div key={f.name}>
                        <label className="block text-xs mb-1.5 font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
                          {f.icon} {f.label}
                        </label>
                        <input
                          name={f.name} type={f.type} placeholder={f.ph} required={f.required}
                          value={form[f.name]}
                          onChange={(e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }))}
                          style={inputStyle}
                          onFocus={e => { e.target.style.borderColor = "rgba(37,99,235,0.4)"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)"; e.target.style.background = "#FFFFFF"; }}
                          onBlur={e => { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "none"; e.target.style.background = "#F8FAFC"; }}
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 text-white rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 btn-ripple"
                    style={{
                      background: "linear-gradient(135deg,#057A50,#10B981)",
                      boxShadow: "0 3px 12px rgba(16,185,129,0.3)",
                    }}
                  >
                    {saving ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Adding...
                      </span>
                    ) : "✓ Add Technician"}
                  </button>
                </form>
              </div>
            )}

            {/* Technician Table */}
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="text-xs uppercase border-b"
                  style={{ borderColor: "#F1F5F9", background: "#FAFBFD", color: "#94A3B8", letterSpacing: "0.06em" }}
                >
                  {["Name", "Email", "Phone", "City", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3.5 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i} className="border-b" style={{ borderColor: "#F1F5F9" }}>
                      {[...Array(6)].map((_, j) => (
                        <td key={j} className="px-4 py-4">
                          <div
                            className="h-4 rounded-lg"
                            style={{
                              width: "80px",
                              background: "linear-gradient(90deg,#F1F5F9,#E2E8F0,#F1F5F9)",
                              backgroundSize: "200% 100%",
                              animation: "shimmer 1.5s ease infinite",
                            }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : techs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-sm" style={{ color: "#94A3B8" }}>
                      <div className="text-2xl mb-2 float-anim">👥</div>
                      No technicians found — use the "Add Technician" button to create one
                    </td>
                  </tr>
                ) : techs.map((t) => (
                  <tr key={t._id} className="border-b group" style={{ borderColor: "#F1F5F9" }}>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: "linear-gradient(135deg,#1D4ED8,#3B82F6)" }}
                        >
                          {t.name[0].toUpperCase()}
                        </div>
                        <span className="font-semibold group-hover:text-blue-600 transition-colors" style={{ color: "#0F172A" }}>
                          {t.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 mono text-xs" style={{ color: "#64748B" }}>{t.email}</td>
                    <td className="px-4 py-3.5 mono text-xs" style={{ color: "#64748B" }}>{t.phone || "—"}</td>
                    <td className="px-4 py-3.5 text-xs" style={{ color: "#64748B" }}>{t.city}</td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => handleToggle(t._id)}
                        className="relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300"
                        style={{
                          background: t.is_active ? "#10B981" : "#CBD5E1",
                          boxShadow: t.is_active ? "0 0 10px rgba(16,185,129,0.3)" : "none",
                        }}
                      >
                        <span
                          className="inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-300 shadow-sm"
                          style={{ transform: t.is_active ? "translateX(24px)" : "translateX(4px)" }}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => handleDelete(t._id)}
                        className="px-3 py-1.5 text-xs rounded-lg font-semibold transition-all duration-200"
                        style={{ background: "#FEF2F2", color: "#991B1B", border: "1px solid #FECACA" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#EF4444"; e.currentTarget.style.color = "#FFFFFF"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "#FEF2F2"; e.currentTarget.style.color = "#991B1B"; }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ReportsPage;
