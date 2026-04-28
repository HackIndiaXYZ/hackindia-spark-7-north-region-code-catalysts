import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import Layout from "../components/Sidebar/Layout";
import { getLightHistory, getLightById } from "../services/api";

const FlyTo = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, zoom, { duration: 0.8 }); }, [center]);
  return null;
};

const STATUS_COLOR = { ON:"#10b981", IDLE:"#f59e0b", FAULT:"#ef4444", DAY_OFF:"#6b7280", OFFLINE:"#64748B" };

const STATUS_DOT = {
  ON:      { bg: "#ECFDF5", border: "#A7F3D0", color: "#065F46" },
  IDLE:    { bg: "#FFFBEB", border: "#FDE68A", color: "#92400E" },
  FAULT:   { bg: "#FEF2F2", border: "#FECACA", color: "#991B1B" },
  DAY_OFF: { bg: "#F8FAFC", border: "#E2E8F0", color: "#475569" },
  OFFLINE: { bg: "#F1F5F9", border: "#CBD5E1", color: "#334155" },
};

const MiniChart = ({ data, color }) => {
  if (!data || data.length === 0) return null;
  const max  = Math.max(...data, 1);
  const w    = 300, h = 60;
  const pts  = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 8)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{height:"60px"}}>
      <defs>
        <linearGradient id={`cg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#cg-${color.replace('#','')})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" />
      {data.map((v, i) => (
        <circle key={i} cx={(i/(data.length-1))*w} cy={h-(v/max)*(h-8)} r="3" fill={color} 
          style={{ filter: `drop-shadow(0 0 3px ${color}80)` }} />
      ))}
    </svg>
  );
};

const LightDetail = () => {
  const { light_id } = useParams();
  const navigate     = useNavigate();
  const [logs,      setLogs]      = useState([]);
  const [lightInfo, setLightInfo] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const admin = JSON.parse(localStorage.getItem("admin") || "{}");

  useEffect(() => {
    const load = async () => {
      try {
        const [histRes, lightRes] = await Promise.all([
          getLightHistory(light_id),
          getLightById(light_id),
        ]);
        setLogs(histRes.data.data);
        if (lightRes.data.data) setLightInfo(lightRes.data.data);
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, [light_id]);

  const latest = logs[logs.length - 1] || {};
  const status = lightInfo?.current_status || latest.status || "DAY_OFF";
  const mapCenter = lightInfo?.location?.lat && lightInfo?.location?.lng
    ? [lightInfo.location.lat, lightInfo.location.lng]
    : null;
  const currentVals = logs.slice(-24).map((l) => l.current_usage || 0);
  const motionVals  = logs.slice(-24).map((l) => l.motion_detected ? 1 : 0);
  const ldrVals     = logs.slice(-24).map((l) => l.ldr_value || 0);
  const statusDot   = STATUS_DOT[status] || STATUS_DOT.DAY_OFF;

  return (
    <Layout title={`Light Detail — ${light_id}`}>
      {/* Back */}
      <button onClick={() => navigate("/lights")} 
        className="text-sm mono mb-5 flex items-center gap-2 transition-all duration-300 group fade-up"
        style={{ color: "#64748B" }}
        onMouseEnter={e => e.currentTarget.style.color = "#2563EB"}
        onMouseLeave={e => e.currentTarget.style.color = "#64748B"}>
        <span className="group-hover:-translate-x-1 transition-transform">←</span>
        Back to Street Lights
      </button>

      {/* Top Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Light Info Card */}
        <div className="rounded-2xl p-5 fade-up" style={{ background: "#FEFCF7", border: "1px solid #E5DDD0", boxShadow: "0 1px 4px rgba(100,80,50,0.07)" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl float-anim"
              style={{
                background: `linear-gradient(135deg, ${STATUS_COLOR[status]}33, ${STATUS_COLOR[status]}11)`,
                border: `1px solid ${STATUS_COLOR[status]}33`,
                boxShadow: `0 4px 15px ${STATUS_COLOR[status]}20`,
              }}>💡</div>
            <div>
              <h2 className="font-bold text-lg mono" style={{ color: "#0F172A" }}>{light_id}</h2>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold"
                style={{ background: statusDot.bg, border: `1px solid ${statusDot.border}`, color: statusDot.color }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLOR[status] }} />
                {status}
              </span>
            </div>
          </div>
          <div className="space-y-0 text-sm">
            {[
              { label:"ID",           val: light_id },
              { label:"Controller",   val: latest.controller_id || "—" },
              { label:"City",         val: admin.city || "—" },
              { label:"Current",      val: `${latest.current_usage || 0} A` },
              { label:"Motion",       val: latest.motion_detected ? "✅ Detected" : "❌ None" },
              { label:"Last Update",  val: latest.timestamp ? new Date(latest.timestamp).toLocaleString("en-IN") : "—" },
            ].map((r) => (
              <div key={r.label} className="flex justify-between border-b py-2 transition-all duration-200" style={{ borderColor: "#EDE8DC" }}
                onMouseEnter={e => e.currentTarget.style.background = "#F5EFE4"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <span style={{ color: "#64748B" }}>{r.label}</span>
                <span className="mono font-semibold" style={{ color: "#0F172A" }}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Mini Map */}
        <div className="rounded-2xl overflow-hidden fade-up" style={{ background: "#FEFCF7", border: "1px solid #E5DDD0", boxShadow: "0 1px 4px rgba(100,80,50,0.07)", animationDelay: "0.1s" }}>
          <div className="px-4 py-2.5 border-b flex items-center justify-between" style={{ borderColor: "#EDE8DC", background: "#F8F3E8" }}>
            <span className="text-sm font-semibold flex items-center gap-2" style={{ color: "#0F172A" }}>📍 Location</span>
            {lightInfo?.location?.address && (
              <span className="text-xs mono truncate ml-2" style={{ color: "#64748B" }}>{lightInfo.location.address}</span>
            )}
          </div>
          <div style={{height:"240px"}}>
            {!mapCenter ? (
              <div className="h-full flex items-center justify-center text-sm" style={{ color: "#94A3B8" }}>
                <div className="text-center">
                  <div className="text-2xl mb-2 float-anim">📍</div>
                  Location data unavailable
                </div>
              </div>
            ) : (
              <MapContainer center={mapCenter} zoom={17} style={{height:"100%",width:"100%"}} zoomControl={false}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                <FlyTo center={mapCenter} zoom={17} />
                <CircleMarker center={mapCenter} radius={12}
                  pathOptions={{ color: STATUS_COLOR[status], fillColor: STATUS_COLOR[status], fillOpacity:0.9, weight:3 }}>
                  <Popup>
                    <div style={{fontSize:"11px"}}>
                      <div style={{fontWeight:"bold"}}>{light_id}</div>
                      <div>Status: {status}</div>
                      <div>{lightInfo?.location?.address || ""}</div>
                    </div>
                  </Popup>
                </CircleMarker>
              </MapContainer>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-3 stagger-children">
          {[
            { label:"Total Readings",  val: logs.length,   icon:"📊", gradient: "linear-gradient(135deg,#2563EB,#60A5FA)", shadow: "rgba(37,99,235,0.2)" },
            { label:"Fault Events",    val: logs.filter(l=>l.status==="FAULT").length, icon:"⚠️", gradient: "linear-gradient(135deg,#DC2626,#F87171)", shadow: "rgba(239,68,68,0.2)" },
            { label:"Motion Events",   val: logs.filter(l=>l.motion_detected).length,  icon:"🚶", gradient: "linear-gradient(135deg,#059669,#34D399)", shadow: "rgba(16,185,129,0.2)" },
            { label:"Avg Current",     val: logs.length ? (logs.reduce((s,l)=>s+(l.current_usage||0),0)/logs.length).toFixed(3)+" A" : "0.000 A", icon:"⚡", gradient: "linear-gradient(135deg,#7C3AED,#A78BFA)", shadow: "rgba(124,58,237,0.2)" },
          ].map((s, idx) => (
            <div key={s.label} className="rounded-2xl px-4 py-3 flex items-center justify-between card-hover fade-up"
              style={{ background: s.gradient, boxShadow: `0 4px 15px ${s.shadow}`, animationDelay: `${idx * 0.08}s` }}>
              <div>
                <div className="text-white/70 text-xs font-semibold">{s.label}</div>
                <div className="text-white text-2xl font-bold mono">{s.val}</div>
              </div>
              <span className="text-2xl float-anim" style={{ animationDelay: `${idx * 0.4}s` }}>{s.icon}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5 stagger-children">
        {[
          { label:"Current Usage (A)",    data:currentVals, color:"#2563EB" },
          { label:"Motion Detection",     data:motionVals,  color:"#10b981" },
          { label:"LDR (Light Sensor)",   data:ldrVals,     color:"#f59e0b" },
        ].map((c, idx) => (
          <div key={c.label} className="rounded-2xl p-4 fade-up card-hover"
            style={{ background: "#FEFCF7", border: "1px solid #E5DDD0", boxShadow: "0 1px 4px rgba(100,80,50,0.07)", animationDelay: `${idx * 0.08}s` }}>
            <h4 className="text-xs mono uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: "#64748B" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: c.color, boxShadow: `0 0 6px ${c.color}60` }}></span>
              {c.label}
            </h4>
            {loading
              ? <div className="h-16 rounded-xl" style={{
                  background: 'linear-gradient(90deg, #F8F3E8, #EDE8DC, #F8F3E8)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s ease infinite',
                }} />
              : <MiniChart data={c.data} color={c.color} />
            }
          </div>
        ))}
      </div>

      {/* Raw Logs Table */}
      <div className="rounded-2xl overflow-hidden fade-up" style={{ background: "#FEFCF7", border: "1px solid #E5DDD0", boxShadow: "0 1px 4px rgba(100,80,50,0.07)", animationDelay: '0.3s' }}>
        <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#EDE8DC", background: "#F8F3E8" }}>
          <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: "#0F172A" }}>
            <span>📋</span> Raw Logs — Last 24 Hours
          </h3>
          <span className="text-xs mono px-2.5 py-1 rounded-lg" style={{ background: "#EDE8DC", color: "#64748B", border: "1px solid #E5DDD0" }}>
            {logs.length} entries
          </span>
        </div>
        <div className="overflow-x-auto" style={{maxHeight:"320px",overflowY:"auto"}}>
          <table className="w-full text-xs mono">
            <thead className="sticky top-0 z-10" style={{background:"#F8F3E8"}}>
              <tr className="uppercase border-b" style={{ borderColor: "#EDE8DC", color: "#94A3B8", letterSpacing: "0.06em" }}>
                <th className="text-left p-3 font-semibold">Time</th>
                <th className="text-left p-3 font-semibold">Status</th>
                <th className="text-left p-3 font-semibold">Current</th>
                <th className="text-left p-3 font-semibold">LDR</th>
                <th className="text-left p-3 font-semibold">Motion</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? [...Array(6)].map((_,i) => (
                  <tr key={i} className="border-b" style={{borderColor:"#EDE8DC"}}>
                    {[...Array(5)].map((_,j) => (
                      <td key={j} className="p-3">
                        <div className="h-3 rounded-lg w-16"
                          style={{
                            background: 'linear-gradient(90deg, #F8F3E8, #EDE8DC, #F8F3E8)',
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 1.5s ease infinite',
                          }} />
                      </td>
                    ))}
                  </tr>
                ))
                : logs.slice().reverse().map((log, i) => {
                  const logDot = STATUS_DOT[log.status] || STATUS_DOT.DAY_OFF;
                  return (
                    <tr key={i} className="border-b transition-all duration-200" style={{borderColor:"#EDE8DC"}}
                      onMouseEnter={e => e.currentTarget.style.background = "#F5EFE4"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td className="p-3" style={{ color: "#64748B" }}>{new Date(log.timestamp).toLocaleTimeString()}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold"
                          style={{ background: logDot.bg, border: `1px solid ${logDot.border}`, color: logDot.color }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLOR[log.status] || "#6b7280" }} />
                          {log.status}
                        </span>
                      </td>
                      <td className="p-3 font-bold" style={{ color: "#0F172A" }}>{log.current_usage}A</td>
                      <td className="p-3 font-bold" style={{ color: "#92400E" }}>{log.ldr_value}</td>
                      <td className="p-3">{log.motion_detected ? <span style={{ color: "#065F46" }}>✓ Yes</span> : <span style={{ color: "#94A3B8" }}>No</span>}</td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default LightDetail;
