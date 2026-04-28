import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Sidebar/Layout";
import { getActiveFaults, getAllFaults, assignFaultToTechnician, cancelFaultAssignment, getTechniciansForAssign } from "../services/api";

const FAULT_LABELS = {
  BULB_FUSE:   "💡 Lamp Failure",
  WIRE_CUT:    "✂️ Wire Cut",
  LOW_CURRENT: "⚡ Power Issue",
  UNKNOWN:     "❓ Unknown",
};

const C = {
  card:        "#FEFCF7",
  border:      "#E5DDD0",
  borderLight: "#EDE8DC",
  bg:          "#EEE8DC",
  bgHover:     "#F5EFE4",
  bgSection:   "#F8F3E8",
  text:        "#0F172A",
  textSub:     "#475569",
  textMuted:   "#94A3B8",
  blue:        "#2563EB",
  blueLight:   "#EFF6FF",
  blueBorder:  "#BFDBFE",
};

const FaultsPage = () => {
  const navigate   = useNavigate();
  const [active,    setActive]    = useState([]);
  const [allF,      setAllF]      = useState([]);
  const [techs,     setTechs]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [assigning, setAssigning] = useState(null);
  const [selected,  setSelected]  = useState(null);
  const [selTech,   setSelTech]   = useState({ id: "", name: "" });
  const [toast,     setToast]     = useState("");
  const admin = JSON.parse(localStorage.getItem("admin") || "{}");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = async () => {
    try {
      const [a, all, t] = await Promise.all([
        getActiveFaults(admin.city),
        getAllFaults(admin.city),
        getTechniciansForAssign(),
      ]);
      setActive(a.data.data);
      setAllF(all.data.data);
      setTechs(t.data.data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, []);

  const handleSelect = (f) => {
    setSelected(f);
    // assigned_to is stored as a plain string name on the fault object
    setSelTech({ id: "", name: typeof f.assigned_to === "string" ? f.assigned_to : "" });
  };

  const handleAssign = async () => {
    if (!selTech.name || !selected) return;
    setAssigning(selected._id);
    try {
      await assignFaultToTechnician(selected._id, { technician_name: selTech.name, technician_id: selTech.id });
      await load();
      // Store assigned_to as a plain string (name) to match how JSX renders it
      setSelected(prev => ({ ...prev, assigned_to: selTech.name, repair_status: "In Progress" }));
      showToast(`✅ Fault assigned to ${selTech.name}!`);
    } catch {}
    finally { setAssigning(null); }
  };

  const handleCancel = async () => {
    if (!selected) return;
    setAssigning(selected._id);
    try {
      await cancelFaultAssignment(selected._id);
      await load();
      setSelected(prev => ({ ...prev, assigned_to: null, assigned_to_id: null, repair_status: "Pending" }));
      setSelTech({ id: "", name: "" });
      showToast("❌ Assignment cancelled — fault is now unassigned");
    } catch {}
    finally { setAssigning(null); }
  };

  const resolved   = allF.filter(f => f.resolved).length;
  const inProgress = allF.filter(f => !f.resolved && f.assigned_to).length;

  const SUMMARY = [
    { label: "Active Faults", val: active.length, color: "linear-gradient(135deg,#B91C1C,#EF4444)", shadow: "rgba(239,68,68,0.28)", icon: "🔴" },
    { label: "In Progress",   val: inProgress,    color: "linear-gradient(135deg,#B45309,#F59E0B)", shadow: "rgba(245,158,11,0.28)", icon: "⏳" },
    { label: "Resolved",      val: resolved,      color: "linear-gradient(135deg,#057A50,#10B981)", shadow: "rgba(16,185,129,0.28)", icon: "✅" },
  ];

  return (
    <Layout title="Fault Alerts">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl text-white text-sm font-bold shadow-xl scale-in"
          style={{ background: "linear-gradient(135deg,#057A50,#10B981)", border: "1px solid rgba(16,185,129,0.4)", boxShadow: "0 8px 32px rgba(16,185,129,0.3)" }}
        >
          {toast}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {SUMMARY.map((s, idx) => (
          <div
            key={s.label}
            className="rounded-2xl p-6 text-center card-hover fade-up"
            style={{ background: s.color, boxShadow: `0 6px 24px ${s.shadow}, inset 0 1px 0 rgba(255,255,255,0.18)`, border: "1px solid rgba(255,255,255,0.2)", animationDelay: `${idx * 0.08}s` }}
          >
            <div className="text-2xl mb-2 float-anim" style={{ animationDelay: `${idx * 0.3}s` }}>{s.icon}</div>
            <div className="text-4xl font-bold text-white mono">{s.val}</div>
            <div className="text-white/70 text-sm font-semibold mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Alert List + Work Status */}
        <div className="lg:col-span-1 space-y-4">
          {/* Fault List Card */}
          <div className="rounded-2xl overflow-hidden slide-left" style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(100,80,50,0.07)" }}>
            <div className="px-4 py-3.5 border-b flex items-center gap-2" style={{ borderColor: C.borderLight, background: C.bgSection }}>
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <h3 className="font-bold text-sm" style={{ color: C.text }}>Active Faults</h3>
              <span className="ml-auto text-xs mono px-2.5 py-0.5 rounded-full" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B" }}>{active.length}</span>
            </div>

            {loading ? (
              <div className="p-3 space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 rounded-xl" style={{ background: `linear-gradient(90deg,${C.bgSection},${C.bgHover},${C.bgSection})`, backgroundSize: "200% 100%", animation: "shimmer 1.5s ease infinite" }} />
                ))}
              </div>
            ) : active.length === 0 ? (
              <div className="p-10 text-center">
                <div className="text-3xl mb-2 float-anim">✅</div>
                <p className="text-sm" style={{ color: C.textMuted }}>No active faults!</p>
              </div>
            ) : active.map((f) => (
              <div
                key={f._id}
                onClick={() => handleSelect(f)}
                role="button"
                className="flex items-start gap-3 p-4 border-b cursor-pointer transition-all duration-200"
                style={{
                  borderColor: C.borderLight,
                  background: selected?._id === f._id ? C.blueLight : "transparent",
                }}
                onMouseEnter={e => { if (selected?._id !== f._id) e.currentTarget.style.background = C.bgHover; }}
                onMouseLeave={e => { e.currentTarget.style.background = selected?._id === f._id ? C.blueLight : "transparent"; }}
              >
                <span className="text-lg mt-0.5">{f.assigned_to ? "🟡" : "🔴"}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold mono" style={{ color: C.text }}>{f.light_id}</div>
                  <div className="text-xs" style={{ color: C.textSub }}>{FAULT_LABELS[f.fault_type]}</div>
                  {f.assigned_to
                    ? <div className="text-xs mono font-semibold" style={{ color: "#B45309" }}>→ {f.assigned_to}</div>
                    : <div className="text-xs font-semibold" style={{ color: "#DC2626" }}>Unassigned</div>
                  }
                </div>
                <div className="text-xs mono" style={{ color: C.textMuted, whiteSpace: "nowrap" }}>
                  {new Date(f.fault_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
          </div>

          {/* Work Status */}
          <div className="rounded-2xl p-4 fade-up" style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(100,80,50,0.07)", animationDelay: "0.2s" }}>
            <h4 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: C.text }}>
              📊 Work Status
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Pending",     count: active.filter(f => !f.assigned_to).length, bg: "#F8FAFC", border: "#E5DDD0", color: "#475569" },
                { label: "In Progress", count: inProgress,                                bg: "#FFFBEB", border: "#FDE68A", color: "#92400E" },
                { label: "Completed",   count: resolved,                                  bg: "#ECFDF5", border: "#A7F3D0", color: "#065F46" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl py-3 text-center text-xs font-bold transition-all duration-200"
                  style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
                  onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
                >
                  <div className="text-xl font-bold mono">{s.count}</div>
                  <div className="opacity-80 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Fault Detail */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div
              className="rounded-2xl h-full flex items-center justify-center"
              style={{ background: C.card, border: `1px solid ${C.border}`, minHeight: "300px", boxShadow: "0 1px 4px rgba(100,80,50,0.07)" }}
            >
              <div className="text-center" style={{ color: C.textMuted }}>
                <div className="text-5xl mb-3 float-anim">⚠️</div>
                <p className="text-sm">Kisi fault par click karo</p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl p-6 scale-in" style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(100,80,50,0.07)" }}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-lg flex items-center gap-2" style={{ color: C.text }}>
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Fault Details
                </h3>
                <button
                  onClick={() => setSelected(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-200"
                  style={{ color: C.textSub, background: "transparent" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#FEF2F2"; e.currentTarget.style.color = "#DC2626"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.textSub; }}
                >
                  ✕
                </button>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  { label: "Fault ID",   val: `Fault-${selected._id.slice(-6).toUpperCase()}` },
                  { label: "Light ID",   val: selected.light_id },
                  { label: "Issue",      val: FAULT_LABELS[selected.fault_type] || selected.fault_type },
                  { label: "Controller", val: selected.controller_id },
                  { label: "Detected",   val: new Date(selected.fault_time).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }) },
                  { label: "Location",   val: selected.location?.address || selected.city },
                  { label: "Current",    val: `${selected.current_at_fault} A` },
                  { label: "Status",     val: selected.repair_status || "Pending" },
                ].map((r, idx) => (
                  <div
                    key={r.label}
                    className="rounded-xl p-3 fade-up"
                    style={{ background: C.bgSection, border: `1px solid ${C.borderLight}`, animationDelay: `${idx * 0.04}s` }}
                  >
                    <div className="text-xs mb-1" style={{ color: C.textMuted }}>{r.label}</div>
                    <div className="font-bold mono text-sm" style={{ color: C.text }}>{r.val}</div>
                  </div>
                ))}
              </div>

              {/* Assign to Technician */}
              {!selected.resolved && (
                <div
                  className="mb-4 p-4 rounded-2xl fade-up"
                  style={{ background: C.bgSection, border: `1px solid ${C.borderLight}`, animationDelay: "0.28s" }}
                >
                  <h4 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: C.text }}>
                    🔧 Assign to Technician
                  </h4>
                  {techs.length === 0 ? (
                    <div className="text-xs py-2" style={{ color: C.textMuted }}>
                      No active technicians found — please add them from the Reports page
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <select
                        value={selTech.id}
                        onChange={e => {
                          const found = techs.find(t => t._id === e.target.value);
                          setSelTech({ id: e.target.value, name: found?.name || "" });
                        }}
                        className="flex-1 rounded-xl px-3 py-2.5 text-sm transition-all duration-200"
                        style={{ background: "#FEFCF7", border: `1px solid ${C.border}`, color: C.text, outline: "none" }}
                        onFocus={e => { e.target.style.borderColor = "rgba(37,99,235,0.4)"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)"; }}
                        onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; }}
                      >
                        <option value="">-- Technician select karo --</option>
                        {techs.map(t => (
                          <option key={t._id} value={t._id}>{t.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={handleAssign}
                        disabled={!selTech.name || assigning === selected._id}
                        className="px-5 py-2.5 text-white rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 btn-ripple"
                        style={{ background: "linear-gradient(135deg,#1D4ED8,#2563EB)", boxShadow: "0 3px 12px rgba(37,99,235,0.3)" }}
                      >
                        {assigning === selected._id ? (
                          <span className="flex items-center gap-2">
                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Assigning...
                          </span>
                        ) : "Assign →"}
                      </button>
                    </div>
                  )}
                  {selected.assigned_to && (
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-xs mono font-semibold" style={{ color: "#B45309" }}>
                        ✓ Currently assigned to: <strong>{selTech.name || selected.assigned_to}</strong>
                      </div>
                      <button
                        onClick={handleCancel}
                        disabled={assigning === selected._id}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 disabled:opacity-50"
                        style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#FEE2E2"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "#FEF2F2"; }}
                      >
                        {assigning === selected._id ? "Cancelling..." : "❌ Cancel Assignment"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => navigate(`/lights/${selected.light_id}`)}
                  className="flex-1 py-2.5 text-white rounded-xl text-sm font-semibold transition-all duration-200 btn-ripple"
                  style={{ background: "linear-gradient(135deg,#1D4ED8,#2563EB)", boxShadow: "0 3px 12px rgba(37,99,235,0.25)" }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = "0 6px 20px rgba(37,99,235,0.4)"}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = "0 3px 12px rgba(37,99,235,0.25)"}
                >
                  View Light →
                </button>
                {selected.resolved ? (
                  <div className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-center flex items-center justify-center gap-2"
                    style={{ background: "#ECFDF5", color: "#065F46", border: "1px solid #A7F3D0" }}>
                    ✅ Resolved by Technician
                  </div>
                ) : selected.assigned_to ? (
                  <div className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-center flex items-center justify-center gap-2"
                    style={{ background: "#FFFBEB", color: "#92400E", border: "1px solid #FDE68A" }}>
                    ⏳ Waiting for {selected.assigned_to}
                  </div>
                ) : (
                  <div className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-center flex items-center justify-center gap-2"
                    style={{ background: "#FEF2F2", color: "#991B1B", border: "1px solid #FECACA" }}>
                    🔴 Assign to resolve
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default FaultsPage;
