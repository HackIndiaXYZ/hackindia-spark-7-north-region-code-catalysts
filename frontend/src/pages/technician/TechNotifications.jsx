import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TechLayout from "../../components/Technician/TechLayout";
import { getTechNotifications } from "../../services/api";

const TechNotifications = () => {
  const navigate = useNavigate();
  const [notifs,  setNotifs]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try { const r = await getTechNotifications(); setNotifs(r.data.data); }
      catch {} finally { setLoading(false); }
    };
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <TechLayout title="Notifications">
      <div className="max-w-2xl">
        <div className="rounded-2xl overflow-hidden" style={{ background: "#FEFCF7", border: "1px solid #E5DDD0", boxShadow: "0 1px 4px rgba(100,80,50,0.08)" }}>
          <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#E5DDD0", background: "#F8F3E8" }}>
            <h3 className="font-bold text-sm" style={{ color: "#0F172A" }}>🔔 Recent Notifications (Last 24 hrs)</h3>
            <span className="text-xs mono" style={{ color: "#64748B" }}>{notifs.length} alerts</span>
          </div>

          {loading ? (
            [...Array(4)].map((_,i) => <div key={i} className="h-16 m-4 rounded animate-pulse" style={{ background: "#E5DDD0" }}/>)
          ) : notifs.length === 0 ? (
            <div className="p-12 text-center" style={{ color: "#94A3B8" }}>
              <div className="text-4xl mb-3">🔔</div>
              <p className="text-sm">No new notifications — you're all caught up!</p>
            </div>
          ) : notifs.map((n, i) => (
            <div key={i} onClick={() => navigate("/tech/faults")}
              className="flex items-start gap-4 px-5 py-4 border-b cursor-pointer transition-colors"
              style={{ borderColor: "#EDE8DC" }}
              onMouseEnter={e => e.currentTarget.style.background = "#F5EFE4"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xl"
                style={{ background: n.priority === "High" ? "#FEF2F2" : "#FFFBEB", color: n.priority === "High" ? "#DC2626" : "#D97706" }}>
                {n.priority === "High" ? "🚨" : "🔔"}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-sm" style={{ color: "#0F172A" }}>{n.title}</span>
                  {n.priority === "High" && <span className="px-1.5 py-0.5 rounded text-xs font-bold" style={{ background: "#FEF2F2", color: "#991B1B", border: "1px solid #FECACA" }}>High Priority</span>}
                </div>
                <div className="text-sm" style={{ color: "#475569" }}>{n.message}</div>
                <div className="text-xs mt-1" style={{ color: "#64748B" }}>📍 {n.location}</div>
              </div>
              <div className="text-xs mono whitespace-nowrap" style={{ color: "#94A3B8" }}>
                {new Date(n.time).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}
              </div>
            </div>
          ))}
        </div>
      </div>
    </TechLayout>
  );
};

export default TechNotifications;
