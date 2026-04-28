import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import TechLayout from "../../components/Technician/TechLayout";
import { getTechMapData } from "../../services/api";

const FAULT_LABELS = { BULB_FUSE:"💡 Lamp Failure", WIRE_CUT:"✂️ Wire Cut", LOW_CURRENT:"⚡ Power Issue", UNKNOWN:"❓ Unknown" };

const STATUS_COLOR = { ON:"#10b981", IDLE:"#f59e0b", FAULT:"#ef4444", DAY_OFF:"#6b7280", OFFLINE:"#64748B" };
const STATUS_LABEL = { ON:"🟢 Active", IDLE:"🟡 Idle", FAULT:"🔴 Fault", DAY_OFF:"⚫ Day Off", OFFLINE:"⚫ Offline" };

const geocodeCity = async (cityName) => {
  try {
    const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1`, { headers: { "Accept-Language": "en" } });
    const data = await res.json();
    if (data?.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch {}
  return null;
};

const openGoogleMaps = (lat, lng) => {
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, "_blank");
};

const FlyTo = ({ center }) => {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 14, { duration: 1.2 }); }, [center]);
  return null;
};

const TechMap = () => {
  const navigate = useNavigate();
  const [lights,     setLights]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState(null);
  const [cityCenter, setCityCenter] = useState(null);
  const [filter,     setFilter]     = useState("ALL"); // ALL | FAULT | ON | IDLE | DAY_OFF
  const tech = JSON.parse(localStorage.getItem("admin") || "{}");

  useEffect(() => {
    const load = async () => {
      try {
        const r = await getTechMapData();
        setLights(r.data.data.lights);
      } catch {}
      finally { setLoading(false); }
    };
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  // Geocode technician's city
  useEffect(() => {
    if (tech?.city) {
      geocodeCity(tech.city).then(coords => { if (coords) setCityCenter(coords); });
    }
  }, [tech?.city]);

  // Filter lights with location
  const lightsWithLocation = lights.filter(l => l.location?.lat && l.location?.lng);
  const filtered = filter === "ALL" ? lightsWithLocation : lightsWithLocation.filter(l => l.current_status === filter);

  // Get marker color — if light has active fault, show red regardless
  const getColor = (l) => {
    if (l.fault) {
      if (l.fault.repair_status === "In Progress") return "#f59e0b";
      return "#ef4444";
    }
    return STATUS_COLOR[l.current_status] || "#6b7280";
  };

  const getRadius = (l) => l.current_status === "FAULT" || l.fault ? 12 : 8;

  const defaultCenter = cityCenter || [28.6139, 77.2090];

  // Stats
  const counts = {
    total:   lightsWithLocation.length,
    on:      lightsWithLocation.filter(l => l.current_status === "ON").length,
    fault:   lightsWithLocation.filter(l => l.current_status === "FAULT" || l.fault).length,
    idle:    lightsWithLocation.filter(l => l.current_status === "IDLE").length,
    dayOff:  lightsWithLocation.filter(l => l.current_status === "DAY_OFF").length,
    offline: lightsWithLocation.filter(l => l.current_status === "OFFLINE").length,
  };

  return (
    <TechLayout title="Map View">
      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { key:"ALL",     label:`All (${counts.total})`,      cls:"bg-gray-700 text-white"        },
          { key:"ON",      label:`🟢 Active (${counts.on})`,   cls:"bg-green-900 text-green-400"   },
          { key:"FAULT",   label:`🔴 Fault (${counts.fault})`, cls:"bg-red-900 text-red-400"       },
          { key:"IDLE",    label:`🟡 Idle (${counts.idle})`,   cls:"bg-yellow-900 text-yellow-400" },
          { key:"DAY_OFF", label:`⚫ Day Off (${counts.dayOff})`, cls:"bg-gray-800 text-gray-400"  },
          { key:"OFFLINE", label:`⚫ Offline (${counts.offline})`, cls:"bg-slate-800 text-slate-400" },
        ].map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${filter===f.key ? f.cls+" border-current" : "border-gray-700 text-gray-500 hover:border-gray-500"}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Map */}
        <div className="lg:col-span-3 card overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor:"#162844" }}>
            <span className="text-white font-semibold text-sm">🗺️ {tech?.city} — {filtered.length} lights</span>
            <div className="flex gap-3 text-xs mono">
              <span className="flex items-center gap-1"><span style={{color:"#10b981"}}>●</span> ON</span>
              <span className="flex items-center gap-1"><span style={{color:"#f59e0b"}}>●</span> Idle/In Progress</span>
              <span className="flex items-center gap-1"><span style={{color:"#ef4444"}}>●</span> Fault</span>
              <span className="flex items-center gap-1"><span style={{color:"#6b7280"}}>●</span> Day Off</span>
              <span className="flex items-center gap-1"><span style={{color:"#64748b"}}>●</span> Offline</span>
            </div>
          </div>
          <div style={{ height:"520px" }}>
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-500 mono text-sm animate-pulse">
                Map load ho raha hai...
              </div>
            ) : (
              <MapContainer center={defaultCenter} zoom={14} style={{ height:"100%", width:"100%" }}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="&copy; CARTO" />
                {cityCenter && <FlyTo center={cityCenter} />}
                {filtered.map((l) => (
                  <CircleMarker key={l.light_id}
                    center={[l.location.lat, l.location.lng]}
                    radius={getRadius(l)}
                    pathOptions={{ color: getColor(l), fillColor: getColor(l), fillOpacity: 0.9, weight: l.fault ? 3 : 1.5 }}
                    eventHandlers={{ click: () => setSelected(l) }}>
                    <Popup>
                      <div style={{ fontSize:"11px", fontFamily:"monospace", minWidth:"160px" }}>
                        <div style={{ fontWeight:"bold", fontSize:"12px", marginBottom:"4px" }}>{l.light_id}</div>
                        <div style={{ color: getColor(l), fontWeight:"bold", marginBottom:"4px" }}>
                          {STATUS_LABEL[l.current_status]}
                          {l.fault && ` — ${FAULT_LABELS[l.fault.fault_type]}`}
                        </div>
                        <div style={{ color:"#94a3b8", marginBottom:"2px" }}>📍 {l.location?.address || tech?.city}</div>
                        {l.fault && (
                          <div style={{ color:"#f59e0b", marginBottom:"6px" }}>
                            👤 {l.fault.assigned_to || "Unassigned"}
                          </div>
                        )}
                        {/* Google Maps Button */}
                        <button
                          onClick={() => openGoogleMaps(l.location.lat, l.location.lng)}
                          style={{ background:"#1a73e8", color:"white", border:"none", borderRadius:"6px", padding:"5px 8px", fontSize:"10px", fontWeight:"bold", cursor:"pointer", width:"100%", marginTop:"4px" }}>
                          🗺️ Google Maps Navigate
                        </button>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            )}
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-3">
          {/* Selected Light Info */}
          {!selected ? (
            <div className="card p-5 text-center text-gray-500 text-sm" style={{ minHeight:"180px" }}>
              <div className="text-3xl mb-2 mt-6">📍</div>
              Map par kisi light par click karo
            </div>
          ) : (
            <div className="card p-4 fade-up">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-bold text-sm">{selected.light_id}</h3>
                <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white text-sm">✕</button>
              </div>
              <div className="space-y-1.5 text-xs mb-3">
                {[
                  { label:"Status",      val: selected.current_status, color: STATUS_COLOR[selected.current_status] },
                  { label:"Controller",  val: selected.controller_id },
                  { label:"Location",    val: selected.location?.address || tech?.city },
                  { label:"Current",     val: `${selected.current_usage || 0} A` },
                  { label:"Motion",      val: selected.motion_detected ? "Detected" : "None" },
                  ...(selected.fault ? [
                    { label:"Fault",     val: FAULT_LABELS[selected.fault.fault_type], color:"#ef4444" },
                    { label:"Assigned",  val: selected.fault.assigned_to || "Unassigned", color:"#f59e0b" },
                  ] : []),
                ].map((r) => (
                  <div key={r.label} className="flex justify-between border-b py-1" style={{ borderColor:"#162844" }}>
                    <span className="text-gray-500">{r.label}</span>
                    <span className="font-bold mono" style={{ color: r.color || "#e2e8f0" }}>{r.val}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {/* Google Maps */}
                <button onClick={() => openGoogleMaps(selected.location.lat, selected.location.lng)}
                  className="w-full py-2 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
                  style={{ background:"linear-gradient(135deg,#1a73e8,#0d5bba)" }}>
                  🗺️ Google Maps Navigate
                </button>
                {/* View fault detail if fault exists */}
                {selected.fault && (
                  <button onClick={() => navigate(`/tech/faults/${selected.fault._id}`)}
                    className="w-full py-2 bg-yellow-700 hover:bg-yellow-600 text-white rounded-lg text-xs font-bold transition-colors">
                    View Fault Details →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="card p-4">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">Legend</h4>
            {[
              { color:"#10b981", label:"Active (ON)" },
              { color:"#ef4444", label:"Fault (Unassigned)" },
              { color:"#f59e0b", label:"In Progress / Idle" },
              { color:"#6b7280", label:"Day OFF" },
              { color:"#64748B", label:"Offline" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-2 py-1.5 text-xs">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background:l.color }}/>
                <span className="text-gray-400">{l.label}</span>
              </div>
            ))}
          </div>

          {/* City Stats */}
          <div className="card p-4">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">City Stats</h4>
            {[
              { label:"Total Lights", val: counts.total,  color:"text-blue-400"  },
              { label:"Active (ON)",  val: counts.on,     color:"text-green-400" },
              { label:"Faults",       val: counts.fault,  color:"text-red-400"   },
              { label:"Idle",         val: counts.idle,   color:"text-yellow-400"},
              { label:"Day OFF",      val: counts.dayOff, color:"text-gray-400"  },
              { label:"Offline",      val: counts.offline,color:"text-slate-400" },
            ].map((s) => (
              <div key={s.label} className="flex justify-between text-xs border-b py-1.5" style={{ borderColor:"#162844" }}>
                <span className="text-gray-500">{s.label}</span>
                <span className={`${s.color} mono font-bold`}>{s.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </TechLayout>
  );
};

export default TechMap;
