import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Sidebar/Layout";
import LiveMap from "../components/Dashboard/LiveMap";

const MapPage = () => {
  const navigate = useNavigate();
  const admin = JSON.parse(localStorage.getItem("admin") || "{}");
  const [selectedLight, setSelectedLight] = useState(null);

  const STATUS_COLOR = { ON: "#10b981", IDLE: "#f59e0b", FAULT: "#ef4444", DAY_OFF: "#6b7280", OFFLINE: "#64748B" };

  return (
    <Layout title="Live Map Monitoring">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="lg:col-span-3 fade-up">
          <LiveMap city={admin.city} height="560px" onLightClick={(l) => setSelectedLight(l)} />
        </div>

        {/* Info Panel */}
        <div className="space-y-4">
          {selectedLight ? (
            <div className="card p-5 rounded-2xl scale-in">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full"
                  style={{
                    background: STATUS_COLOR[selectedLight.current_status],
                    boxShadow: `0 0 8px ${STATUS_COLOR[selectedLight.current_status]}60`,
                  }}></span>
                Light Info
              </h3>
              <div className="space-y-2 text-xs">
                {[
                  { label: "ID", val: selectedLight.light_id },
                  { label: "Status", val: selectedLight.current_status, color: STATUS_COLOR[selectedLight.current_status] },
                  { label: "Controller", val: selectedLight.controller_id },
                  { label: "Location", val: selectedLight.location?.address || "—" },
                  { label: "Last Update", val: new Date(selectedLight.last_updated).toLocaleTimeString() },
                ].map((r) => (
                  <div key={r.label} className="flex justify-between border-b py-2 hover:bg-blue-950/10 px-1 -mx-1 rounded transition-all duration-200" style={{ borderColor: "rgba(22,40,68,0.5)" }}>
                    <span className="text-zinc-500">{r.label}</span>
                    <span style={r.color ? { color: r.color, textShadow: `0 0 8px ${r.color}40` } : {}} className="text-zinc-800 mono font-bold">{r.val}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate(`/lights/${selectedLight.light_id}`)}
                className="w-full mt-4 py-2.5 text-white rounded-xl text-xs font-bold transition-all duration-300 btn-ripple"
                style={{
                  background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
                  boxShadow: '0 4px 15px rgba(59,130,246,0.25)',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 25px rgba(59,130,246,0.4)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 15px rgba(59,130,246,0.25)'}>
                View Full Details →
              </button>
            </div>
          ) : (
            <div className="card p-6 text-center text-gray-500 text-sm rounded-2xl fade-up">
              <div className="text-3xl mb-2 float-anim">📍</div>
              Click on any pin on the map
            </div>
          )}

          {/* Legend */}
          <div className="card p-4 rounded-2xl fade-up" style={{ animationDelay: '0.1s' }}>
            <h4 className="text-white font-bold text-xs mb-3 uppercase tracking-wider flex items-center gap-2">
              <span>🎨</span> Legend
            </h4>
            {[
              { label: "Active (Motion ON)", color: "#10b981" },
              { label: "IDLE (No Motion)", color: "#f59e0b" },
              { label: "FAULT", color: "#ef4444" },
              { label: "Day OFF", color: "#6b7280" },
              { label: "OFFLINE", color: "#64748B" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-2 py-1.5 text-xs group hover:bg-blue-950/10 px-1 -mx-1 rounded transition-all duration-200">
                <div className="w-3 h-3 rounded-full transition-all duration-300 group-hover:scale-125"
                  style={{
                    background: l.color,
                    boxShadow: `0 0 6px ${l.color}40`,
                  }} />
                <span className="text-gray-400 group-hover:text-gray-300 transition-colors">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MapPage;
