import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loginAdmin, signupAdmin, loginTechnician } from "../services/api";

const ADMIN_DOMAIN = "@smartlight.gov.in";

const AuthPage = () => {
  const navigate = useNavigate();
  const [userType, setUserType] = useState("admin");
  const [tab,      setTab]      = useState("login");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [loginForm,  setLoginForm]  = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({ name: "", email: "", password: "", city: "", role: "cityadmin" });
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  const reset = () => { setError(""); setLoginForm({ email: "", password: "" }); };

  const handleLogin = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const fn = userType === "admin" ? loginAdmin : loginTechnician;
      const { data } = await fn(loginForm);
      localStorage.setItem("token", data.token);
      localStorage.setItem("admin", JSON.stringify(data.admin));
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally { setLoading(false); }
  };

  const handleSignup = async (e) => {
    e.preventDefault(); setError("");
    if (!signupForm.email.endsWith(ADMIN_DOMAIN)) {
      setError(`Admin email must end with "${ADMIN_DOMAIN}"`);
      return;
    }
    if (signupForm.password.length < 6) { setError("Password min 6 characters"); return; }

    // Validate city using Nominatim (OpenStreetMap free API)
    setLoading(true);
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(signupForm.city)}&format=json&limit=1&featuretype=city`,
        { headers: { "Accept-Language": "en" } }
      );
      const geoData = await geoRes.json();
      if (!geoData || geoData.length === 0) {
        setError(`"${signupForm.city}" is not a valid city. Please enter a correct city name.`);
        setLoading(false);
        return;
      }
    } catch {
      setError("Could not verify city. Please check your internet connection.");
      setLoading(false);
      return;
    }

    try {
      const { data } = await signupAdmin(signupForm);
      localStorage.setItem("token", data.token);
      localStorage.setItem("admin", JSON.stringify(data.admin));
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed");
    } finally { setLoading(false); }
  };

  const inputCls = {
    background: "#FFFFFF",
    border: "1px solid #E2E8F0",
    borderRadius: "12px",
    padding: "12px 16px",
    color: "#0F172A",
    width: "100%",
    fontSize: "14px",
    fontFamily: "'Inter', sans-serif",
    outline: "none",
    transition: "all 0.2s ease",
    boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "#F0F4F8" }}
    >
      {/* Left Panel — Branding */}
      <div
        className="hidden lg:flex lg:w-5/12 flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #0C1E3C 0%, #1D4ED8 100%)" }}
      >
        {/* Decorative circles */}
        <div style={{ position: "absolute", width: "400px", height: "400px", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.06)", top: "-100px", right: "-100px" }} />
        <div style={{ position: "absolute", width: "300px", height: "300px", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.05)", bottom: "-60px", left: "-60px" }} />
        <div style={{ position: "absolute", width: "200px", height: "200px", borderRadius: "50%", background: "radial-gradient(circle, rgba(96,165,250,0.12) 0%, transparent 70%)", top: "30%", right: "10%" }} />

        <div className="relative z-10 text-center">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 float-anim"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))",
              border: "1px solid rgba(255,255,255,0.18)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
              backdropFilter: "blur(10px)",
            }}
          >
            🏙️
          </div>
          <h1 className="text-3xl font-bold text-white mb-3" style={{ letterSpacing: "-0.03em" }}>
            SmartLight
          </h1>
          <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.55)", fontFamily: "JetBrains Mono, monospace" }}>
            Ministry of Power — v1.0
          </p>
          <div className="w-12 h-px mx-auto mb-8" style={{ background: "rgba(255,255,255,0.2)" }} />
          {/* Features */}
          {[
            { icon: "⚡", text: "Real-time energy monitoring" },
            { icon: "🗺️", text: "Live street light map" },
            { icon: "🔧", text: "Smart fault management" },
            { icon: "📊", text: "Analytics & reports" },
          ].map((f) => (
            <div key={f.text} className="flex items-center gap-3 mb-3 text-left">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                {f.icon}
              </div>
              <span className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div
          className={`w-full max-w-md transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          {/* Mobile header */}
          <div className="lg:hidden text-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 float-anim"
              style={{ background: "linear-gradient(135deg,#1D4ED8,#3B82F6)", boxShadow: "0 8px 32px rgba(37,99,235,0.3)" }}
            >
              🏙️
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "#0F172A", letterSpacing: "-0.02em" }}>SmartLight</h1>
            <p className="text-sm mt-1" style={{ color: "#94A3B8" }}>Ministry of Power Portal</p>
          </div>

          {/* Title */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold" style={{ color: "#0F172A", letterSpacing: "-0.02em" }}>
              Welcome back
            </h2>
            <p className="text-sm mt-1" style={{ color: "#64748B" }}>Sign in to your account to continue</p>
          </div>

          {/* User Type Toggle */}
          <div
            className="flex gap-2 mb-6 p-1 rounded-xl"
            style={{ background: "#E2E8F0" }}
          >
            {[
              { key: "admin",      label: "🏛️ Admin" },
              { key: "technician", label: "🔧 Technician" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => { setUserType(t.key); reset(); setTab("login"); }}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
                style={userType === t.key ? {
                  background: "#FFFFFF",
                  color: "#0F172A",
                  boxShadow: "0 1px 4px rgba(15,23,42,0.1)",
                } : {
                  color: "#64748B",
                  background: "transparent",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Card */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              boxShadow: "0 4px 20px rgba(15,23,42,0.08)",
            }}
          >
            {/* Tabs */}
            {userType === "admin" && (
              <div className="flex border-b" style={{ borderColor: "#F1F5F9" }}>
                {[
                  { key: "login",  label: "Sign In" },
                  { key: "signup", label: "Register" },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => { setTab(t.key); setError(""); }}
                    className="flex-1 py-3.5 text-sm font-semibold relative transition-colors"
                    style={{ color: tab === t.key ? "#2563EB" : "#94A3B8" }}
                  >
                    {t.label}
                    {tab === t.key && (
                      <span
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full"
                        style={{ width: "40px", background: "#2563EB" }}
                      />
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="p-6">
              {/* Error */}
              {error && (
                <div
                  className="mb-4 p-3 rounded-xl text-sm scale-in flex items-center gap-2"
                  style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B" }}
                >
                  ⚠️ {error}
                </div>
              )}

              {/* LOGIN */}
              {tab === "login" && (
                <form onSubmit={handleLogin} className="space-y-4">
                  {[
                    { name: "email",    type: "email",    label: "Email Address", ph: userType === "admin" ? `admin${ADMIN_DOMAIN}` : "tech@example.com" },
                    { name: "password", type: "password", label: "Password",      ph: "••••••••" },
                  ].map((f, idx) => (
                    <div key={f.name} className="fade-up" style={{ animationDelay: `${idx * 0.08}s` }}>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#64748B" }}>
                        {f.label}
                      </label>
                      <input
                        name={f.name} type={f.type} placeholder={f.ph} required
                        value={loginForm[f.name]}
                        onChange={(e) => setLoginForm(p => ({ ...p, [e.target.name]: e.target.value }))}
                        style={inputCls}
                        onFocus={e => { e.target.style.borderColor = "rgba(37,99,235,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)"; }}
                        onBlur={e => { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "0 1px 3px rgba(15,23,42,0.04)"; }}
                      />
                    </div>
                  ))}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 text-white font-bold rounded-xl transition-all duration-200 disabled:opacity-50 mt-1 btn-ripple"
                    style={{
                      background: "linear-gradient(135deg,#1D4ED8,#2563EB)",
                      boxShadow: "0 4px 16px rgba(37,99,235,0.35)",
                    }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = "0 6px 24px rgba(37,99,235,0.5)"}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(37,99,235,0.35)"}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Signing in...
                      </span>
                    ) : `Sign In as ${userType === "admin" ? "Admin" : "Technician"} →`}
                  </button>
                </form>
              )}

              {/* SIGNUP */}
              {tab === "signup" && userType === "admin" && (
                <form onSubmit={handleSignup} className="space-y-3">
                  {[
                    { name: "name",     type: "text",     label: "Full Name",             ph: "Rahul Sharma" },
                    { name: "email",    type: "email",    label: `Email (${ADMIN_DOMAIN})`, ph: `admin${ADMIN_DOMAIN}` },
                    { name: "password", type: "password", label: "Password",               ph: "Min 6 characters" },
                    { name: "city",     type: "text",     label: "City",                  ph: "Kurukshetra" },
                  ].map((f, idx) => (
                    <div key={f.name} className="fade-up" style={{ animationDelay: `${idx * 0.06}s` }}>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#64748B" }}>
                        {f.label}
                      </label>
                      <input
                        name={f.name} type={f.type} placeholder={f.ph} required
                        value={signupForm[f.name]}
                        onChange={(e) => setSignupForm(p => ({ ...p, [e.target.name]: e.target.value }))}
                        style={inputCls}
                        onFocus={e => { e.target.style.borderColor = "rgba(37,99,235,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)"; }}
                        onBlur={e => { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "0 1px 3px rgba(15,23,42,0.04)"; }}
                      />
                    </div>
                  ))}
                  <div className="fade-up" style={{ animationDelay: "0.28s" }}>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#64748B" }}>
                      Role
                    </label>
                    <select
                      name="role"
                      value={signupForm.role}
                      onChange={(e) => setSignupForm(p => ({ ...p, role: e.target.value }))}
                      style={inputCls}
                    >
                      <option value="cityadmin">City Admin</option>
                      <option value="superadmin">Super Admin</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 text-white font-bold rounded-xl transition-all duration-200 disabled:opacity-50 btn-ripple"
                    style={{
                      background: "linear-gradient(135deg,#1D4ED8,#2563EB)",
                      boxShadow: "0 4px 16px rgba(37,99,235,0.35)",
                    }}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating...
                      </span>
                    ) : "Create Admin Account →"}
                  </button>
                </form>
              )}
            </div>
          </div>

          <p className="text-center text-xs mt-5" style={{ color: "#94A3B8", fontFamily: "JetBrains Mono, monospace" }}>
            Smart Street Light System v1.0 — Ministry of Power
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
