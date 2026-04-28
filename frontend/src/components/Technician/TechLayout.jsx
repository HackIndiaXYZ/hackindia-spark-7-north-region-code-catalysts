import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const NAV = [
  { icon: "⊞",  label: "Dashboard",      path: "/tech/dashboard"      },
  { icon: "⚠️", label: "Assigned Faults", path: "/tech/faults"         },
  { icon: "🗺️", label: "Map View",        path: "/tech/map"            },
  { icon: "📋", label: "Repair History",  path: "/tech/history"        },
  { icon: "🔔", label: "Notifications",   path: "/tech/notifications"  },
  { icon: "👤", label: "My Profile",      path: "/tech/profile"        },
];

const TechLayout = ({ children, title }) => {
  const navigate     = useNavigate();
  const location     = useLocation();
  const { pathname } = location;
  const tech = JSON.parse(localStorage.getItem("admin") || "{}");
  const [pageKey, setPageKey] = useState(0);
  const [time, setTime] = useState(new Date());

  useEffect(() => { setPageKey(prev => prev + 1); }, [pathname]);
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("admin");
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen relative grid-bg">
      {/* Sidebar */}
      <aside className="w-60 min-h-screen flex flex-col slide-left" 
        style={{ 
          background: "linear-gradient(180deg, #0C1E3C 0%, #0A1730 100%)", 
          borderRight: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "4px 0 24px rgba(0,0,0,0.15)",
        }}>
        <div className="p-5 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl float-anim" 
              style={{ 
                background: "linear-gradient(135deg, #1D4ED8, #3B82F6)",
                boxShadow: '0 4px 15px rgba(37,99,235,0.3)',
              }}>🔧</div>
            <div>
              <div className="text-white font-bold text-sm leading-none">Technician</div>
              <div className="text-blue-200 text-xs mono mt-0.5" style={{ opacity: 0.8 }}>{tech?.city || "..."}</div>
            </div>
          </div>
        </div>

        <div className="px-5 pt-4 pb-1">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>Navigation</span>
        </div>

        <nav className="flex-1 px-3 pb-3 space-y-0.5">
          {NAV.map((item, idx) => (
            <button key={item.path} onClick={() => navigate(item.path)}
              className={`sidebar-link w-full text-left ${pathname === item.path ? "active" : ""}`}
              style={{ animationDelay: `${idx * 0.04}s` }}>
              <span className="text-base" style={{ minWidth: '24px', textAlign: 'center' }}>{item.icon}</span>
              <span>{item.label}</span>
              {pathname === item.path && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full" 
                  style={{ background: "#3B82F6", boxShadow: "0 0 6px #3B82F6" }} />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-3 mb-3 p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold"
              style={{ 
                background: "linear-gradient(135deg, #1D4ED8, #3B82F6)",
                boxShadow: '0 2px 10px rgba(37,99,235,0.3)',
              }}>
              {tech?.name?.[0]?.toUpperCase() || "T"}
            </div>
            <div className="min-w-0">
              <div className="text-white text-xs font-semibold truncate">{tech?.name}</div>
              <div className="text-blue-200 text-xs">Field Technician</div>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full text-xs hover:text-red-400 transition-all duration-300 py-2 rounded-xl flex items-center justify-center gap-2"
            style={{ color: "rgba(255,255,255,0.5)", border: '1px solid rgba(255,255,255,0.08)', background: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'; e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.color = '#FCA5A5'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>
            <span>⬅</span> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 py-3 border-b slide-left" 
          style={{ 
            background: "#FEFCF7",
            borderColor: "#E5DDD0",
            boxShadow: "0 1px 4px rgba(100,80,50,0.08)",
            position: "relative",
            zIndex: 50,
          }}>
          <div>
            <h1 className="font-bold text-lg" style={{ color: "#0F172A", letterSpacing: '-0.02em' }}>{title}</h1>
            <p className="mono text-xs" style={{ color: "#94A3B8" }}>Technician Portal — Smart Street Light</p>
          </div>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ background: "#ECFDF5", border: "1px solid #A7F3D0" }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-700 text-xs font-semibold tracking-wider">LIVE</span>
            </div>
            <div className="mono text-xs px-3 py-1.5 rounded-lg"
              style={{ background: "#F5EFE4", border: "1px solid #E5DDD0", color: "#475569" }}>
              {time.toLocaleString("en-IN",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",second:"2-digit"})}
            </div>
          </div>
        </header>
        <main key={pageKey} className="flex-1 overflow-y-auto p-6 page-reveal" style={{ position: 'relative', zIndex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default TechLayout;
