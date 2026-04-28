import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TechLayout from "../../components/Technician/TechLayout";
import { getTechFaults, getTechNotifications } from "../../services/api";

const FAULT_LABELS = { BULB_FUSE:"💡 Lamp Failure", WIRE_CUT:"✂️ Wire Cut", LOW_CURRENT:"⚡ Power Issue", UNKNOWN:"❓ Unknown" };

const TechDashboard = () => {
  const navigate = useNavigate();
  const [data,    setData]    = useState(null);
  const [notifs,  setNotifs]  = useState([]);
  const [loading, setLoading] = useState(true);
  const tech = JSON.parse(localStorage.getItem("admin") || "{}");

  useEffect(() => {
    const load = async () => {
      try {
        const [f, n] = await Promise.all([getTechFaults(), getTechNotifications()]);
        setData(f.data.data);
        setNotifs(n.data.data.slice(0, 4));
      } catch {}
      finally { setLoading(false); }
    };
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const stats = data?.stats || {};

  return (
    <TechLayout title="Technician Dashboard">
      {/* Welcome */}
      <div className="mb-6 p-4 rounded-xl" style={{ background: "#FEFCF7", border: "1px solid #E5DDD0", boxShadow: "0 1px 4px rgba(100,80,50,0.08)" }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold"
            style={{ background: "linear-gradient(135deg, #1D4ED8, #3B82F6)" }}>
            {tech?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-lg" style={{ color: "#0F172A" }}>Welcome, {tech?.name}! </div>
            <div className="text-sm" style={{ color: "#475569" }}>City: <span className="mono" style={{ color: "#2563EB" }}>{tech?.city}</span> — Field Technician</div>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label:"Assigned Tasks",     val: loading ? "..." : stats.assigned  || 0, icon:"📋", color:"linear-gradient(135deg,#1D4ED8,#3B82F6)", shadow:"rgba(37,99,235,0.25)", path:"/tech/faults" },
          { label:"Pending Repairs",    val: loading ? "..." : stats.pending   || 0, icon:"⏳", color:"linear-gradient(135deg,#B45309,#F59E0B)", shadow:"rgba(245,158,11,0.28)", path:"/tech/faults" },
          { label:"In Progress",        val: loading ? "..." : stats.inProgress|| 0, icon:"🔧", color:"linear-gradient(135deg,#6D28D9,#8B5CF6)", shadow:"rgba(139,92,246,0.28)", path:"/tech/faults" },
          { label:"High Priority",      val: loading ? "..." : stats.urgent    || 0, icon:"🚨", color:"linear-gradient(135deg,#B91C1C,#EF4444)", shadow:"rgba(239,68,68,0.28)", path:"/tech/faults" },
        ].map((s) => (
          <div key={s.label} onClick={() => navigate(s.path)}
            className="rounded-xl p-5 fade-up card-hover cursor-pointer"
            style={{ background: s.color, boxShadow: `0 6px 20px ${s.shadow}` }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/80 text-sm font-semibold">{s.label}</span>
              <span className="text-2xl">{s.icon}</span>
            </div>
            <div className="text-4xl font-bold text-white mono">{s.val}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assigned Faults */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "#FEFCF7", border: "1px solid #E5DDD0", boxShadow: "0 1px 4px rgba(100,80,50,0.08)" }}>
          <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#E5DDD0", background: "#F8F3E8" }}>
            <h3 className="font-bold text-sm" style={{ color: "#0F172A" }}>My Assigned Faults</h3>
            <button onClick={() => navigate("/tech/faults")} className="text-xs hover:underline font-semibold" style={{ color: "#2563EB" }}>View All</button>
          </div>
          {loading ? (
            [...Array(3)].map((_,i) => <div key={i} className="h-14 m-3 rounded animate-pulse" style={{ background: "#E5DDD0" }}/>)
          ) : (data?.assigned || []).length === 0 ? (
            <div className="p-8 text-center text-sm" style={{ color: "#94A3B8" }}>
              <div className="text-3xl mb-2">✅</div>No assigned faults
            </div>
          ) : (data.assigned || []).slice(0, 4).map((f) => (
            <div key={f._id} onClick={() => navigate(`/tech/faults/${f._id}`)} role="button"
              className="flex items-center gap-3 px-5 py-3 border-b cursor-pointer transition-colors"
              style={{ borderColor: "#EDE8DC" }}
              onMouseEnter={e => e.currentTarget.style.background = "#F5EFE4"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span className="text-lg">🔴</span>
              <div className="flex-1 min-w-0">
                <div className="font-bold mono text-sm" style={{ color: "#0F172A" }}>{f.light_id}</div>
                <div className="text-xs" style={{ color: "#475569" }}>{FAULT_LABELS[f.fault_type]} — {f.location?.address || f.city}</div>
              </div>
              <span className="px-2 py-1 rounded text-xs font-bold" style={{
                background: f.repair_status === "In Progress" ? "#FFFBEB" : "#F8FAFC",
                color: f.repair_status === "In Progress" ? "#92400E" : "#475569",
                border: `1px solid ${f.repair_status === "In Progress" ? "#FDE68A" : "#E2E8F0"}`
              }}>
                {f.repair_status || "Pending"}
              </span>
            </div>
          ))}
        </div>

        {/* Notifications */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "#FEFCF7", border: "1px solid #E5DDD0", boxShadow: "0 1px 4px rgba(100,80,50,0.08)" }}>
          <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#E5DDD0", background: "#F8F3E8" }}>
            <h3 className="font-bold text-sm" style={{ color: "#0F172A" }}>🔔 Notifications</h3>
            <button onClick={() => navigate("/tech/notifications")} className="text-xs hover:underline font-semibold" style={{ color: "#2563EB" }}>View All</button>
          </div>
          {notifs.length === 0 ? (
            <div className="p-8 text-center text-sm" style={{ color: "#94A3B8" }}>No notifications</div>
          ) : notifs.map((n, i) => (
            <div key={i} onClick={() => navigate(`/tech/faults`)}
              className="flex items-start gap-3 px-5 py-3 border-b cursor-pointer transition-colors"
              style={{ borderColor: "#EDE8DC" }}
              onMouseEnter={e => e.currentTarget.style.background = "#F5EFE4"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span className="mt-0.5 text-sm">
                {n.priority==="High" ? "🚨" : "🔔"}
              </span>
              <div className="flex-1">
                <div className="text-sm font-semibold" style={{ color: "#0F172A" }}>{n.title}</div>
                <div className="text-xs" style={{ color: "#475569" }}>{n.message}</div>
                <div className="text-xs mono" style={{ color: "#94A3B8" }}>{n.location}</div>
              </div>
              {n.priority === "High" && (
                <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: "#FEF2F2", color: "#991B1B", border: "1px solid #FECACA" }}>Urgent</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </TechLayout>
  );
};

export default TechDashboard;
