import { useEffect, useState } from "react";
import Layout from "../components/Sidebar/Layout";
import { getControllerHealth } from "../services/api";

const C = {
  card: "#FEFCF7", border: "#E5DDD0", borderLight: "#EDE8DC",
  bg: "#EEE8DC", bgHover: "#F5EFE4", bgSection: "#F8F3E8",
  text: "#0F172A", textSub: "#475569", textMuted: "#94A3B8",
};

const rssiInfo = (v) =>
  v >= -50 ? ["Excellent", "#10B981", "#ECFDF5"] :
  v >= -70 ? ["Good",      "#F59E0B", "#FFFBEB"] :
  v >= -80 ? ["Weak",      "#F97316", "#FFF7ED"] :
             ["Poor",      "#EF4444", "#FEF2F2"];

const heapInfo = (v) =>
  v > 100000 ? ["Healthy", "#10B981", "#ECFDF5"] :
  v > 50000  ? ["Normal",  "#F59E0B", "#FFFBEB"] :
               ["Low",     "#EF4444", "#FEF2F2"];

const ControllersPage = () => {
  const [ctrls,   setCtrls]   = useState([]);
  const [loading, setLoading] = useState(true);
  const admin = JSON.parse(localStorage.getItem("admin") || "{}");

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await getControllerHealth(admin.city);
        setCtrls(data.data);
      } catch {}
      finally { setLoading(false); }
    };
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  const online   = ctrls.filter(c => c.is_online).length;
  const offline  = ctrls.filter(c => !c.is_online).length;
  const wdtTotal = ctrls.reduce((s, c) => s + (c.watchdog_resets || 0), 0);

  const SUMMARIES = [
    { label: "TOTAL",      val: ctrls.length, icon: "📡", color: "linear-gradient(135deg,#1D4ED8,#2563EB,#3B82F6)", shadow: "rgba(37,99,235,0.28)"   },
    { label: "ONLINE",     val: online,        icon: "✅", color: "linear-gradient(135deg,#057A50,#10B981,#34D399)", shadow: "rgba(16,185,129,0.28)"  },
    { label: "OFFLINE",    val: offline,       icon: "📴", color: "linear-gradient(135deg,#B91C1C,#EF4444,#F87171)", shadow: "rgba(239,68,68,0.28)"   },
    { label: "WDT RESETS", val: wdtTotal,      icon: "⚠️", color: "linear-gradient(135deg,#B45309,#F59E0B,#FCD34D)", shadow: "rgba(245,158,11,0.28)"  },
  ];

  return (
    <Layout title="Controller Monitoring">

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {SUMMARIES.map((s, idx) => (
          <div
            key={s.label}
            className="rounded-2xl p-5 fade-up card-hover"
            style={{
              background: s.color,
              backgroundSize: "200% 200%",
              animation: `gradientShift 5s ease infinite, fadeUp 0.4s ease ${idx * 0.08}s both`,
              boxShadow: `0 6px 24px ${s.shadow}, inset 0 1px 0 rgba(255,255,255,0.18)`,
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/70 text-xs font-semibold uppercase tracking-wider">{s.label}</span>
              <span className="text-2xl float-anim" style={{ animationDelay: `${idx * 0.5}s` }}>{s.icon}</span>
            </div>
            <div className="text-3xl font-bold text-white mono">{s.val}</div>
          </div>
        ))}
      </div>

      {/* Controller Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl"
              style={{
                height: "208px",
                background: `linear-gradient(90deg,${C.bgSection},${C.bgHover},${C.bgSection})`,
                backgroundSize: "200% 100%",
                animation: "shimmer 1.5s ease infinite",
                border: `1px solid ${C.border}`,
              }}
            />
          ))}
        </div>
      ) : ctrls.length === 0 ? (
        <div
          className="rounded-2xl p-16 text-center"
          style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(100,80,50,0.07)" }}
        >
          <div className="text-4xl mb-3 float-anim">📡</div>
          <div className="text-sm font-semibold mb-1" style={{ color: C.textSub }}>No controllers found</div>
          <div className="text-xs" style={{ color: C.textMuted }}>Hardware connect hone ke baad controllers yahan dikhenge</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {ctrls.map((ctrl, idx) => {
            const [rssiLabel, rssiColor, rssiBg] = rssiInfo(ctrl.wifi_rssi);
            const [heapLabel, heapColor, heapBg] = heapInfo(ctrl.free_heap);
            const rssiPct = Math.max(0, Math.min(100, (ctrl.wifi_rssi + 100) * 2));
            const heapPct = Math.max(0, Math.min(100, (ctrl.free_heap / 200000) * 100));
            const secAgo  = Math.floor((Date.now() - new Date(ctrl.last_ping)) / 1000);

            return (
              <div
                key={ctrl.controller_id}
                className="rounded-2xl p-5 card-hover fade-up"
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  boxShadow: "0 1px 4px rgba(100,80,50,0.07)",
                  animationDelay: `${idx * 0.06}s`,
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-bold mono text-sm" style={{ color: C.text }}>{ctrl.controller_id}</div>
                    <div className="text-xs mt-0.5" style={{ color: C.textMuted }}>{ctrl.city}</div>
                  </div>
                  <div
                    className="px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5"
                    style={{
                      background: ctrl.is_online ? "#ECFDF5" : "#FEF2F2",
                      border: `1px solid ${ctrl.is_online ? "#A7F3D0" : "#FECACA"}`,
                      color: ctrl.is_online ? "#065F46" : "#991B1B",
                    }}
                  >
                    {ctrl.is_online ? (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                    ) : (
                      <span style={{ fontSize: "7px" }}>●</span>
                    )}
                    {ctrl.is_online ? "Online" : "Offline"}
                  </div>
                </div>

                {/* WiFi RSSI */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span style={{ color: C.textSub }}>WiFi RSSI</span>
                    <span className="font-bold mono" style={{ color: rssiColor }}>{ctrl.wifi_rssi} dBm</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: rssiBg }}>
                    <div className="h-full rounded-full progress-bar-fill" style={{ width: `${rssiPct}%`, background: `linear-gradient(90deg,${rssiColor}99,${rssiColor})` }} />
                  </div>
                  <div className="text-xs mt-1 font-medium" style={{ color: rssiColor }}>{rssiLabel}</div>
                </div>

                {/* Free Heap */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span style={{ color: C.textSub }}>Free Heap</span>
                    <span className="font-bold mono" style={{ color: heapColor }}>{(ctrl.free_heap / 1024).toFixed(0)} KB</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: heapBg }}>
                    <div className="h-full rounded-full progress-bar-fill" style={{ width: `${heapPct}%`, background: `linear-gradient(90deg,${heapColor}99,${heapColor})` }} />
                  </div>
                  <div className="text-xs mt-1 font-medium" style={{ color: heapColor }}>{heapLabel}</div>
                </div>

                {/* Footer */}
                <div className="border-t pt-3 flex justify-between text-xs mono" style={{ borderColor: C.borderLight }}>
                  <span style={{ color: C.textMuted }}>Ping: {secAgo}s ago</span>
                  {ctrl.watchdog_resets > 0 && (
                    <span style={{ color: "#F97316" }}>⚠ WDT:{ctrl.watchdog_resets}</span>
                  )}
                </div>

                {ctrl.ip_address && (
                  <div className="text-xs mono mt-1" style={{ color: C.textMuted }}>{ctrl.ip_address}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
};

export default ControllersPage;
