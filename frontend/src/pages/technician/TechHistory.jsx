import { useEffect, useState } from "react";
import TechLayout from "../../components/Technician/TechLayout";
import { getTechHistory } from "../../services/api";

const FAULT_LABELS = { BULB_FUSE:"💡 Lamp Failure", WIRE_CUT:"✂️ Wire Cut", LOW_CURRENT:"⚡ Power Issue", UNKNOWN:"❓ Unknown" };

const TechHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTechHistory().then(r => setHistory(r.data.data)).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  return (
    <TechLayout title="Repair History">
      <div className="rounded-2xl overflow-hidden" style={{ background: "#FEFCF7", border: "1px solid #E5DDD0", boxShadow: "0 1px 4px rgba(100,80,50,0.08)" }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: "#E5DDD0", background: "#F8F3E8" }}>
          <h3 className="font-bold text-sm" style={{ color: "#0F172A" }}>My Completed Repairs ({history.length})</h3>
        </div>
        <table className="w-full text-sm">
          <thead style={{ background: "#FEFCF7" }}>
            <tr className="text-xs mono uppercase border-b" style={{ color: "#475569", borderColor: "#E5DDD0" }}>
              <th className="text-left p-4">Light ID</th>
              <th className="text-left p-4">Fault Type</th>
              <th className="text-left p-4">Location</th>
              <th className="text-left p-4">Resolved On</th>
              <th className="text-left p-4">Parts Used</th>
              <th className="text-left p-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(4)].map((_,i) => (
                <tr key={i} className="border-b animate-pulse" style={{ borderColor: "#E5DDD0" }}>
                  {[...Array(6)].map((_,j)=><td key={j} className="p-4"><div className="h-4 rounded w-20" style={{ background: "#E5DDD0" }}/></td>)}
                </tr>
              ))
            ) : history.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12" style={{ color: "#94A3B8" }}>
                <div className="text-3xl mb-2">📋</div>
                No completed repairs yet
              </td></tr>
            ) : history.map((f) => (
              <tr key={f._id} className="border-b transition-colors" style={{ borderColor: "#E5DDD0" }}
                onMouseEnter={e => e.currentTarget.style.background = "#F5EFE4"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td className="p-4 font-bold mono" style={{ color: "#0F172A" }}>{f.light_id}</td>
                <td className="p-4" style={{ color: "#475569" }}>{FAULT_LABELS[f.fault_type]}</td>
                <td className="p-4 text-xs" style={{ color: "#64748B" }}>{f.location?.address || f.city}</td>
                <td className="p-4 mono text-xs" style={{ color: "#64748B" }}>
                  {f.resolved_at ? new Date(f.resolved_at).toLocaleString("en-IN",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}) : "—"}
                </td>
                <td className="p-4 text-xs" style={{ color: "#64748B" }}>{f.parts_used || "—"}</td>
                <td className="p-4"><span className="px-2 py-1 rounded text-xs font-bold" style={{ background: "#ECFDF5", color: "#065F46", border: "1px solid #A7F3D0" }}>✓ Resolved</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TechLayout>
  );
};

export default TechHistory;
