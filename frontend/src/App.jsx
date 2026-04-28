import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthPage        from "./pages/AuthPage";
import Dashboard       from "./pages/Dashboard";
import MapPage         from "./pages/MapPage";
import LightsPage      from "./pages/LightsPage";
import LightDetail     from "./pages/LightDetail";
import FaultsPage      from "./pages/FaultsPage";
import EnergyPage      from "./pages/EnergyPage";
import MaintenancePage from "./pages/MaintenancePage";
import ControllersPage from "./pages/ControllersPage";
import ReportsPage          from "./pages/ReportsPage";
import AIOptimizationPage   from "./pages/AIOptimizationPage";
import TechDashboard     from "./pages/technician/TechDashboard";
import TechFaults        from "./pages/technician/TechFaults";
import TechFaultDetail   from "./pages/technician/TechFaultDetail";
import TechMap           from "./pages/technician/TechMap";
import TechHistory       from "./pages/technician/TechHistory";
import TechNotifications from "./pages/technician/TechNotifications";
import TechProfile       from "./pages/technician/TechProfile";

const getUser = () => JSON.parse(localStorage.getItem("admin") || "{}");
const hasToken = () => !!localStorage.getItem("token");

const AdminGuard = ({ children }) => {
  if (!hasToken()) return <Navigate to="/login" replace />;
  if (getUser().type === "technician") return <Navigate to="/tech/dashboard" replace />;
  return children;
};
const TechGuard = ({ children }) => {
  if (!hasToken()) return <Navigate to="/login" replace />;
  if (getUser().type !== "technician") return <Navigate to="/dashboard" replace />;
  return children;
};
const HomeRedirect = () => {
  if (!hasToken()) return <Navigate to="/login" replace />;
  return getUser().type === "technician" ? <Navigate to="/tech/dashboard" replace /> : <Navigate to="/dashboard" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/"      element={<HomeRedirect />} />
        <Route path="/dashboard"        element={<AdminGuard><Dashboard /></AdminGuard>} />
        <Route path="/map"              element={<AdminGuard><MapPage /></AdminGuard>} />
        <Route path="/lights"           element={<AdminGuard><LightsPage /></AdminGuard>} />
        <Route path="/lights/:light_id" element={<AdminGuard><LightDetail /></AdminGuard>} />
        <Route path="/faults"           element={<AdminGuard><FaultsPage /></AdminGuard>} />
        <Route path="/energy"           element={<AdminGuard><EnergyPage /></AdminGuard>} />
        <Route path="/maintenance"      element={<AdminGuard><MaintenancePage /></AdminGuard>} />
        <Route path="/controllers"      element={<AdminGuard><ControllersPage /></AdminGuard>} />
        <Route path="/reports"          element={<AdminGuard><ReportsPage /></AdminGuard>} />
        <Route path="/ai-optimization"  element={<AdminGuard><AIOptimizationPage /></AdminGuard>} />
        <Route path="/tech/dashboard"       element={<TechGuard><TechDashboard /></TechGuard>} />
        <Route path="/tech/faults"          element={<TechGuard><TechFaults /></TechGuard>} />
        <Route path="/tech/faults/:id"      element={<TechGuard><TechFaultDetail /></TechGuard>} />
        <Route path="/tech/map"             element={<TechGuard><TechMap /></TechGuard>} />
        <Route path="/tech/history"         element={<TechGuard><TechHistory /></TechGuard>} />
        <Route path="/tech/notifications"   element={<TechGuard><TechNotifications /></TechGuard>} />
        <Route path="/tech/profile"         element={<TechGuard><TechProfile /></TechGuard>} />
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
