import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { getMapData } from "../../services/api";

const STATUS_COLOR = { ON:"#10b981", IDLE:"#f59e0b", FAULT:"#ef4444", DAY_OFF:"#6b7280", OFFLINE:"#64748B" };

const isValidLatLng = (lat, lng) =>
  typeof lat === "number" && typeof lng === "number" &&
  isFinite(lat) && isFinite(lng) &&
  lat !== 0 && lng !== 0;

const MapController = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center && isValidLatLng(center[0], center[1])) {
      map.flyTo(center, zoom || 14, { duration: 1.2 });
    }
  }, [center]);
  return null;
};

const geocodeCity = async (cityName) => {
  try {
    const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1`, { headers: { "Accept-Language": "en" } });
    const data = await res.json();
    if (data?.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch {}
  return null;
};

const LiveMap = ({ city, height = "360px", onLightClick }) => {
  const [lights,    setLights]    = useState([]);
  const [mapCenter, setMapCenter] = useState([28.6139, 77.2090]);
  const [mapZoom,   setMapZoom]   = useState(13);
  const [loading,   setLoading]   = useState(true);
  const prevCity = useRef("");

  useEffect(() => {
    if (!city || city === prevCity.current) return;
    prevCity.current = city;
    geocodeCity(city).then((c) => { if (c) { setMapCenter(c); setMapZoom(13); } });
  }, [city]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await getMapData(city);
        setLights(data.data);
        // Only use lights with valid numeric coordinates for centering
        const validLights = (data.data || []).filter(l =>
          isValidLatLng(l.location?.lat, l.location?.lng)
        );
        if (validLights.length > 0) {
          const lat = validLights.reduce((s, l) => s + l.location.lat, 0) / validLights.length;
          const lng = validLights.reduce((s, l) => s + l.location.lng, 0) / validLights.length;
          if (isValidLatLng(lat, lng)) {
            setMapCenter([lat, lng]); setMapZoom(14);
          }
        }
      } catch {}
      finally { setLoading(false); }
    };
    fetch();
    const t = setInterval(fetch, 5000);
    return () => clearInterval(t);
  }, [city]);

  return (
    <div className="card overflow-hidden rounded-2xl">
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor:"rgba(22,40,68,0.6)" }}>
        <div className="flex items-center gap-2">
          <span className="text-blue-400">🗺️</span>
          <span className="font-semibold text-white text-sm">City Map View — {city}</span>
        </div>
        <div className="flex gap-4 text-xs mono">
          {[
            { label: "Active", color: "#10b981" },
            { label: "Faulty", color: "#ef4444" },
            { label: "Offline", color: "#f59e0b" },
          ].map(item => (
            <span key={item.label} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" 
                style={{ background: item.color, boxShadow: `0 0 6px ${item.color}60` }}></span>
              <span className="text-gray-400">{item.label}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="relative" style={{ height }}>
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center" 
            style={{background:"rgba(10,22,40,0.9)", backdropFilter: 'blur(4px)'}}>
            <div className="text-center">
              <div className="w-8 h-8 border-3 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-3"></div>
              <span className="text-blue-400 mono text-sm">Loading map...</span>
            </div>
          </div>
        )}
        <MapContainer center={mapCenter} zoom={mapZoom} style={{ height:"100%", width:"100%" }}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' />
          <MapController center={mapCenter} zoom={mapZoom} />
          {lights
            .filter((l) => l.location && typeof l.location.lat === "number" && typeof l.location.lng === "number")
            .map((l) => (
            <CircleMarker key={l.light_id} center={[l.location.lat, l.location.lng]}
              radius={l.current_status === "FAULT" ? 10 : 7}
              pathOptions={{ color: STATUS_COLOR[l.current_status]||"#6b7280", fillColor: STATUS_COLOR[l.current_status]||"#6b7280", fillOpacity:0.9, weight: l.current_status==="FAULT"?3:1.5 }}
              eventHandlers={{ click: () => onLightClick && onLightClick(l) }}
            >
              <Popup>
                <div style={{fontSize:"11px"}}>
                  <div style={{fontWeight:"bold",marginBottom:"4px"}}>{l.light_id}</div>
                  <div>Status: <span style={{color:STATUS_COLOR[l.current_status],fontWeight:600}}>{l.current_status}</span></div>
                  <div>Controller: {l.controller_id}</div>
                  <div>Motion: {l.motion_detected?"✅ Yes":"❌ No"}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default LiveMap;
