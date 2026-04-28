import { useEffect, useState } from "react";
import Layout from "../components/Sidebar/Layout";
import { getEnergyAnalytics, getDashboardStats } from "../services/api";

const C = {
  card: "#FEFCF7", border: "#E5DDD0", borderLight: "#EDE8DC",
  bg: "#EEE8DC", bgHover: "#F5EFE4", bgSection: "#F8F3E8",
  text: "#0F172A", textSub: "#475569", textMuted: "#94A3B8",
};

const EnergyPage = () => {
  const [data,    setData]    = useState(null);
  const [stats,   setStats]   = useState(null);
  const [range,   setRange]   = useState("7days");
  const [loading, setLoading] = useState(true);
  const admin = JSON.parse(localStorage.getItem("admin") || "{}");

  const load = async (r) => {
    setLoading(true);
    try {
      const [e, s] = await Promise.all([getEnergyAnalytics(admin.city, r), getDashboardStats(admin.city)]);
      setData(e.data.data);
      setStats(s.data.data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(range); }, [range]);

  const chart       = data?.chart || [];
  const maxVal      = Math.max(...chart.map(c => c.value), 1);
  const totalKWh    = data?.totalKWh || 0;
  const costEst     = data?.costEstimate || 0;
  const energySaved = data?.energySaved ?? null;
  const trendData   = chart.slice(-12);
  const maxTrend    = Math.max(...trendData.map(c => c.value), 1);
  const savedDisplay = loading ? "..." : energySaved === null ? "N/A" : `${energySaved}%`;

  const STAT_CARDS = [
    { label: "TOTAL USAGE",   val: loading ? "..." : `${totalKWh} kWh`, icon: "⚡", color: "linear-gradient(135deg,#1D4ED8,#2563EB,#3B82F6)", shadow: "rgba(37,99,235,0.28)" },
    { label: "COST ESTIMATE", val: loading ? "..." : `₹ ${costEst}`,    icon: "💰", color: "linear-gradient(135deg,#B45309,#F59E0B,#FCD34D)", shadow: "rgba(245,158,11,0.28)" },
    { label: "ENERGY SAVED",  val: savedDisplay,                         icon: "🌿", color: "linear-gradient(135deg,#057A50,#10B981,#34D399)", shadow: "rgba(16,185,129,0.28)" },
    { label: "ACTIVE LIGHTS", val: loading ? "..." : (stats?.activeLights ?? 0), icon: "💡", color: "linear-gradient(135deg,#5B21B6,#7C3AED,#A78BFA)", shadow: "rgba(124,58,237,0.28)" },
  ];

  return (
    <Layout title="Energy Analytics">

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {STAT_CARDS.map((s, idx) => (
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart */}
        <div
          className="rounded-2xl p-5 lg:col-span-2 fade-up"
          style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(100,80,50,0.07)", animationDelay: "0.15s" }}
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: C.text }}>
              📊 Daily Energy Usage (kWh)
            </h3>
            <div className="flex gap-2">
              {["7days", "30days", "1year"].map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold mono transition-all duration-200"
                  style={range === r ? {
                    background: "linear-gradient(135deg,#1D4ED8,#2563EB)",
                    color: "#FFFFFF",
                    boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
                  } : {
                    background: C.bgSection,
                    border: `1px solid ${C.border}`,
                    color: C.textSub,
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div
              className="h-40 rounded-xl"
              style={{ background: `linear-gradient(90deg,${C.bgSection},${C.bgHover},${C.bgSection})`, backgroundSize: "200% 100%", animation: "shimmer 1.5s ease infinite" }}
            />
          ) : chart.every(c => c.value === 0) ? (
            <div className="h-40 flex flex-col items-center justify-center gap-2" style={{ color: C.textMuted }}>
              <span className="text-3xl float-anim">⚡</span>
              <span className="text-sm font-medium">No energy data available yet</span>
              <span className="text-xs" style={{ color: C.textMuted }}>Real-time data will appear once hardware is connected</span>
            </div>
          ) : (
            <>
              <div className="flex items-end gap-1 mb-3" style={{ height: "140px" }}>
                {chart.map((item, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group cursor-pointer">
                    {item.value > 0 && (
                      <span className="text-xs mono opacity-0 group-hover:opacity-100 transition-all duration-200 -translate-y-1 group-hover:translate-y-0" style={{ color: C.textSub }}>
                        {item.value}
                      </span>
                    )}
                    <div
                      className="w-full rounded-t-lg transition-all duration-500 group-hover:opacity-80"
                      style={{
                        height: `${Math.max((item.value / maxVal) * 110, item.value > 0 ? 4 : 0)}px`,
                        background: i === chart.length - 1
                          ? "linear-gradient(180deg,#60A5FA,#2563EB)"
                          : "linear-gradient(180deg,#3B82F6,#1D4ED8)",
                        boxShadow: i === chart.length - 1 ? "0 0 10px rgba(59,130,246,0.3)" : "none",
                      }}
                    />
                    <span className="text-xs truncate w-full text-center" style={{ color: C.textMuted }}>{item.label}</span>
                  </div>
                ))}
              </div>

              {trendData.some(c => c.value > 0) && (
                <div className="mt-4 pt-4 border-t" style={{ borderColor: C.borderLight }}>
                  <h4 className="text-xs font-semibold uppercase mb-3 flex items-center gap-2" style={{ color: C.textMuted }}>
                    <span className="w-8 h-px" style={{ background: C.border }} />
                    Monthly Trend
                  </h4>
                  <svg viewBox="0 0 500 70" className="w-full" style={{ height: "60px" }}>
                    <defs>
                      <linearGradient id="lgE" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <polyline
                      points={trendData.map((v, i) => `${(i / (trendData.length - 1)) * 500},${70 - (v.value / maxTrend) * 60}`).join(" ")}
                      fill="none" stroke="#2563EB" strokeWidth="2.5"
                    />
                    <polygon
                      points={`0,70 ${trendData.map((v, i) => `${(i / (trendData.length - 1)) * 500},${70 - (v.value / maxTrend) * 60}`).join(" ")} 500,70`}
                      fill="url(#lgE)"
                    />
                    {trendData.map((v, i) => (
                      <circle key={i} cx={(i / (trendData.length - 1)) * 500} cy={70 - (v.value / maxTrend) * 60} r="3.5" fill="#2563EB" />
                    ))}
                  </svg>
                  <div className="flex justify-between mt-1">
                    {trendData.map((v, i) => (
                      <span key={i} className="text-xs" style={{ color: C.textMuted }}>{v.label}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right panels */}
        <div className="space-y-4">
          {/* Status Breakdown */}
          <div
            className="rounded-2xl p-5 slide-right"
            style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(100,80,50,0.07)", animationDelay: "0.1s" }}
          >
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: C.text }}>
              📈 Light Status Breakdown
            </h3>
            {(() => {
              const total = stats?.totalLights || 0;
              const breakdown = [
                { label: "ON (Active)", val: stats?.activeLights || 0, color: "#10B981", trackBg: "#ECFDF5" },
                { label: "IDLE",        val: stats?.idleLights   || 0, color: "#F59E0B", trackBg: "#FFFBEB" },
                { label: "FAULT",       val: stats?.faultyLights || 0, color: "#EF4444", trackBg: "#FEF2F2" },
                { label: "DAY OFF",     val: stats?.dayOffLights || 0, color: "#94A3B8", trackBg: C.bgSection },
              ];
              return breakdown.map((item) => {
                const pct = total > 0 ? parseFloat(((item.val / total) * 100).toFixed(1)) : 0;
                return (
                  <div key={item.label} className="mb-3">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span style={{ color: C.textSub }}>{item.label}</span>
                      <span className="mono font-semibold" style={{ color: C.text }}>{item.val} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: item.trackBg }}>
                      <div className="h-full rounded-full progress-bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg,${item.color}99,${item.color})` }} />
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          {/* Cost Savings */}
          <div
            className="rounded-2xl p-5 slide-right"
            style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(100,80,50,0.07)", animationDelay: "0.2s" }}
          >
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: C.text }}>
              💰 Cost Savings
            </h3>
            <div className="text-center py-2">
              <div
                className="text-5xl font-bold mono"
                style={{ color: energySaved === null ? C.textMuted : "#10B981" }}
              >
                {savedDisplay}
              </div>
              <div className="text-xs mt-1" style={{ color: C.textMuted }}>
                {energySaved === null ? "No historical data available" : "vs. last period"}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t space-y-2" style={{ borderColor: C.borderLight }}>
              {[
                { label: "This Period", val: `₹ ${costEst}` },
                { label: "Rate/kWh",    val: "₹ 8.5" },
                { label: "Total kWh",   val: `${totalKWh} kWh` },
              ].map((r) => (
                <div key={r.label} className="flex justify-between text-xs">
                  <span style={{ color: C.textSub }}>{r.label}</span>
                  <span className="mono font-bold" style={{ color: C.text }}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default EnergyPage;
