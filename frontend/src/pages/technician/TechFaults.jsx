import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TechLayout from "../../components/Technician/TechLayout";
import { getTechFaults } from "../../services/api";

const FAULT_LABELS = { BULB_FUSE:"💡 Lamp Failure", WIRE_CUT:"✂️ Wire Cut", LOW_CURRENT:"⚡ Power Issue", UNKNOWN:"❓ Unknown" };
const STATUS_CLS   = { "Pending":"badge-idle", "In Progress":"badge-active", "Resolved":"badge-ok" };

const TechFaults = () => {
  const navigate = useNavigate();
  const [data,    setData]    = useState(null);
  const [tab,     setTab]     = useState("assigned"); // assigned | unassigned | urgent
  const [loading, setLoading] = useState(true);
  const tech = JSON.parse(localStorage.getItem("admin") || "{}");

  useEffect(() => {
    const load = async () => {
      try { const r = await getTechFaults(); setData(r.data.data); }
      catch {} finally { setLoading(false); }
    };
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  const lists = {
    assigned:   data?.assigned   || [],
    unassigned: data?.unassigned || [],
    urgent:     data?.urgent     || [],
  };
  const current = lists[tab] || [];

  return (
    <TechLayout title="Assigned Faults">
      {/* Tabs */}
      <div className="flex gap-3 mb-5">
        {[
          { key:"assigned",   label:`My Faults (${lists.assigned.length})`,      activeBg:"#EFF6FF", activeText:"#2563EB", activeBorder:"#BFDBFE" },
          { key:"unassigned", label:`Unassigned (${lists.unassigned.length})`,   activeBg:"#F8FAFC", activeText:"#475569", activeBorder:"#E2E8F0" },
          { key:"urgent",     label:`🚨 Urgent (${lists.urgent.length})`,        activeBg:"#FEF2F2", activeText:"#DC2626", activeBorder:"#FECACA" },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-2 rounded-lg text-xs font-bold border transition-colors"
            style={{
              background: tab === t.key ? t.activeBg : "#FEFCF7",
              color: tab === t.key ? t.activeText : "#64748B",
              borderColor: tab === t.key ? t.activeBorder : "#E5DDD0"
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#FEFCF7", border: "1px solid #E5DDD0", boxShadow: "0 1px 4px rgba(100,80,50,0.08)" }}>
        <table className="w-full text-sm">
          <thead style={{ background: "#F8F3E8" }}>
            <tr className="text-xs mono uppercase border-b" style={{ color: "#475569", borderColor: "#E5DDD0" }}>
              <th className="text-left p-4">Light ID</th>
              <th className="text-left p-4">Location</th>
              <th className="text-left p-4">Fault Type</th>
              <th className="text-left p-4">Assigned By</th>
              <th className="text-left p-4">Status</th>
              <th className="text-left p-4">Detected</th>
              <th className="text-left p-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(4)].map((_,i) => (
                <tr key={i} className="border-b animate-pulse" style={{ borderColor: "#E5DDD0" }}>
                  {[...Array(7)].map((_,j) => <td key={j} className="p-4"><div className="h-4 rounded w-20" style={{ background: "#E5DDD0" }}/></td>)}
                </tr>
              ))
            ) : current.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12" style={{ color: "#94A3B8" }}>
                {tab === "assigned" ? "No faults assigned to you" : tab === "unassigned" ? "No unassigned faults available" : "No urgent faults found"}
              </td></tr>
            ) : current.map((f) => (
              <tr key={f._id} className="border-b transition-colors" style={{ borderColor: "#E5DDD0" }}
                onMouseEnter={e => e.currentTarget.style.background = "#F5EFE4"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td className="p-4 font-bold mono" style={{ color: "#0F172A" }}>{f.light_id}</td>
                <td className="p-4 text-xs" style={{ color: "#475569" }}>{f.location?.address || f.city}</td>
                <td className="p-4">
                  <span style={{ color: "#0F172A" }}>{FAULT_LABELS[f.fault_type] || f.fault_type}</span>
                </td>
                <td className="p-4 text-xs" style={{ color: "#64748B" }}>{f.assigned_to ? "Admin" : "—"}</td>
                <td className="p-4">
                  <span className="px-2 py-1 rounded text-xs font-bold" style={{
                    background: f.repair_status === "In Progress" ? "#FFFBEB" : (f.repair_status === "Resolved" ? "#ECFDF5" : "#F8FAFC"),
                    color: f.repair_status === "In Progress" ? "#92400E" : (f.repair_status === "Resolved" ? "#065F46" : "#475569"),
                    border: `1px solid ${f.repair_status === "In Progress" ? "#FDE68A" : (f.repair_status === "Resolved" ? "#A7F3D0" : "#E2E8F0")}`
                  }}>
                    {f.repair_status || "Pending"}
                  </span>
                </td>
                <td className="p-4 mono text-xs" style={{ color: "#64748B" }}>
                  {new Date(f.fault_time).toLocaleString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}
                </td>
                <td className="p-4">
                  <button onClick={() => navigate(`/tech/faults/${f._id}`)}
                    className="px-3 py-1.5 text-white rounded text-xs font-bold transition-colors btn-ripple"
                    style={{ background: "linear-gradient(135deg,#1D4ED8,#3B82F6)", boxShadow: "0 2px 8px rgba(37,99,235,0.25)" }}>
                    View →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TechLayout>
  );
};

export default TechFaults;
