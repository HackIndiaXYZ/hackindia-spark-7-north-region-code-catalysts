import axios from "axios";
const API = axios.create({ baseURL: import.meta.env.VITE_API_URL || "/api", timeout: 10000 });
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
API.interceptors.response.use((res) => res, (error) => {
  if (error.response?.status === 401) {
    const url = error.config?.url || "";
    const isLoginRoute = url.includes("/auth/login") || url.includes("/auth/technician/login");
    if (!isLoginRoute) {
      localStorage.removeItem("token");
      localStorage.removeItem("admin");
      window.location.href = "/login";
    }
  }
  return Promise.reject(error);
});

// Auth
export const loginAdmin         = (data) => API.post("/auth/login", data);
export const signupAdmin        = (data) => API.post("/auth/signup", data);
export const loginTechnician    = (data) => API.post("/auth/technician/login", data);
export const addTechnician      = (data) => API.post("/auth/technician/add", data);
export const getTechnicians     = ()     => API.get("/auth/technicians");
export const toggleTechnician   = (id)  => API.patch(`/auth/technician/${id}/toggle`);
export const deleteTechnician   = (id)  => API.delete(`/auth/technician/${id}`);

// Dashboard
export const getDashboardStats   = (city) => API.get("/dashboard/stats",       { params: { city } });
export const getMapData          = (city) => API.get("/dashboard/map",         { params: { city } });
export const getActiveFaults     = (city) => API.get("/dashboard/faults",      { params: { city } });
export const getAllFaults         = (city) => API.get("/dashboard/faults/all",  { params: { city } });
export const getControllerHealth = (city) => API.get("/dashboard/controllers", { params: { city } });
export const getLightHistory     = (id)   => API.get(`/dashboard/light/${id}/history`);
export const getLightById        = (id)   => API.get(`/dashboard/light/${id}`);
export const resolveFault        = (id)   => API.patch(`/dashboard/faults/${id}/resolve`);
export const getEnergyAnalytics  = (city, range) => API.get("/dashboard/energy", { params: { city, range } });
export const getMaintenanceOrders = (city) => API.get("/dashboard/maintenance", { params: { city } });
export const assignTechnician    = (id, data) => API.patch(`/dashboard/maintenance/${id}/assign`, data);
export const getAllLights         = (city) => API.get("/dashboard/map", { params: { city } });

export default API;

// Admin Notifications & Fault Assign
export const assignFaultToTechnician  = (id, data) => API.patch(`/dashboard/faults/${id}/assign`, data);
export const cancelFaultAssignment    = (id)       => API.patch(`/dashboard/faults/${id}/cancel-assign`);
export const getTechniciansForAssign  = ()          => API.get("/dashboard/technicians-list");
export const getAdminNotifications    = ()          => API.get("/dashboard/notifications");
export const markNotificationsRead    = ()          => API.patch("/dashboard/notifications/read");

// Technician Portal APIs
export const getTechFaults       = ()        => API.get("/technician/faults");
export const getTechMapData      = ()        => API.get("/technician/map");
export const getTechFaultDetail  = (id)      => API.get(`/technician/faults/${id}`);
export const updateFaultStatus   = (id, data)=> API.patch(`/technician/faults/${id}/status`, data);
export const submitRepair        = (id, data)=> API.patch(`/technician/faults/${id}/repair`, data);
export const getTechHistory      = ()        => API.get("/technician/history");
export const getTechProfile      = ()        => API.get("/technician/profile");
export const getTechNotifications= ()        => API.get("/technician/notifications");

// AI Optimization
export const runAIOptimization  = ()         => API.post("/ai/run");
export const getAIResults       = ()         => API.get("/ai/results");
