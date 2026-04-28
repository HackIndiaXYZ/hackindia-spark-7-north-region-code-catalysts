import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Sidebar/Layout";
import { getAllLights } from "../services/api";

const STATUS_BADGE = {
  ON:      "badge-active",
  IDLE:    "badge-idle",
  FAULT:   "badge-fault",
  DAY_OFF: "badge-offline",
  OFFLINE: "badge-offline",
};

const STATUS_DOT = {
  ON:      { bg: "#ECFDF5", border: "#A7F3D0", dot: "#10B981" },
  IDLE:    { bg: "#FFFBEB", border: "#FDE68A", dot: "#F59E0B" },
  FAULT:   { bg: "#FEF2F2", border: "#FECACA", dot: "#EF4444" },
  DAY_OFF: { bg: "#F8FAFC", border: "#E2E8F0", dot: "#94A3B8" },
  OFFLINE: { bg: "#F1F5F9", border: "#CBD5E1", dot: "#64748B" },
};

const FILTER_BTNS = [
  { key: "ALL",     label: "All" },
  { key: "ON",      label: "ON",      dot: "#10B981" },
  { key: "IDLE",    label: "Idle",    dot: "#F59E0B" },
  { key: "FAULT",   label: "Fault",   dot: "#EF4444" },
  { key: "DAY_OFF", label: "Day Off", dot: "#94A3B8" },
  { key: "OFFLINE", label: "Offline", dot: "#64748B" },
];

const LightsPage = () => {
  const navigate = useNavigate();
  const [lights,  setLights]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("ALL");
  const [search,  setSearch]  = useState("");
  const admin = JSON.parse(localStorage.getItem("admin") || "{}");

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await getAllLights(admin.city);
        setLights(data.data);
      } catch {}
      finally { setLoading(false); }
    };
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  const filtered = lights.filter((l) => {
    const matchFilter = filter === "ALL" || l.current_status === filter;
    const matchSearch = l.light_id.toLowerCase().includes(search.toLowerCase()) ||
                        l.controller_id.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const statusCounts = {
    ALL:     lights.length,
    ON:      lights.filter(l => l.current_status === "ON").length,
    IDLE:    lights.filter(l => l.current_status === "IDLE").length,
    FAULT:   lights.filter(l => l.current_status === "FAULT").length,
    DAY_OFF: lights.filter(l => l.current_status === "DAY_OFF").length,
    OFFLINE: lights.filter(l => l.current_status === "OFFLINE").length,
  };

  return (
    <Layout title="Street Light Management">

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-5 fade-up">
        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#94A3B8" }}>🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Light ID / Controller..."
            className="pl-9 pr-4 py-2.5 rounded-xl text-sm transition-all duration-200"
            style={{
              minWidth: "260px",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              color: "#0F172A",
              outline: "none",
              boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
            }}
            onFocus={e => { e.target.style.borderColor = "rgba(37,99,235,0.4)"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)"; }}
            onBlur={e => { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "0 1px 3px rgba(15,23,42,0.04)"; }}
          />
        </div>

        {/* Filter Buttons */}
        {FILTER_BTNS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-2"
            style={filter === f.key ? {
              background: "linear-gradient(135deg, #1D4ED8, #2563EB)",
              color: "#FFFFFF",
              boxShadow: "0 3px 12px rgba(37,99,235,0.3)",
              border: "1px solid transparent",
            } : {
              background: "#FFFFFF",
              color: "#475569",
              border: "1px solid #E2E8F0",
              boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
            }}
          >
            {f.dot && (
              <span className="w-2 h-2 rounded-full" style={{ background: filter === f.key ? "rgba(255,255,255,0.7)" : f.dot }} />
            )}
            {f.label}
            <span style={{ opacity: 0.65 }}>({statusCounts[f.key]})</span>
          </button>
        ))}

        <span
          className="ml-auto text-xs mono px-3 py-1.5 rounded-lg font-medium"
          style={{ background: "#F0F4F8", color: "#64748B", border: "1px solid #E2E8F0" }}
        >
          {filtered.length} lights
        </span>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl overflow-hidden fade-up"
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
          animationDelay: "0.1s",
        }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr
              className="text-xs uppercase border-b"
              style={{
                borderColor: "#F1F5F9",
                background: "#FAFBFD",
                color: "#94A3B8",
                letterSpacing: "0.06em",
              }}
            >
              {["Light ID", "Controller", "Area", "Status", "Energy Usage", "Last Update", "Actions"].map((h) => (
                <th key={h} className="text-left px-4 py-3.5 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b" style={{ borderColor: "#F1F5F9" }}>
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="px-4 py-4">
                      <div
                        className="h-4 rounded-lg"
                        style={{
                          width: `${60 + Math.random() * 60}px`,
                          background: "linear-gradient(90deg, #F1F5F9, #E2E8F0, #F1F5F9)",
                          backgroundSize: "200% 100%",
                          animation: "shimmer 1.5s ease infinite",
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-14" style={{ color: "#94A3B8" }}>
                  <div className="text-3xl mb-2 float-anim">💡</div>
                  <div className="text-sm">No lights found</div>
                </td>
              </tr>
            ) : filtered.map((l) => {
              const statusStyle = STATUS_DOT[l.current_status] || STATUS_DOT.DAY_OFF;
              return (
                <tr
                  key={l.light_id}
                  className="border-b cursor-pointer group"
                  style={{ borderColor: "#F1F5F9" }}
                  onClick={() => navigate(`/lights/${l.light_id}`)}
                >
                  <td className="px-4 py-3.5 font-bold mono transition-colors" style={{ color: "#0F172A" }}>
                    <span className="group-hover:text-blue-600 transition-colors">{l.light_id}</span>
                  </td>
                  <td className="px-4 py-3.5 mono" style={{ color: "#64748B" }}>{l.controller_id}</td>
                  <td className="px-4 py-3.5" style={{ color: "#64748B" }}>{l.location?.address || l.city || "—"}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                      style={{
                        background: statusStyle.bg,
                        border: `1px solid ${statusStyle.border}`,
                        color: l.current_status === "ON" ? "#065F46" : l.current_status === "IDLE" ? "#92400E" : l.current_status === "FAULT" ? "#991B1B" : l.current_status === "OFFLINE" ? "#334155" : "#475569",
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusStyle.dot }} />
                      {l.current_status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 mono" style={{ color: "#64748B" }}>
                    {l.current_status === "ON" ? `${(l.current_usage * 220 / 1000).toFixed(2)} kWh` : "0 kWh"}
                  </td>
                  <td className="px-4 py-3.5 mono text-xs" style={{ color: "#94A3B8" }}>
                    {new Date(l.last_updated).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      className="px-3 py-1.5 text-xs rounded-lg font-semibold mono transition-all duration-200"
                      style={{
                        background: "#EFF6FF",
                        color: "#2563EB",
                        border: "1px solid #BFDBFE",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#2563EB"; e.currentTarget.style.color = "#FFFFFF"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "#EFF6FF"; e.currentTarget.style.color = "#2563EB"; }}
                    >
                      View →
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Layout>
  );
};

export default LightsPage;
