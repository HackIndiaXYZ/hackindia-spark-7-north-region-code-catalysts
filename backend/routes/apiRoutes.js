const express = require("express");
const router = express.Router();
const {
  signup, login, technicianLogin, addTechnician,
  getTechnicians, toggleTechnician, deleteTechnician, getMe,
} = require("../controllers/adminController");
const {
  getDashboardStats, getMapData, getActiveFaults, getAllFaults,
  getControllerHealth, getLightHistory, getLightById, resolveFault,
  assignFaultToTechnician, cancelFaultAssignment, getTechniciansForAssign,
  getAdminNotifications, markNotificationsRead,
  getEnergyAnalytics, getMaintenanceOrders, assignTechnician,
} = require("../controllers/dashboardController");
const { protect, adminOnly } = require("../middlewares/verifyCity");

// Auth routes
router.post("/auth/signup",                    signup);
router.post("/auth/login",                     login);
router.post("/auth/technician/login",          technicianLogin);
router.get ("/auth/me",                        protect, getMe);

// Technician management (admin only)
router.post  ("/auth/technician/add",          protect, adminOnly, addTechnician);
router.get   ("/auth/technicians",             protect, adminOnly, getTechnicians);
router.patch ("/auth/technician/:id/toggle",   protect, adminOnly, toggleTechnician);
router.delete("/auth/technician/:id",          protect, adminOnly, deleteTechnician);

// Dashboard routes
router.get("/dashboard/stats",                        protect, getDashboardStats);
router.get("/dashboard/map",                          protect, getMapData);
router.get("/dashboard/faults",                       protect, getActiveFaults);
router.get("/dashboard/faults/all",                   protect, getAllFaults);
router.patch("/dashboard/faults/:fault_id/resolve",   protect, resolveFault);
router.get("/dashboard/controllers",                  protect, getControllerHealth);
router.get("/dashboard/light/:light_id/history",      protect, getLightHistory);
router.get("/dashboard/light/:light_id",              protect, getLightById);
router.get("/dashboard/energy",                       protect, getEnergyAnalytics);
router.get("/dashboard/maintenance",                  protect, getMaintenanceOrders);
router.patch("/dashboard/maintenance/:fault_id/assign",    protect, adminOnly, assignTechnician);
router.patch("/dashboard/faults/:fault_id/assign",         protect, adminOnly, assignFaultToTechnician);
router.patch("/dashboard/faults/:fault_id/cancel-assign",   protect, adminOnly, cancelFaultAssignment);
router.get  ("/dashboard/technicians-list",                protect, adminOnly, getTechniciansForAssign);
router.get  ("/dashboard/notifications",                   protect, adminOnly, getAdminNotifications);
router.patch("/dashboard/notifications/read",              protect, adminOnly, markNotificationsRead);

// Report Download Routes
const { downloadEnergyReport, downloadFaultReport, downloadMonthlySummary, downloadControllerReport } = require("../controllers/reportController");
router.get("/reports/energy",     protect, adminOnly, downloadEnergyReport);
router.get("/reports/fault",      protect, adminOnly, downloadFaultReport);
router.get("/reports/monthly",    protect, adminOnly, downloadMonthlySummary);
router.get("/reports/controller", protect, adminOnly, downloadControllerReport);

// Technician Portal Routes
const { getTechFaults, getTechFaultDetail, updateFaultStatus, submitRepair, getTechHistory, getTechProfile, getTechNotifications, getTechMapData } = require("../controllers/technicianController");
const { technicianOnly } = require("../middlewares/verifyCity");

router.get   ("/technician/faults",              protect, technicianOnly, getTechFaults);
router.get   ("/technician/faults/:id",          protect, technicianOnly, getTechFaultDetail);
router.patch ("/technician/faults/:id/status",   protect, technicianOnly, updateFaultStatus);
router.patch ("/technician/faults/:id/repair",   protect, technicianOnly, submitRepair);
router.get   ("/technician/history",             protect, technicianOnly, getTechHistory);
router.get   ("/technician/profile",             protect, technicianOnly, getTechProfile);
router.get   ("/technician/notifications",       protect, technicianOnly, getTechNotifications);
router.get   ("/technician/map",                protect, technicianOnly, getTechMapData);

// AI Optimization Routes (admin only)
const { runOptimization, getOptimizationResults } = require("../controllers/aiOptimizationController");
router.post("/ai/run",     protect, adminOnly, runOptimization);
router.get ("/ai/results", protect, adminOnly, getOptimizationResults);

module.exports = router;
