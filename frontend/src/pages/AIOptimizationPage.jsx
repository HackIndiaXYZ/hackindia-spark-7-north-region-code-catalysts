import { useState, useEffect, useCallback } from "react";
import Layout from "../components/Sidebar/Layout";
import { runAIOptimization, getAIResults } from "../services/api";
import AIMap from "../components/AIMap";

// ── colour maps ────────────────────────────────────────────────────────────
const STATUS_CFG = {
  "Normal":        { bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.35)",  text: "#4ADE80", dot: "#22C55E" },
  "Low Activity":  { bg: "rgba(234,179,8,0.12)",  border: "rgba(234,179,8,0.35)",  text: "#FCD34D", dot: "#EAB308" },
  "High Activity": { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.35)", text: "#60A5FA", dot: "#3B82F6" },
  "Under-Lit":     { bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.35)", text: "#FB923C", dot: "#F97316" },
  "Faulty":        { bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.35)",  text: "#F87171", dot: "#EF4444" },
  "Offline":       { bg: "rgba(239,68,68,0.14)",  border: "rgba(239,68,68,0.4)",   text: "#FCA5A5", dot: "#DC2626" },
};
const PRIORITY_CFG = {
  Low:      { text: "#4ADE80", bg: "rgba(34,197,94,0.1)"  },
  Medium:   { text: "#FCD34D", bg: "rgba(234,179,8,0.1)"  },
  High:     { text: "#FB923C", bg: "rgba(249,115,22,0.1)" },
  Critical: { text: "#F87171", bg: "rgba(239,68,68,0.1)"  },
};
const ACTION_ICON = {
  "Maintain":          "✅",
  "Adjust Intensity":  "🔆",
  "Assign Technician": "🔧",
  "Install New Light": "💡",
  "Redistribute Load": "⚡",
};
const WEATHER_ICON = { Clear:"☀️", Cloudy:"☁️", Rainy:"🌧️", Foggy:"🌫️" };
const TOD_ICON     = { Morning:"🌅", Afternoon:"🌞", Evening:"🌆", Night:"🌙" };

// ── small reusable components ──────────────────────────────────────────────
const Badge = ({ label, cfg }) => (
  <span style={{
    display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px",
    borderRadius:20, fontSize:11, fontWeight:700, letterSpacing:"0.03em",
    background: cfg.bg, border:`1px solid ${cfg.border || cfg.bg}`,
    color: cfg.text,
  }}>
    {cfg.dot && <span style={{ width:6, height:6, borderRadius:"50%", background:cfg.dot, flexShrink:0 }} />}
    {label}
  </span>
);

const IntensityBar = ({ value, recommended }) => {
  const pct  = Math.min(100, Math.max(0, value));
  const rpct = Math.min(100, Math.max(0, recommended));
  const color = pct > 80 ? "#EF4444" : pct > 50 ? "#3B82F6" : "#22C55E";
  return (
    <div style={{ width:"100%", position:"relative" }}>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"rgba(255,255,255,0.45)", marginBottom:3 }}>
        <span>Current {pct}%</span>
        <span style={{ color:"#60A5FA" }}>Target {rpct}%</span>
      </div>
      <div style={{ height:6, background:"rgba(255,255,255,0.08)", borderRadius:6, overflow:"hidden", position:"relative" }}>
        <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:6, transition:"width .5s" }} />
      </div>
      {/* target marker */}
      <div style={{
        position:"absolute", bottom:0, left:`${rpct}%`, transform:"translateX(-50%)",
        width:2, height:6, background:"#60A5FA", borderRadius:2,
      }} />
    </div>
  );
};

// ── Summary card ───────────────────────────────────────────────────────────
const SumCard = ({ icon, label, value, accent }) => (
  <div style={{
    background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))",
    border:"1px solid rgba(255,255,255,0.08)", borderRadius:16, padding:"18px 20px",
    display:"flex", flexDirection:"column", gap:6,
  }}>
    <div style={{ fontSize:22 }}>{icon}</div>
    <div style={{ fontSize:26, fontWeight:800, color: accent || "#fff" }}>{value}</div>
    <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", fontWeight:500 }}>{label}</div>
  </div>
);

