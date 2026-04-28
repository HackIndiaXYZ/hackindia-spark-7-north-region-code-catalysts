import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";

// Color map matching AI status categories
const STATUS_MAP_COLOR = {
  "Normal":        "#22C55E",
  "Low Activity":  "#EAB308",
  "High Activity": "#3B82F6",
  "Under-Lit":     "#F97316",
  "Faulty":        "#EF4444",
  "Offline":       "#DC2626",
};

const LEGEND_ITEMS = [
  { status: "Normal",        label: "Normal",         color: "#22C55E", icon: "✅" },
  { status: "Low Activity",  label: "Low Intensity",  color: "#EAB308", icon: "🔅" },
  { status: "High Activity", label: "High Intensity", color: "#3B82F6", icon: "🔆" },
  { status: "Under-Lit",     label: "Install New Light", color: "#F97316", icon: "💡" },
  { status: "Faulty",        label: "Faulty",         color: "#EF4444", icon: "🔧" },
  { status: "Offline",       label: "Offline",        color: "#DC2626", icon: "⚡" },
];

const isValid = (lat, lng) =>
  typeof lat === "number" && typeof lng === "number" &&
  isFinite(lat) && isFinite(lng) && lat !== 0 && lng !== 0;

const MapFly = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center && isValid(center[0], center[1])) {
      map.flyTo(center, zoom || 14, { duration: 1 });
    }
  }, [center, zoom]);
  return null;
};

export default function AIMap({ results, onLightClick }) {
  const [activeFilters, setActiveFilters] = useState(() => {
    const m = {};
    LEGEND_ITEMS.forEach(l => { m[l.status] = true; });
    return m;
  });

  const toggle = (status) => setActiveFilters(prev => ({ ...prev, [status]: !prev[status] }));

  const lightsWithCoords = useMemo(() =>
    (results || []).filter(r => r.location && isValid(r.location.lat, r.location.lng)),
    [results]
  );

  const filtered = useMemo(() =>
    lightsWithCoords.filter(r => activeFilters[r.status] !== false),
    [lightsWithCoords, activeFilters]
  );

  const center = useMemo(() => {
    if (!lightsWithCoords.length) return [21.1702, 72.8311]; // Surat default
    const lat = lightsWithCoords.reduce((s, l) => s + l.location.lat, 0) / lightsWithCoords.length;
    const lng = lightsWithCoords.reduce((s, l) => s + l.location.lng, 0) / lightsWithCoords.length;
    return [lat, lng];
  }, [lightsWithCoords]);

  const counts = useMemo(() => {
    const c = {};
    LEGEND_ITEMS.forEach(l => { c[l.status] = 0; });
    lightsWithCoords.forEach(r => { if (c[r.status] !== undefined) c[r.status]++; });
    return c;
  }, [lightsWithCoords]);

  if (!results || !results.length) return null;

  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 16, overflow: "hidden", marginBottom: 20,
      animation: "fadeIn .4s ease",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap", gap: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>🗺️</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>AI Analysis Map</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginLeft: 4 }}>
            {filtered.length} / {lightsWithCoords.length} lights shown
          </span>
        </div>
      </div>

      {/* Legend / Filter toggles */}
      <div style={{
        padding: "10px 18px", display: "flex", gap: 8, flexWrap: "wrap",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        background: "rgba(255,255,255,0.02)",
      }}>
        {LEGEND_ITEMS.map(item => {
          const active = activeFilters[item.status] !== false;
          return (
            <button
              key={item.status}
              onClick={() => toggle(item.status)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                cursor: "pointer", transition: "all .15s",
                border: active ? `1px solid ${item.color}60` : "1px solid rgba(255,255,255,0.08)",
                background: active ? `${item.color}18` : "rgba(255,255,255,0.03)",
                color: active ? item.color : "rgba(255,255,255,0.3)",
                opacity: active ? 1 : 0.5,
              }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: active ? item.color : "rgba(255,255,255,0.2)",
                boxShadow: active ? `0 0 6px ${item.color}80` : "none",
                flexShrink: 0,
              }} />
              {item.icon} {item.label}
              <span style={{
                fontSize: 10, fontWeight: 800,
                color: active ? item.color : "rgba(255,255,255,0.2)",
                marginLeft: 2,
              }}>
                {counts[item.status] || 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Map */}
      <div style={{ height: 480, position: "relative" }}>
        <MapContainer center={center} zoom={14} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; CARTO'
          />
          <MapFly center={center} zoom={14} />
          {filtered.map(row => {
            const color = STATUS_MAP_COLOR[row.status] || "#6b7280";
            const isSpecial = row.status === "Under-Lit" || row.status === "Faulty" || row.status === "Offline";
            return (
              <CircleMarker
                key={row.light_id}
                center={[row.location.lat, row.location.lng]}
                radius={isSpecial ? 10 : 7}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: 0.85,
                  weight: isSpecial ? 2.5 : 1.5,
                }}
                eventHandlers={{ click: () => onLightClick && onLightClick(row) }}
              >
                <Popup>
                  <div style={{ fontSize: 11, lineHeight: 1.6, minWidth: 180 }}>
                    <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4, color: "#1a1a2e" }}>
                      {row.light_id}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: "50%", background: color,
                        display: "inline-block", flexShrink: 0,
                      }} />
                      <strong style={{ color }}>{row.status}</strong>
                    </div>
                    <div>🎯 Action: <strong>{row.action}</strong></div>
                    <div>💡 Current: <strong>{row.current_intensity}%</strong> → Target: <strong>{row.recommended_intensity}%</strong></div>
                    {row.energy_saved_pct > 0 && (
                      <div style={{ color: "#16a34a" }}>⚡ {row.energy_saved_pct}% energy saving</div>
                    )}
                    <div style={{ fontSize: 10, color: "#666", marginTop: 4 }}>
                      📍 {row.location.lat.toFixed(5)}, {row.location.lng.toFixed(5)}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
