import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Sidebar/Layout";
import LiveMap from "../components/Dashboard/LiveMap";
import { getDashboardStats, getActiveFaults, getControllerHealth, getMaintenanceOrders } from "../services/api";

const AnimatedNumber = ({ value, suffix = "" }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === null || value === undefined) return;
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) { setDisplay(value); return; }
    const duration = 800;
    const start = performance.now();
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(num * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  return <>{display}{suffix}</>;
};

/** Premium stat card — colored gradient top bar + white body */
const StatCard = ({ label, value, icon, accentColor, accentBg, sub, delay = 0 }) => (
  <div
    className="rounded-2xl overflow-hidden fade-up card-hover"
    style={{
      background: "#FFFFFF",
      border: "1px solid #E2E8F0",
      boxShadow: "0 1px 4px rgba(15,23,42,0.06), 0 4px 12px rgba(15,23,42,0.04)",
      animationDelay: `${delay}s`,
    }}
  >
    {/* Top color bar */}
    <div className="h-1 w-full" style={{ background: accentColor }} />
    <div className="p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold" style={{ color: "#64748B" }}>{label}</span>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg float-anim"
          style={{ background: accentBg, animationDelay: `${delay * 2}s` }}
        >
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold mono" style={{ color: "#0F172A", letterSpacing: "-0.02em" }}>
        {value !== null && value !== undefined ? value : "—"}
      </div>
      {sub && <div className="text-xs mt-1.5 font-medium" style={{ color: "#94A3B8" }}>{sub}</div>}
    </div>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [admin,  setAdmin]  = useState(null);
  const [stats,  setStats]  = useState(null);
  const [faults, setFaults] = useState([]);
  const [ctrls,  setCtrls]  = useState([]);
  const [maintenance, setMaintenance] = useState({ open: 0, inProgress: 0, completed: 0 });

  useEffect(() => {
    const a = localStorage.getItem("admin");
    if (!a) { navigate("/login"); return; }
    setAdmin(JSON.parse(a));
  }, []);

  useEffect(() => {
    if (!admin) return;
    const load = async () => {
      try {
        const [s, f, c, m] = await Promise.all([
          getDashboardStats(admin.city),
          getActiveFaults(admin.city),
          getControllerHealth(admin.city),
          getMaintenanceOrders(admin.city),
        ]);
        setStats(s.data.data);
        setFaults(f.data.data.slice(0, 4));
        setCtrls(c.data.data.slice(0, 4));
        const orders = m.data.data;
        setMaintenance({
          open:       orders.filter(o => o.status === "Pending").length,
          inProgress: orders.filter(o => o.status === "In Progress").length,
          completed:  orders.filter(o => o.status === "Completed").length,
        });
      } catch {}
    };
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [admin]);

  const STAT_CARDS = [
    { label: "Total Lights",   value: stats?.totalLights,        icon: "💡", accentColor: "linear-gradient(90deg,#6366F1,#8B5CF6)", accentBg: "#EEF2FF", sub: "Registered",    delay: 0.04 },
    { label: "Active Lights",  value: stats?.activeLights,       icon: "✅", accentColor: "linear-gradient(90deg,#10B981,#34D399)", accentBg: "#ECFDF5", sub: "Currently ON",  delay: 0.08 },
    { label: "Faulty Lights",  value: stats?.faultyLights,       icon: "⚠️", accentColor: "linear-gradient(90deg,#EF4444,#F87171)", accentBg: "#FEF2F2", sub: "Need repair",  delay: 0.12 },
    { label: "Idle Lights",    value: stats?.idleLights,         icon: "🟡", accentColor: "linear-gradient(90deg,#F59E0B,#FBBF24)", accentBg: "#FFFBEB", sub: "No motion",     delay: 0.16 },
    { label: "Day Off",        value: stats ? (stats.dayOffLights + (stats.offlineLights || 0)) : null, icon: "📴", accentColor: "linear-gradient(90deg,#64748B,#94A3B8)", accentBg: "#F8FAFC", sub: "Off + Offline", delay: 0.20 },
    { label: "Energy Today",   value: stats ? `${stats.energyKWh} kWh` : null, icon: "⚡", accentColor: "linear-gradient(90deg,#2563EB,#60A5FA)", accentBg: "#EFF6FF", sub: "Live usage", delay: 0.24 },
  ];

  return (
    <Layout title="Dashboard Overview">

      {/* Welcome Banner */}
      <div
        className="mb-6 p-5 rounded-2xl fade-up flex items-center gap-4"
        style={{
          background: "linear-gradient(135deg, #0C1E3C 0%, #1D4ED8 100%)",
          boxShadow: "0 4px 20px rgba(37,99,235,0.25)",
        }}
      >
        <div>
          <h2 className="text-white font-bold text-lg mb-0.5" style={{ letterSpacing: "-0.01em" }}>
            Welcome back, <span style={{ color: "#93C5FD" }}>{admin?.name || "Admin"}</span> 👋
          </h2>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
            Your city infrastructure overview —{" "}
            <span className="mono font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>{admin?.city}</span>
          </p>
        </div>
        <div className="ml-auto text-4xl float-anim">🏙️</div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6 stagger-children">
        {STAT_CARDS.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Map + Fault Alerts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <div className="lg:col-span-2 fade-up" style={{ animationDelay: "0.15s" }}>
          <LiveMap city={admin?.city} height="340px" onLightClick={(l) => navigate(`/lights/${l.light_id}`)} />
        </div>

        {/* Fault Alerts */}
        <div
          className="rounded-2xl overflow-hidden slide-right"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
            animationDelay: "0.2s",
          }}
        >
          <div
            className="px-4 py-3.5 border-b flex items-center justify-between"
            style={{ borderColor: "#F1F5F9", background: "#FAFBFD" }}
          >
            <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: "#0F172A" }}>
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Fault Alerts
            </h3>
            <button
              onClick={() => navigate("/faults")}
              className="text-xs font-semibold transition-colors"
              style={{ color: "#2563EB" }}
              onMouseEnter={e => e.currentTarget.style.color = "#1D4ED8"}
              onMouseLeave={e => e.currentTarget.style.color = "#2563EB"}
            >
              View All →
            </button>
          </div>

          <div className="p-2">
            {faults.length === 0 ? (
              <div className="text-sm text-center py-10" style={{ color: "#94A3B8" }}>
                <div className="text-3xl mb-2 float-anim">✅</div>
                No active faults
              </div>
            ) : faults.map((f) => (
              <div
                key={f._id}
                className="flex items-start gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 group"
                onClick={() => navigate("/faults")}
                onMouseEnter={e => e.currentTarget.style.background = "#F5EFE4"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <span className="text-red-500 mt-0.5 flex-shrink-0">⚠️</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate mono" style={{ color: "#0F172A" }}>
                    {f.light_id} — {f.fault_type?.replace("_", " ")}
                  </div>
                  <div className="text-xs" style={{ color: "#94A3B8" }}>{f.city}</div>
                </div>
                <div className="text-xs mono whitespace-nowrap" style={{ color: "#94A3B8" }}>
                  {new Date(f.fault_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Maintenance Status */}
        <div
          className="rounded-2xl p-5 fade-up"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
            animationDelay: "0.25s",
          }}
        >
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: "#0F172A" }}>
            🔧 Maintenance Status
          </h3>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: "Open Tickets", val: maintenance.open,       bg: "#FEF2F2", border: "#FECACA", text: "#991B1B", dot: "#EF4444" },
              { label: "In Progress",  val: maintenance.inProgress, bg: "#FFFBEB", border: "#FDE68A", text: "#92400E", dot: "#F59E0B" },
              { label: "Resolved ✓",   val: maintenance.completed,  bg: "#ECFDF5", border: "#A7F3D0", text: "#065F46", dot: "#10B981" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl p-3 text-center cursor-pointer transition-all duration-200"
                style={{ background: s.bg, border: `1px solid ${s.border}` }}
                onClick={() => navigate("/maintenance")}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
                onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
              >
                <div className="text-2xl font-bold mono" style={{ color: s.text }}>{s.val}</div>
                <div className="text-xs mt-1 font-semibold" style={{ color: s.text, opacity: 0.8 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div className="text-xs uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color: "#94A3B8" }}>
            <span className="flex-1 h-px" style={{ background: "#E2E8F0" }} />
            Recent Fault Lights
            <span className="flex-1 h-px" style={{ background: "#E2E8F0" }} />
          </div>

          {faults.length === 0 ? (
            <div className="text-xs text-center py-3" style={{ color: "#94A3B8" }}>No faulty lights</div>
          ) : faults.slice(0, 3).map((f) => (
            <div
              key={f._id}
              className="flex items-center justify-between py-2 border-b text-xs cursor-pointer group transition-all duration-150"
              style={{ borderColor: "#F1F5F9" }}
              onClick={() => navigate(`/lights/${f.light_id}`)}
              onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span className="font-semibold mono" style={{ color: "#0F172A" }}>{f.light_id}</span>
              <span className="mono" style={{ color: "#94A3B8" }}>{f.controller_id}</span>
              <span style={{ color: "#94A3B8" }}>{f.city}</span>
              <span className="px-2 py-0.5 rounded-lg font-semibold" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B" }}>
                Faulty
              </span>
            </div>
          ))}
        </div>

        {/* Controller Health */}
        <div
          className="rounded-2xl p-5 fade-up"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
            animationDelay: "0.3s",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: "#0F172A" }}>
              📡 Controller Health
            </h3>
            <button
              onClick={() => navigate("/controllers")}
              className="text-xs font-semibold transition-colors"
              style={{ color: "#2563EB" }}
            >
              View All →
            </button>
          </div>

          {ctrls.length === 0 ? (
            <div className="text-sm text-center py-10" style={{ color: "#94A3B8" }}>
              <div className="text-3xl mb-2 float-anim">📡</div>
              No controllers yet
            </div>
          ) : ctrls.map((ctrl) => {
            const isOnline = ctrl.is_online;
            return (
              <div
                key={ctrl.controller_id}
                className="flex items-center justify-between py-2.5 border-b text-xs transition-all duration-150 rounded-lg px-2 -mx-2"
                style={{ borderColor: "#F1F5F9" }}
                onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <span className="mono font-bold" style={{ color: "#0F172A" }}>{ctrl.controller_id}</span>
                <span className="mono" style={{ color: "#94A3B8" }}>{ctrl.wifi_rssi} dBm</span>
                <span className="mono" style={{ color: "#94A3B8" }}>{(ctrl.free_heap / 1024).toFixed(0)} KB</span>
                <span
                  className="px-2.5 py-1 rounded-full font-semibold text-xs flex items-center gap-1.5"
                  style={{
                    background: isOnline ? "#ECFDF5" : "#F8FAFC",
                    border: `1px solid ${isOnline ? "#A7F3D0" : "#E2E8F0"}`,
                    color: isOnline ? "#065F46" : "#475569",
                  }}
                >
                  <span style={{ fontSize: "7px" }}>●</span>
                  {isOnline ? "Online" : "Offline"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;