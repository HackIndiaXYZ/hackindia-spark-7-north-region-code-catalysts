import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../Sidebar/Sidebar";
import { getAdminNotifications, markNotificationsRead } from "../../services/api";

const Layout = ({ children, title }) => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [admin,   setAdmin]    = useState(null);
  const [notifs,  setNotifs]   = useState([]);
  const [unread,  setUnread]   = useState(0);
  const [showBell,setShowBell] = useState(false);
  const [pageKey, setPageKey]  = useState(0);
  const bellRef = useRef(null);

  useEffect(() => { setPageKey(prev => prev + 1); }, [location.pathname]);

  useEffect(() => {
    const stored = localStorage.getItem("admin");
    if (!stored) { navigate("/login"); return; }
    setAdmin(JSON.parse(stored));
  }, [navigate]);

  useEffect(() => {
    if (!admin) return;
    const load = async () => {
      try {
        const r = await getAdminNotifications();
        setNotifs(r.data.data);
        setUnread(r.data.unread);
      } catch {}
    };
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [admin]);

  useEffect(() => {
    const handler = (e) => { if (bellRef.current && !bellRef.current.contains(e.target)) setShowBell(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleBellClick = async () => {
    setShowBell(p => !p);
    if (unread > 0) {
      try { await markNotificationsRead(); setUnread(0); setNotifs(p => p.map(n => ({ ...n, is_read: true }))); }
      catch {}
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("admin");
    navigate("/login");
  };

  const TYPE_ICON = { FAULT_RESOLVED: "✅", FAULT_ASSIGNED: "🔧", FAULT_NEW: "🔴" };

  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex min-h-screen relative grid-bg">
      <Sidebar admin={admin} onLogout={handleLogout} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ─── Topbar ─── */}
        <header
          className="flex items-center justify-between px-6 py-3 border-b slide-left"
          style={{
            background: "#FEFCF7",
            borderColor: "#E5DDD0",
            boxShadow: "0 1px 4px rgba(100,80,50,0.08)",
            position: "relative",
            zIndex: 50,
          }}
        >
          <div>
            <h1
              className="font-bold text-lg"
              style={{ color: "#0F172A", letterSpacing: "-0.02em" }}
            >
              {title}
            </h1>
            <p className="mono text-xs" style={{ color: "#94A3B8" }}>
              {admin?.city?.toUpperCase() || "SMART STREET LIGHT SYSTEM"}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Live Indicator */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{
                background: "#ECFDF5",
                border: "1px solid #A7F3D0",
              }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-emerald-700 text-xs font-semibold tracking-wider">LIVE</span>
            </div>

            {/* Clock */}
            <div
              className="mono text-xs px-3 py-1.5 rounded-lg"
              style={{
                background: "#F5EFE4",
                border: "1px solid #E5DDD0",
                color: "#475569",
              }}
            >
              {time.toLocaleString("en-IN", {
                day: "2-digit", month: "short",
                hour: "2-digit", minute: "2-digit", second: "2-digit",
              })}
            </div>

            {/* Notification Bell */}
            <div className="relative" ref={bellRef}>
              <button
                onClick={handleBellClick}
                className="relative w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200"
                style={{
                  background: "#F5EFE4",
                  border: "1px solid #E5DDD0",
                  color: "#475569",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#EFF6FF"; e.currentTarget.style.borderColor = "#BFDBFE"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#F5EFE4"; e.currentTarget.style.borderColor = "#E5DDD0"; }}
              >
                <span className="text-base">🔔</span>
                {unread > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 text-white text-xs font-bold rounded-full flex items-center justify-center mono pop-in"
                    style={{ background: "linear-gradient(135deg, #EF4444, #DC2626)" }}
                  >
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showBell && (
                <div
                  className="absolute right-0 top-11 w-80 rounded-2xl z-50 overflow-hidden scale-in"
                  style={{
                    background: "#FEFCF7",
                    border: "1px solid #E5DDD0",
                    boxShadow: "0 20px 60px rgba(100,80,50,0.1), 0 4px 12px rgba(100,80,50,0.06)",
                  }}
                >
                  <div
                    className="px-4 py-3 border-b flex items-center justify-between"
                    style={{ borderColor: "#EDE8DC", background: "#F8F3E8" }}
                  >
                    <span className="font-bold text-sm" style={{ color: "#0F172A" }}>Notifications</span>
                    <span className="mono text-xs" style={{ color: "#94A3B8" }}>{notifs.length} total</span>
                  </div>

                  <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                    {notifs.length === 0 ? (
                      <div className="p-6 text-center text-sm" style={{ color: "#94A3B8" }}>
                        <div className="text-2xl mb-2 float-anim">🔔</div>
                        No new notifications
                      </div>
                    ) : notifs.map((n, idx) => (
                      <div
                        key={n._id}
                        className="flex items-start gap-3 px-4 py-3 border-b transition-all duration-200"
                        style={{
                          borderColor: "#EDE8DC",
                          background: !n.is_read ? "#EFF6FF" : "#FEFCF7",
                          animationDelay: `${idx * 0.04}s`,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "#F5EFE4"}
                        onMouseLeave={e => e.currentTarget.style.background = !n.is_read ? "#EFF6FF" : "#FEFCF7"}
                      >
                        <span className="text-lg mt-0.5 flex-shrink-0">{TYPE_ICON[n.type] || "🔔"}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold" style={{ color: "#0F172A" }}>{n.title}</div>
                          <div className="text-xs mt-0.5" style={{ color: "#64748B" }}>{n.message}</div>
                          {n.technician && (
                            <div className="text-xs mono mt-0.5" style={{ color: "#2563EB" }}>👤 {n.technician}</div>
                          )}
                          <div className="text-xs mono mt-1" style={{ color: "#94A3B8" }}>
                            {new Date(n.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 pulse-glow" style={{ background: "#2563EB" }} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Admin Avatar */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold"
              style={{
                background: "linear-gradient(135deg, #1D4ED8, #3B82F6)",
                boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
              }}
            >
              {admin?.name?.[0]?.toUpperCase() || "A"}
            </div>
          </div>
        </header>

        {/* ─── Page Content ─── */}
        <main key={pageKey} className="flex-1 overflow-y-auto p-6 page-reveal" style={{ position: "relative", zIndex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
