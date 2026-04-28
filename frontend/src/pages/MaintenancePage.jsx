import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Sidebar/Layout";
import { getMaintenanceOrders } from "../services/api";

const FAULT_LABELS = {
  BULB_FUSE: "💡 Lamp Failure",
  WIRE_CUT: "✂️ Wire Cut",
  LOW_CURRENT: "⚡ Power Issue",
  UNKNOWN: "❓ Unknown",
};

const STATUS_STYLE = {
  "Pending":     { bg: "#FFFBEB", border: "#FDE68A", color: "#92400E", dot: "#F59E0B" },
  "In Progress": { bg: "#EFF6FF", border: "#BFDBFE", color: "#1E40AF", dot: "#3B82F6" },
  "Completed":   { bg: "#ECFDF5", border: "#A7F3D0", color: "#065F46", dot: "#10B981" },
  "Cancelled":   { bg: "#F8FAFC", border: "#E2E8F0", color: "#475569", dot: "#94A3B8" },
};

const PRIORITY_STYLE = {
  High:   { bg: "#FEF2F2", border: "#FECACA", color: "#991B1B" },
  Medium: { bg: "#FFFBEB", border: "#FDE68A", color: "#92400E" },
  Low:    { bg: "#F0FDF4", border: "#BBF7D0", color: "#166534" },
};

const MaintenancePage = () => {
  const navigate = useNavigate();
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const admin = JSON.parse(localStorage.getItem("admin") || "{}");

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await getMaintenanceOrders(admin.city);
        setOrders(data.data);
      } catch {}
      finally { setLoading(false); }
    };
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  const counts = {
    open:       orders.filter(o => o.status === "Pending").length,
    inProgress: orders.filter(o => o.status === "In Progress").length,
    completed:  orders.filter(o => o.status === "Completed").length,
  };

  const SUMMARY = [
    { label: "Open Tickets", val: counts.open,       icon: "📋", color: "linear-gradient(135deg,#B91C1C,#EF4444)", shadow: "rgba(239,68,68,0.28)" },
    { label: "In Progress",  val: counts.inProgress, icon: "⏳", color: "linear-gradient(135deg,#B45309,#F59E0B)", shadow: "rgba(245,158,11,0.28)" },
    { label: "Resolved ✓",   val: counts.completed,  icon: "✅", color: "linear-gradient(135deg,#057A50,#10B981)", shadow: "rgba(16,185,129,0.28)" },
  ];

  return (
    <Layout title="Maintenance Management">

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6 stagger-children">
        {SUMMARY.map((s, idx) => (
          <div
            key={s.label}
            className="rounded-2xl p-6 text-center fade-up card-hover"
            style={{
              background: s.color,
              boxShadow: `0 6px 24px ${s.shadow}, inset 0 1px 0 rgba(255,255,255,0.18)`,
              border: "1px solid rgba(255,255,255,0.2)",
              animationDelay: `${idx * 0.08}s`,
            }}
          >
            <div className="text-2xl mb-2 float-anim" style={{ animationDelay: `${idx * 0.3}s` }}>{s.icon}</div>
            <div className="text-4xl font-bold text-white mono">{s.val}</div>
            <div className="text-white/70 text-sm font-semibold mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Work Orders Table */}
      <div
        className="rounded-2xl overflow-hidden fade-up"
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
          animationDelay: "0.2s",
        }}
      >
        <div
          className="px-5 py-4 border-b flex items-center justify-between"
          style={{ borderColor: "#F1F5F9", background: "#FAFBFD" }}
        >
          <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: "#0F172A" }}>
            🔧 Work Orders
          </h3>
          <span
            className="text-xs mono px-2.5 py-1 rounded-lg font-medium"
            style={{ background: "#F0F4F8", color: "#64748B", border: "1px solid #E2E8F0" }}
          >
            {orders.length} total
          </span>
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-14 rounded-xl"
                style={{
                  background: "linear-gradient(90deg,#F1F5F9,#E2E8F0,#F1F5F9)",
                  backgroundSize: "200% 100%",
                  animation: `shimmer 1.5s ease infinite`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-14 text-center text-sm" style={{ color: "#94A3B8" }}>
            <div className="text-3xl mb-2 float-anim">🔧</div>
            No work orders found — they will be automatically created when faults are detected
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr
                className="text-xs uppercase border-b"
                style={{ borderColor: "#F1F5F9", background: "#FAFBFD", color: "#94A3B8", letterSpacing: "0.06em" }}
              >
                {["Light ID","Fault Type","Location","Priority","Assigned To","Status","Detected"].map(h => (
                  <th key={h} className="text-left px-4 py-3.5 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const ss = STATUS_STYLE[o.status]   || STATUS_STYLE["Cancelled"];
                const ps = PRIORITY_STYLE[o.priority] || PRIORITY_STYLE.Low;
                return (
                  <tr
                    key={o._id}
                    className="border-b cursor-pointer group"
                    style={{ borderColor: "#F1F5F9" }}
                    onClick={() => navigate("/faults")}
                  >
                    <td className="px-4 py-3.5 font-bold mono" style={{ color: "#0F172A" }}>
                      <span className="group-hover:text-blue-600 transition-colors">{o.light_id}</span>
                    </td>
                    <td className="px-4 py-3.5 text-xs" style={{ color: "#64748B" }}>{FAULT_LABELS[o.fault_type] || o.fault_type}</td>
                    <td className="px-4 py-3.5 text-xs" style={{ color: "#94A3B8" }}>{o.location?.address || o.city}</td>
                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: ps.bg, border: `1px solid ${ps.border}`, color: ps.color }}>
                        {o.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {o.technician
                        ? <span className="mono text-xs font-semibold" style={{ color: "#2563EB" }}>👤 {o.technician}</span>
                        : <span className="text-xs" style={{ color: "#94A3B8" }}>Unassigned</span>
                      }
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: ss.bg, border: `1px solid ${ss.border}`, color: ss.color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: ss.dot }} />
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs mono" style={{ color: "#94A3B8" }}>
                      {new Date(o.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
};

export default MaintenancePage;