// ── Drawer ─────────────────────────────────────────────────────────────────
const DetailDrawer = ({ row, onClose }) => {
  if (!row) return null;
  const sc  = STATUS_CFG[row.status]   || STATUS_CFG["Normal"];
  const pc  = PRIORITY_CFG[row.priority] || PRIORITY_CFG["Low"];
  const synth = row.synth || {};

  const InfoRow = ({ label, value }) => (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
      padding:"9px 0", borderBottom:"1px solid rgba(255,255,255,0.05)", gap:8 }}>
      <span style={{ fontSize:12, color:"rgba(255,255,255,0.45)", minWidth:130 }}>{label}</span>
      <span style={{ fontSize:13, color:"#E2E8F0", fontWeight:600, textAlign:"right" }}>{value ?? "—"}</span>
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:200, backdropFilter:"blur(3px)",
      }} />
      {/* Panel */}
      <div style={{
        position:"fixed", top:0, right:0, bottom:0, width:420, zIndex:201,
        background:"linear-gradient(180deg,#0F1F3D 0%,#0A1628 100%)",
        borderLeft:"1px solid rgba(255,255,255,0.09)",
        boxShadow:"-20px 0 60px rgba(0,0,0,0.5)",
        overflowY:"auto", padding:"28px 24px",
        animation:"slideInRight .25s ease",
      }}>
        <style>{`@keyframes slideInRight{from{transform:translateX(30px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
          <div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", letterSpacing:"0.08em", marginBottom:4 }}>LIGHT ANALYSIS</div>
            <div style={{ fontSize:20, fontWeight:800, color:"#fff" }}>{row.light_id}</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{row.controller_id}</div>
          </div>
          <button onClick={onClose} style={{
            background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:8, color:"rgba(255,255,255,0.6)", width:32, height:32,
            cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center",
          }}>✕</button>
        </div>

        {/* Status + Priority */}
        <div style={{ display:"flex", gap:8, marginBottom:20 }}>
          <Badge label={row.status}   cfg={sc} />
          <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20,
            background:pc.bg, color:pc.text }}>
            {row.priority} Priority
          </span>
        </div>

        {/* Intensity bar */}
        <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:12, padding:16, marginBottom:20 }}>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.45)", marginBottom:10 }}>INTENSITY</div>
          <IntensityBar value={row.current_intensity} recommended={row.recommended_intensity} />
          {row.energy_saved_pct > 0 && (
            <div style={{ marginTop:10, fontSize:12, color:"#4ADE80", fontWeight:600 }}>
              ⚡ {row.energy_saved_pct}% energy savings projected
            </div>
          )}
        </div>

        {/* Action */}
        <div style={{
          background:"rgba(59,130,246,0.08)", border:"1px solid rgba(59,130,246,0.2)",
          borderRadius:12, padding:14, marginBottom:20,
        }}>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginBottom:6 }}>RECOMMENDED ACTION</div>
          <div style={{ fontSize:15, fontWeight:700, color:"#60A5FA" }}>
            {ACTION_ICON[row.action]} {row.action}
          </div>
          {row.task_created && (
            <div style={{ fontSize:11, color:"#FCD34D", marginTop:6 }}>⚠ Maintenance task auto-created</div>
          )}
        </div>

        {/* AI Explanation */}
        <div style={{
          background:"rgba(255,255,255,0.03)", borderRadius:12, padding:14, marginBottom:20,
          border:"1px solid rgba(255,255,255,0.07)",
        }}>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginBottom:8 }}>AI REASONING</div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.75)", lineHeight:1.6 }}>{row.explanation}</div>
        </div>

        {/* Sensor data */}
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginBottom:8, letterSpacing:"0.06em" }}>SENSOR & CONTEXT DATA</div>
        <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:12, padding:"0 14px",
          border:"1px solid rgba(255,255,255,0.06)", marginBottom:20 }}>
          <InfoRow label="Time of Day"       value={`${TOD_ICON[synth.time_of_day] || ""} ${synth.time_of_day || "—"}`} />
          <InfoRow label="Weather"           value={`${WEATHER_ICON[synth.weather_condition] || ""} ${synth.weather_condition || "—"}`} />
          <InfoRow label="Ambient Light"     value={synth.ambient_light_lux != null ? `${synth.ambient_light_lux.toFixed(0)} lux` : "—"} />
          <InfoRow label="Traffic Density"   value={synth.traffic_density  != null ? `${synth.traffic_density}%` : "—"} />
          <InfoRow label="Coverage Gap"      value={synth.coverage_gap     != null ? `${(synth.coverage_gap * 100).toFixed(0)}%` : "—"} />
          <InfoRow label="Nearby Lights"     value={synth.nearby_light_count ?? "—"} />
          <InfoRow label="Under-Lit Zone"    value={synth.under_lit ? "Yes ⚠" : "No"} />
          {row.location && (
            <InfoRow label="Coordinates"
              value={`${row.location.lat?.toFixed(5)}, ${row.location.lng?.toFixed(5)}`} />
          )}
        </div>
      </div>
    </>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────
export default function AIOptimizationPage() {
  const [results,     setResults]     = useState([]);
  const [summary,     setSummary]     = useState(null);
  const [analyzedAt,  setAnalyzedAt]  = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [running,     setRunning]     = useState(false);
  const [filterStatus,setFilterStatus]= useState("All");
  const [filterPriority,setFilterPriority] = useState("All");
  const [search,      setSearch]      = useState("");
  const [selected,    setSelected]    = useState(null);
  const [error,       setError]       = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getAIResults();
      if (data.success && data.results?.length) {
        setResults(data.results);
        setSummary(data.summary);
        setAnalyzedAt(data.analyzed_at);
      }
    } catch { setError("Could not load previous results."); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRun = async () => {
    setRunning(true);
    setError("");
    try {
      const { data } = await runAIOptimization();
      if (data.success) {
        setResults(data.results);
        setSummary(data.summary);
        setAnalyzedAt(data.analyzed_at);
      }
    } catch (e) {
      setError(e.response?.data?.message || "AI engine failed. Make sure the backend is running.");
    } finally { setRunning(false); }
  };

  // Filter pipeline
  const visible = results.filter(r => {
    if (filterStatus   !== "All" && r.status   !== filterStatus)   return false;
    if (filterPriority !== "All" && r.priority !== filterPriority) return false;
    if (search && !r.light_id.toLowerCase().includes(search.toLowerCase()) &&
        !r.controller_id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statuses   = ["All","Normal","Low Activity","High Activity","Under-Lit","Faulty","Offline"];
  const priorities = ["All","Low","Medium","High","Critical"];

  const pill = (opts, val, set) => (
    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
      {opts.map(o => (
        <button key={o} onClick={() => set(o)} style={{
          padding:"5px 12px", borderRadius:20, fontSize:11, fontWeight:600, cursor:"pointer",
          border: val === o ? "1px solid rgba(59,130,246,0.6)" : "1px solid rgba(255,255,255,0.1)",
          background: val === o ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.04)",
          color: val === o ? "#60A5FA" : "rgba(255,255,255,0.5)",
          transition:"all .15s",
        }}>{o}</button>
      ))}
    </div>
  );

  return (
    <Layout>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .ai-row:hover{background:rgba(255,255,255,0.04) !important;cursor:pointer;}
        .run-btn:hover{transform:translateY(-1px);box-shadow:0 8px 30px rgba(59,130,246,0.5) !important;}
        .run-btn:active{transform:translateY(0);}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:4px}
      `}</style>

      <div style={{ padding:"28px 32px", minHeight:"100vh",
        background:"linear-gradient(180deg,#0B1A30 0%,#081424 100%)" }}>

        {/* ── Header ── */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between",
          marginBottom:28, flexWrap:"wrap", gap:16 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
              <div style={{
                width:40, height:40, borderRadius:12,
                background:"linear-gradient(135deg,#1D4ED8,#7C3AED)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:20, boxShadow:"0 4px 20px rgba(124,58,237,0.4)",
              }}>🤖</div>
              <div>
                <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:"#fff", letterSpacing:"-0.02em" }}>
                  AI Smart Optimization
                </h1>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", marginTop:2 }}>
                  Intelligent street light intensity & coverage management
                </div>
              </div>
            </div>
            {analyzedAt && (
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:4 }}>
                Last analysis: {new Date(analyzedAt).toLocaleString()}
              </div>
            )}
          </div>

          <button
            className="run-btn"
            onClick={handleRun}
            disabled={running}
            style={{
              display:"flex", alignItems:"center", gap:10, padding:"12px 24px",
              background: running ? "rgba(124,58,237,0.3)" : "linear-gradient(135deg,#1D4ED8,#7C3AED)",
              border:"none", borderRadius:12, color:"#fff", fontSize:14, fontWeight:700,
              cursor: running ? "not-allowed" : "pointer",
              boxShadow:"0 4px 20px rgba(59,130,246,0.3)",
              transition:"all .2s",
            }}
          >
            {running
              ? <><span style={{ width:18, height:18, border:"2px solid rgba(255,255,255,0.4)",
                  borderTopColor:"#fff", borderRadius:"50%", display:"inline-block",
                  animation:"spin 0.7s linear infinite" }} /> Analyzing all lights...</>
              : <><span style={{ fontSize:18 }}>▶</span> Run AI Analysis</>
            }
          </button>
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)",
            borderRadius:12, padding:"12px 16px", marginBottom:20, color:"#FCA5A5", fontSize:13 }}>
            ⚠ {error}
          </div>
        )}

        {/* ── Summary Cards ── */}
        {summary && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",
            gap:14, marginBottom:28, animation:"fadeIn .4s ease" }}>
            <SumCard icon="💡" label="Total Lights"    value={summary.total}        accent="#60A5FA" />
            <SumCard icon="✅" label="Normal"          value={summary.normal}       accent="#4ADE80" />
            <SumCard icon="🔆" label="Low Activity"    value={summary.low_activity}  accent="#FCD34D" />
            <SumCard icon="🚗" label="High Activity"   value={summary.high_activity} accent="#60A5FA" />
            <SumCard icon="⚠️" label="Under-Lit"       value={summary.under_lit}    accent="#FB923C" />
            <SumCard icon="🔴" label="Faulty/Offline"  value={summary.faulty}       accent="#F87171" />
            <SumCard icon="🔧" label="Tasks Created"   value={summary.tasks_created} accent="#A78BFA" />
            <SumCard icon="⚡" label="Avg Energy Save" value={`${summary.avg_energy_saved}%`} accent="#34D399" />
          </div>
        )}

        {/* ── AI Analysis Map ── */}
        {results.length > 0 && (
          <AIMap results={visible} onLightClick={(row) => setSelected(row)} />
        )}

        {/* ── How It Works ── (shown only before first run) */}
        {!summary && !loading && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",
            gap:14, marginBottom:28 }}>
            {[
              { icon:"🎯", title:"Dynamic Intensity", desc:"Adjusts brightness based on motion, traffic & time of day" },
              { icon:"🗺️", title:"Area Coverage",    desc:"Evaluates neighbouring lights to ensure uniform illumination" },
              { icon:"🔦", title:"Under-Lit Detection", desc:"Identifies zones with insufficient lighting despite max intensity" },
              { icon:"🏗️", title:"Infrastructure Rec.", desc:"Recommends new light installations where coverage is critical" },
              { icon:"⚡", title:"Fault Redistribution", desc:"Reroutes load to neighbouring lights when a unit fails" },
              { icon:"💰", title:"Energy Efficiency",  desc:"Continuously minimises wattage without compromising safety" },
            ].map(c => (
              <div key={c.title} style={{
                background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)",
                borderRadius:14, padding:"18px 16px",
              }}>
                <div style={{ fontSize:24, marginBottom:8 }}>{c.icon}</div>
                <div style={{ fontSize:13, fontWeight:700, color:"#E2E8F0", marginBottom:4 }}>{c.title}</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", lineHeight:1.5 }}>{c.desc}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Loading spinner ── */}
        {loading && !results.length && (
          <div style={{ textAlign:"center", padding:"60px 0", color:"rgba(255,255,255,0.35)" }}>
            <div style={{ width:40, height:40, border:"3px solid rgba(255,255,255,0.1)",
              borderTopColor:"#3B82F6", borderRadius:"50%", animation:"spin 0.8s linear infinite",
              margin:"0 auto 16px" }} />
            Loading previous results…
          </div>
        )}

        {/* ── Results table ── */}
        {results.length > 0 && (
          <div style={{ animation:"fadeIn .4s ease" }}>
            {/* Filters */}
            <div style={{
              background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)",
              borderRadius:14, padding:"16px 18px", marginBottom:16,
              display:"flex", flexWrap:"wrap", gap:16, alignItems:"center",
            }}>
              {/* Search */}
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search light / controller ID…"
                style={{
                  background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
                  borderRadius:8, padding:"7px 12px", color:"#fff", fontSize:13,
                  outline:"none", width:220,
                }}
              />
              <div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", marginBottom:5, letterSpacing:"0.06em" }}>STATUS</div>
                {pill(statuses, filterStatus, setFilterStatus)}
              </div>
              <div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", marginBottom:5, letterSpacing:"0.06em" }}>PRIORITY</div>
                {pill(priorities, filterPriority, setFilterPriority)}
              </div>
              <div style={{ marginLeft:"auto", fontSize:12, color:"rgba(255,255,255,0.35)" }}>
                Showing <strong style={{ color:"#fff" }}>{visible.length}</strong> / {results.length} lights
              </div>
            </div>

            {/* Table */}
            <div style={{
              background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)",
              borderRadius:16, overflow:"hidden",
            }}>
              {/* Table header */}
              <div style={{
                display:"grid",
                gridTemplateColumns:"140px 130px 110px 200px 100px 120px 100px 80px",
                padding:"12px 18px",
                background:"rgba(255,255,255,0.04)",
                borderBottom:"1px solid rgba(255,255,255,0.06)",
                fontSize:10, color:"rgba(255,255,255,0.35)",
                letterSpacing:"0.07em", fontWeight:700,
                gap:8,
              }}>
                <span>LIGHT ID</span>
                <span>CONTROLLER</span>
                <span>STATUS</span>
                <span>INTENSITY</span>
                <span>ACTION</span>
                <span>PRIORITY</span>
                <span>ENERGY SAVE</span>
                <span>TASK</span>
              </div>

              {/* Rows */}
              <div style={{ maxHeight:560, overflowY:"auto" }}>
                {visible.length === 0 && (
                  <div style={{ padding:40, textAlign:"center", color:"rgba(255,255,255,0.3)", fontSize:13 }}>
                    No lights match the current filters.
                  </div>
                )}
                {visible.map((row, i) => {
                  const sc = STATUS_CFG[row.status]    || STATUS_CFG["Normal"];
                  const pc = PRIORITY_CFG[row.priority] || PRIORITY_CFG["Low"];
                  return (
                    <div
                      key={row.light_id}
                      className="ai-row"
                      onClick={() => setSelected(row)}
                      style={{
                        display:"grid",
                        gridTemplateColumns:"140px 130px 110px 200px 100px 120px 100px 80px",
                        padding:"13px 18px",
                        borderBottom: i < visible.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                        alignItems:"center",
                        gap:8,
                        transition:"background .15s",
                      }}
                    >
                      {/* Light ID */}
                      <span style={{ fontSize:13, fontWeight:700, color:"#E2E8F0", fontFamily:"monospace" }}>
                        {row.light_id}
                      </span>

                      {/* Controller */}
                      <span style={{ fontSize:12, color:"rgba(255,255,255,0.45)", fontFamily:"monospace" }}>
                        {row.controller_id}
                      </span>

                      {/* Status badge */}
                      <div><Badge label={row.status} cfg={sc} /></div>

                      {/* Intensity bar */}
                      <div style={{ paddingRight:8 }}>
                        <IntensityBar value={row.current_intensity} recommended={row.recommended_intensity} />
                      </div>

                      {/* Action */}
                      <span style={{ fontSize:12, color:"#94A3B8" }}>
                        {ACTION_ICON[row.action]} {row.action.split(" ").slice(0, 2).join(" ")}
                      </span>

                      {/* Priority */}
                      <span style={{
                        fontSize:11, fontWeight:700, padding:"3px 9px", borderRadius:20,
                        background: pc.bg, color: pc.text, display:"inline-block",
                      }}>{row.priority}</span>

                      {/* Energy save */}
                      <span style={{ fontSize:13, fontWeight:700,
                        color: row.energy_saved_pct > 0 ? "#34D399" : "rgba(255,255,255,0.3)" }}>
                        {row.energy_saved_pct > 0 ? `↓ ${row.energy_saved_pct}%` : "—"}
                      </span>

                      {/* Task created */}
                      <span style={{ fontSize:12, color: row.task_created ? "#FCD34D" : "rgba(255,255,255,0.2)" }}>
                        {row.task_created ? "⚠ Yes" : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      <DetailDrawer row={selected} onClose={() => setSelected(null)} />
    </Layout>
  );
}
