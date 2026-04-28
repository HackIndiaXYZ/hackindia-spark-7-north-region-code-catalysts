import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import TechLayout from "../../components/Technician/TechLayout";
import { getTechFaultDetail, updateFaultStatus, submitRepair } from "../../services/api";

const STATUS_COLOR = { ON:"#10b981", IDLE:"#f59e0b", FAULT:"#ef4444", DAY_OFF:"#6b7280", OFFLINE:"#64748B" };

const openGoogleMaps = (lat, lng, label = "") => {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  window.open(url, "_blank");
};

const FAULT_LABELS = { BULB_FUSE:"💡 Lamp Failure", WIRE_CUT:"✂️ Wire Cut", LOW_CURRENT:"⚡ Power Issue", UNKNOWN:"❓ Unknown" };

const FlyTo = ({ center }) => {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 17, { duration: 0.8 }); }, [center]);
  return null;
};

const TechFaultDetail = () => {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [detail,  setDetail]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [showForm,setShowForm]= useState(false);
  const [form, setForm] = useState({ notes:"", parts_used:"", action_taken:"" });

  const load = async () => {
    try { const r = await getTechFaultDetail(id); setDetail(r.data.data); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const fault = detail?.fault || {};
  const light = detail?.light || {};
  const mapCenter = fault.location?.lat && fault.location?.lng
    ? [fault.location.lat, fault.location.lng] : null;

  const handleStatus = async (status) => {
    setSaving(true);
    try { await updateFaultStatus(id, { status }); await load(); }
    catch {} finally { setSaving(false); }
  };

  const handleRepairSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await submitRepair(id, form); await load(); setShowForm(false); }
    catch {} finally { setSaving(false); }
  };

  const repairStatus = fault.repair_status || "Pending";

  return (
    <TechLayout title="Fault Details">
      <button onClick={() => navigate("/tech/faults")}
        className="text-xs font-bold mb-5 flex items-center gap-1 transition-colors"
        style={{ color: "#475569" }}
        onMouseEnter={e => e.currentTarget.style.color = "#2563EB"}
        onMouseLeave={e => e.currentTarget.style.color = "#475569"}>
        ← Back to Faults
      </button>

      {loading ? (
        <div className="grid grid-cols-3 gap-5">
          {[...Array(3)].map((_,i) => <div key={i} className="h-64 rounded-2xl animate-pulse" style={{ background: "#E5DDD0" }}/>)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
            {/* Fault Info */}
            <div className="rounded-2xl p-5 fade-up" style={{ background: "#FEFCF7", border: "1px solid #E5DDD0", boxShadow: "0 1px 4px rgba(100,80,50,0.08)" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: "#F5EFE4", border: "1px solid #E5DDD0" }}>⚠️</div>
                <div>
                  <h2 className="font-bold text-lg mono" style={{ color: "#0F172A" }}>{fault.light_id}</h2>
                  <span className="px-2 py-0.5 rounded text-xs font-bold" style={{
                    background: repairStatus === "In Progress" ? "#FFFBEB" : (repairStatus === "Resolved" ? "#ECFDF5" : "#F8FAFC"),
                    color: repairStatus === "In Progress" ? "#92400E" : (repairStatus === "Resolved" ? "#065F46" : "#475569"),
                    border: `1px solid ${repairStatus === "In Progress" ? "#FDE68A" : (repairStatus === "Resolved" ? "#A7F3D0" : "#E2E8F0")}`
                  }}>{repairStatus}</span>
                </div>
              </div>
              <div className="space-y-0">
                {[
                  { label:"Light ID",       val: fault.light_id },
                  { label:"Controller",     val: fault.controller_id },
                  { label:"Location",       val: fault.location?.address || fault.city },
                  { label:"Fault Type",     val: FAULT_LABELS[fault.fault_type] || fault.fault_type },
                  { label:"Detected At",    val: new Date(fault.fault_time).toLocaleString("en-IN") },
                  { label:"Current Value",  val: `${fault.current_at_fault} A` },
                  { label:"Assigned To",    val: fault.assigned_to || "Not assigned" },
                  { label:"Last Update",    val: light.last_updated ? new Date(light.last_updated).toLocaleString("en-IN") : "—" },
                ].map((r) => (
                  <div key={r.label} className="flex justify-between border-b py-2 text-sm" style={{ borderColor: "#EDE8DC" }}>
                    <span style={{ color: "#64748B" }}>{r.label}</span>
                    <span className="mono font-semibold text-right max-w-32 truncate" style={{ color: "#0F172A" }}>{r.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Map */}
            <div className="rounded-2xl overflow-hidden fade-up" style={{ background: "#FEFCF7", border: "1px solid #E5DDD0", boxShadow: "0 1px 4px rgba(100,80,50,0.08)", animationDelay:"0.1s" }}>
              <div className="px-4 py-2 border-b flex items-center justify-between" style={{ borderColor: "#E5DDD0", background: "#F8F3E8" }}>
                <span className="font-semibold text-sm" style={{ color: "#0F172A" }}>📍 Exact Location</span>
                <span className="text-xs mono truncate ml-2" style={{ color: "#64748B" }}>{fault.location?.address || ""}</span>
              </div>
              <div style={{ height:"280px" }}>
                {!mapCenter ? (
                  <div className="h-full flex items-center justify-center text-sm" style={{ color: "#94A3B8" }}>Location data unavailable</div>
                ) : (
                  <MapContainer center={mapCenter} zoom={17} style={{ height:"100%", width:"100%" }} zoomControl={true}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                    <FlyTo center={mapCenter} />
                    <CircleMarker center={mapCenter} radius={14}
                      pathOptions={{ color:"#ef4444", fillColor:"#ef4444", fillOpacity:0.9, weight:3 }}>
                      <Popup>
                        <div style={{ fontSize:"11px" }}>
                          <div style={{ fontWeight:"bold" }}>{fault.light_id} — FAULT</div>
                          <div>{fault.location?.address}</div>
                          <div>{FAULT_LABELS[fault.fault_type]}</div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  </MapContainer>
                )}
              </div>
              {/* Google Maps Navigate Button */}
              {mapCenter && (
                <button
                  onClick={() => openGoogleMaps(mapCenter[0], mapCenter[1], fault.light_id)}
                  className="w-full py-2.5 text-white text-sm font-bold flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                  style={{ background:"linear-gradient(135deg,#1a73e8,#0d5bba)" }}>
                  <span>🗺️</span>
                  <span>Google Maps mein Navigate karo</span>
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 fade-up" style={{ animationDelay:"0.2s" }}>
              <div className="rounded-2xl p-5" style={{ background: "#FEFCF7", border: "1px solid #E5DDD0", boxShadow: "0 1px 4px rgba(100,80,50,0.08)" }}>
                <h3 className="font-bold text-sm mb-4" style={{ color: "#0F172A" }}>Actions</h3>

                {/* Status Flow */}
                <div className="space-y-2 mb-4">
                  <div className="text-xs uppercase tracking-wider mb-2 font-bold" style={{ color: "#64748B" }}>Repair Status</div>
                  {[
                    { label:"▶ Start Repair",   status:"In Progress", show: repairStatus==="Pending",     cls:"bg-blue-700 hover:bg-blue-600" },
                    { label:"✓ Mark Fixed",      status:"Resolved",    show: repairStatus==="In Progress", cls:"bg-green-700 hover:bg-green-600" },
                  ].filter(b => b.show).map((b) => (
                    <button key={b.status} onClick={() => handleStatus(b.status)} disabled={saving}
                      className={`w-full py-2.5 ${b.cls} text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50`}>
                      {saving ? "Updating..." : b.label}
                    </button>
                  ))}

                  {repairStatus === "Resolved" && (
                    <div className="w-full py-2.5 bg-gray-800 text-green-400 rounded-lg text-sm font-bold text-center">
                      ✅ Fault Resolved
                    </div>
                  )}
                </div>

                {/* Submit Repair Report */}
                {repairStatus !== "Resolved" && (
                  <button onClick={() => setShowForm(!showForm)}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors">
                    📋 {showForm ? "Cancel Report" : "Submit Repair Report"}
                  </button>
                )}
              </div>

              {/* Light Current Info */}
              {light && (
                <div className="rounded-2xl p-4" style={{ background: "#FEFCF7", border: "1px solid #E5DDD0", boxShadow: "0 1px 4px rgba(100,80,50,0.08)" }}>
                  <h4 className="font-bold text-xs uppercase tracking-wider mb-3" style={{ color: "#0F172A" }}>Current Light State</h4>
                  {[
                    { label:"Status",   val: light.current_status },
                    { label:"Current",  val: `${light.current_usage || 0} A` },
                    { label:"Motion",   val: light.motion_detected ? "Detected" : "None" },
                  ].map((r) => (
                    <div key={r.label} className="flex justify-between text-xs border-b py-1.5" style={{ borderColor: "#EDE8DC" }}>
                      <span style={{ color: "#64748B" }}>{r.label}</span>
                      <span className="mono font-bold" style={{ color: "#0F172A" }}>{r.val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Repair Report Form */}
          {showForm && (
            <div className="rounded-2xl p-6 fade-up" style={{ background: "#FEFCF7", border: "1px solid #E5DDD0", boxShadow: "0 1px 4px rgba(100,80,50,0.08)" }}>
              <h3 className="font-bold mb-4" style={{ color: "#0F172A" }}>📋 Repair Report</h3>
              <form onSubmit={handleRepairSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {[
                    { name:"notes",        label:"Repair Notes",  ph:"Describe the problem details...",   rows:3 },
                    { name:"action_taken", label:"Action Taken",  ph:"Actions taken e.g. Bulb replaced", rows:3 },
                  ].map((f) => (
                    <div key={f.name}>
                      <label className="block text-xs uppercase tracking-wider mb-2 font-bold" style={{ color: "#475569" }}>{f.label}</label>
                      <textarea name={f.name} rows={f.rows} placeholder={f.ph} required
                        value={form[f.name]}
                        onChange={(e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }))}
                        className="w-full rounded-lg px-3 py-2 text-sm mono focus:outline-none resize-none transition-colors"
                        style={{ background: "#F8F3E8", border: "1px solid #E5DDD0", color: "#0F172A" }}
                        onFocus={e => e.target.style.borderColor="#2563EB"}
                        onBlur={e => e.target.style.borderColor="#E5DDD0"}
                      />
                    </div>
                  ))}
                </div>
                <div className="mb-4">
                  <label className="block text-xs uppercase tracking-wider mb-2 font-bold" style={{ color: "#475569" }}>Parts Used</label>
                  <input name="parts_used" type="text" placeholder="e.g. LED Bulb 40W, Connector wire"
                    value={form.parts_used}
                    onChange={(e) => setForm(p => ({ ...p, parts_used: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm mono focus:outline-none transition-colors"
                    style={{ background: "#F8F3E8", border: "1px solid #E5DDD0", color: "#0F172A" }}
                    onFocus={e => e.target.style.borderColor="#2563EB"}
                    onBlur={e => e.target.style.borderColor="#E5DDD0"}
                  />
                </div>
                <button type="submit" disabled={saving}
                  className="px-6 py-2.5 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50">
                  {saving ? "Submitting..." : "✓ Submit Repair Report"}
                </button>
              </form>
            </div>
          )}

          {/* Show submitted repair notes if exists */}
          {fault.repair_notes && (
            <div className="rounded-2xl p-5 mt-4" style={{ background: "#FEFCF7", border: "1px solid #E5DDD0", boxShadow: "0 1px 4px rgba(100,80,50,0.08)" }}>
              <h3 className="font-bold text-sm mb-3" style={{ color: "#0F172A" }}>📋 Repair Report Submitted</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label:"Notes",        val: fault.repair_notes   },
                  { label:"Action Taken", val: fault.action_taken   },
                  { label:"Parts Used",   val: fault.parts_used || "—" },
                ].map((r) => (
                  <div key={r.label} className="rounded-lg p-3" style={{ background: "#F8F3E8", border: "1px solid #E5DDD0" }}>
                    <div className="text-xs mb-1 font-bold" style={{ color: "#64748B" }}>{r.label}</div>
                    <div className="text-sm font-semibold" style={{ color: "#0F172A" }}>{r.val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </TechLayout>
  );
};

export default TechFaultDetail;