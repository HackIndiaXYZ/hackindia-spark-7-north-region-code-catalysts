import { useEffect, useState } from "react";
import TechLayout from "../../components/Technician/TechLayout";
import { getTechProfile } from "../../services/api";

const TechProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTechProfile().then(r => setProfile(r.data.data)).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  const stats = profile?.stats || {};

  return (
    <TechLayout title="My Profile">
      <div className="max-w-2xl">
        {loading ? (
          <div className="h-64 rounded-2xl animate-pulse" style={{ background: "#E5DDD0" }}/>
        ) : (
          <>
            {/* Profile Card */}
            <div className="rounded-2xl p-6 mb-5 fade-up" style={{ background: "#FEFCF7", border: "1px solid #E5DDD0", boxShadow: "0 1px 4px rgba(100,80,50,0.08)" }}>
              <div className="flex items-center gap-5 mb-6">
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold"
                  style={{ background: "linear-gradient(135deg, #1D4ED8, #3B82F6)", boxShadow: "0 4px 15px rgba(37,99,235,0.3)" }}>
                  {profile?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <h2 className="font-bold text-2xl" style={{ color: "#0F172A", letterSpacing: "-0.02em" }}>{profile?.name}</h2>
                  <div className="mono text-sm mt-1 font-semibold" style={{ color: "#2563EB" }}>Field Technician</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`w-2 h-2 rounded-full ${profile?.is_active ? "bg-emerald-500" : "bg-red-500"}`}/>
                    <span className="text-xs" style={{ color: "#64748B" }}>{profile?.is_active ? "Active" : "Inactive"}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label:"Email",    val: profile?.email },
                  { label:"Phone",    val: profile?.phone || "Not set" },
                  { label:"City",     val: profile?.city },
                  { label:"Joined",   val: new Date(profile?.createdAt).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) },
                ].map((r) => (
                  <div key={r.label} className="rounded-lg p-3" style={{ background: "#F8F3E8", border: "1px solid #E5DDD0" }}>
                    <div className="text-xs uppercase tracking-wider mb-1 font-bold" style={{ color: "#64748B" }}>{r.label}</div>
                    <div className="font-bold mono text-sm" style={{ color: "#0F172A" }}>{r.val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 fade-up" style={{ animationDelay:"0.1s" }}>
              {[
                { label:"Active Tasks",     val: stats.assigned,    icon:"📋", color:"linear-gradient(135deg,#1D4ED8,#3B82F6)", shadow:"rgba(37,99,235,0.25)" },
                { label:"Completed Repairs",val: stats.completed,   icon:"✅", color:"linear-gradient(135deg,#059669,#10B981)", shadow:"rgba(16,185,129,0.25)" },
                { label:"Total Handled",    val: stats.totalHandled,icon:"🔧", color:"linear-gradient(135deg,#6D28D9,#8B5CF6)", shadow:"rgba(139,92,246,0.28)" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl p-5 text-center card-hover"
                  style={{ background: s.color, boxShadow: `0 6px 20px ${s.shadow}` }}>
                  <div className="text-3xl mb-1">{s.icon}</div>
                  <div className="text-3xl font-bold text-white mono">{s.val ?? 0}</div>
                  <div className="text-white/80 text-xs mt-1 font-semibold">{s.label}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </TechLayout>
  );
};

export default TechProfile;
