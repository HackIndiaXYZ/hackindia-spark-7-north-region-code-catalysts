import { useNavigate, useLocation } from "react-router-dom";

const NAV = [
  { icon: "⊞",  label: "Dashboard",        path: "/dashboard"    },
  { icon: "🗺️", label: "Live Map",          path: "/map"          },
  { icon: "💡", label: "Street Lights",     path: "/lights"       },
  { icon: "⚠️", label: "Fault Alerts",      path: "/faults"       },
  { icon: "⚡", label: "Energy Analytics",  path: "/energy"       },
  { icon: "🔧", label: "Maintenance",       path: "/maintenance"  },
  { icon: "🤖", label: "AI Optimization",  path: "/ai-optimization" },
  { icon: "📡", label: "Controllers",       path: "/controllers"  },
  { icon: "📊", label: "Reports & Users",   path: "/reports"      },
];

const Sidebar = ({ admin, onLogout }) => {
  const navigate  = useNavigate();
  const { pathname } = useLocation();

  return (
    <aside
      className="w-60 min-h-screen flex flex-col slide-left"
      style={{
        background: "linear-gradient(180deg, #0C1E3C 0%, #0A1730 100%)",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "4px 0 24px rgba(0,0,0,0.15)",
      }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg float-anim"
            style={{
              background: "linear-gradient(135deg, #1D4ED8, #3B82F6)",
              boxShadow: "0 4px 16px rgba(37,99,235,0.4)",
            }}
          >
            🏙️
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight" style={{ letterSpacing: "-0.01em" }}>
              SmartLight
            </div>
            <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
              {admin?.city || "Loading..."}
            </div>
          </div>
        </div>
      </div>

      {/* Section label */}
      <div className="px-5 pt-5 pb-2">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
          Navigation
        </span>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 pb-3 space-y-0.5">
        {NAV.map((item, idx) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`sidebar-link w-full text-left ${pathname === item.path ? "active" : ""}`}
            style={{ animationDelay: `${idx * 0.04}s` }}
          >
            <span className="text-base" style={{ minWidth: "22px", textAlign: "center" }}>
              {item.icon}
            </span>
            <span className="flex-1">{item.label}</span>
            {pathname === item.path && (
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "#3B82F6", boxShadow: "0 0 6px #3B82F6" }}
              />
            )}
          </button>
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-4 h-px mb-3" style={{ background: "rgba(255,255,255,0.07)" }} />

      {/* Admin info + Logout */}
      <div className="px-4 pb-5">
        <div
          className="flex items-center gap-3 p-3 rounded-xl mb-3"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #1D4ED8, #3B82F6)" }}
          >
            {admin?.name?.[0]?.toUpperCase() || "A"}
          </div>
          <div className="min-w-0">
            <div className="text-white text-xs font-semibold truncate">{admin?.name || "Admin"}</div>
            <div className="text-xs capitalize" style={{ color: "rgba(255,255,255,0.4)" }}>
              {admin?.role}
            </div>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 font-semibold"
          style={{
            color: "rgba(255,255,255,0.5)",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "transparent",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(239,68,68,0.12)";
            e.currentTarget.style.color = "#FCA5A5";
            e.currentTarget.style.borderColor = "rgba(239,68,68,0.25)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "rgba(255,255,255,0.5)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
          }}
        >
          <span>↩</span> Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
