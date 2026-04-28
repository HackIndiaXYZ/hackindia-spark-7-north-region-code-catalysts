const Light            = require("../models/Light");
const FaultLog         = require("../models/FaultLog");
const ControllerMetrics= require("../models/ControllerMetrics");
const HardwareDataLog  = require("../models/HardwareDataLog");
const Technician       = require("../models/Technician");
const Admin            = require("../models/Admin");
const Notification     = require("../models/Notification");

const cf = (city) => city ? { city: { $regex: new RegExp(`^${city}$`, "i") } } : {};

// ── Stats ──────────────────────────────────────────────────────────────────
const getDashboardStats = async (req, res) => {
  try {
    const city   = req.query.city || req.admin?.city;
    const filter = cf(city);
    const [totalLights, activeLights, faultyLights, idleLights, dayOffLights, offlineLights, totalControllers, onlineControllers] =
      await Promise.all([
        Light.countDocuments(filter),
        Light.countDocuments({ ...filter, current_status: "ON" }),
        Light.countDocuments({ ...filter, current_status: "FAULT" }),
        Light.countDocuments({ ...filter, current_status: "IDLE" }),
        Light.countDocuments({ ...filter, current_status: "DAY_OFF" }),
        Light.countDocuments({ ...filter, current_status: "OFFLINE" }),
        ControllerMetrics.countDocuments(filter),
        ControllerMetrics.countDocuments({ ...filter, is_online: true }),
      ]);
    const onLights = await Light.find({ ...filter, current_status: "ON" }).select("current_usage");
    const totalKWh = onLights.reduce((sum, l) => sum + ((l.current_usage || 0) * 220) / 1000, 0);
    res.status(200).json({ success: true, data: { totalLights, activeLights, faultyLights, idleLights, dayOffLights, offlineLights, totalControllers, onlineControllers, offlineControllers: totalControllers - onlineControllers, energyKWh: parseFloat(totalKWh.toFixed(2)) } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── Map ────────────────────────────────────────────────────────────────────
const getMapData = async (req, res) => {
  try {
    const city = req.query.city || req.admin?.city;
    const lights = await Light.find(cf(city)).select("light_id controller_id location current_status motion_detected last_updated city current_usage");
    res.status(200).json({ success: true, count: lights.length, data: lights });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── Active Faults ──────────────────────────────────────────────────────────
const getActiveFaults = async (req, res) => {
  try {
    const city   = req.query.city || req.admin?.city;
    const faults = await FaultLog.find({ ...cf(city), resolved: false }).sort({ fault_time: -1 }).limit(50);
    res.status(200).json({ success: true, count: faults.length, data: faults });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── All Faults ─────────────────────────────────────────────────────────────
const getAllFaults = async (req, res) => {
  try {
    const city   = req.query.city || req.admin?.city;
    const faults = await FaultLog.find(cf(city)).sort({ fault_time: -1 }).limit(100);
    res.status(200).json({ success: true, count: faults.length, data: faults });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── Controllers ────────────────────────────────────────────────────────────
const getControllerHealth = async (req, res) => {
  try {
    const city        = req.query.city || req.admin?.city;
    const controllers = await ControllerMetrics.find(cf(city)).sort({ last_ping: -1 });
    res.status(200).json({ success: true, count: controllers.length, data: controllers });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── Light History ──────────────────────────────────────────────────────────
const getLightHistory = async (req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const logs  = await HardwareDataLog.find({ light_id: req.params.light_id, timestamp: { $gte: since } }).sort({ timestamp: 1 });
    res.status(200).json({ success: true, count: logs.length, data: logs });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── Resolve Fault ──────────────────────────────────────────────────────────
const resolveFault = async (req, res) => {
  try {
    const fault = await FaultLog.findByIdAndUpdate(req.params.fault_id, { resolved: true, resolved_at: new Date() }, { new: true });
    if (!fault) return res.status(404).json({ success: false, message: "Fault not found" });
    res.status(200).json({ success: true, message: "Fault resolved", data: fault });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── Assign Fault to Technician ─────────────────────────────────────────────
const assignFaultToTechnician = async (req, res) => {
  try {
    const { technician_name, technician_id } = req.body;
    const updateData = { assigned_to: technician_name, repair_status: "In Progress" };
    // BUG-4 FIX: Store technician ID for reliable matching
    if (technician_id) updateData.assigned_to_id = technician_id;
    const fault = await FaultLog.findByIdAndUpdate(
      req.params.fault_id,
      updateData,
      { new: true }
    );
    if (!fault) return res.status(404).json({ success: false, message: "Fault not found" });

    // Create notification for admin (assignment confirmation)
    const admin = await Admin.findById(req.admin.id);
    await Notification.create({
      admin_id:   admin._id,
      city:       admin.city,
      type:       "FAULT_ASSIGNED",
      title:      "Fault Assigned",
      message:    `${fault.light_id} ka fault ${technician_name} ko assign kiya gaya`,
      light_id:   fault.light_id,
      fault_id:   fault._id,
      technician: technician_name,
    });

    res.status(200).json({ success: true, message: `Fault assigned to ${technician_name}`, data: fault });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── Get Technicians for dropdown ───────────────────────────────────────────
const getTechniciansForAssign = async (req, res) => {
  try {
    const city  = req.admin.city;
    const techs = await Technician.find({ city: { $regex: new RegExp(`^${city}$`, "i") }, is_active: true }).select("name email");
    res.status(200).json({ success: true, data: techs });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── Admin Notifications ────────────────────────────────────────────────────
const getAdminNotifications = async (req, res) => {
  try {
    const notifs = await Notification.find({ admin_id: req.admin.id }).sort({ createdAt: -1 }).limit(20);
    const unread = await Notification.countDocuments({ admin_id: req.admin.id, is_read: false });
    res.status(200).json({ success: true, data: notifs, unread });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── Mark Notifications Read ────────────────────────────────────────────────
const markNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany({ admin_id: req.admin.id, is_read: false }, { is_read: true });
    res.status(200).json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── Energy Analytics ───────────────────────────────────────────────────────
const getEnergyAnalytics = async (req, res) => {
  try {
    const city  = req.query.city || req.admin?.city;
    const range = req.query.range || "7days";
    let days    = range === "30days" ? 30 : range === "1year" ? 365 : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const logs  = await HardwareDataLog.find({ ...cf(city), timestamp: { $gte: since }, status: "ON" }).select("current_usage timestamp");
    // BUG-5 FIX: Use unique keys with year to prevent label collision across year boundaries
    const getKey = (d, days) => {
      if (days <= 7)  return d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" });
      if (days <= 30) return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      return `${d.toLocaleDateString("en-IN", { month: "short" })}-${d.getFullYear()}`; // "Jan-2025" not just "Jan"
    };
    const getLabel = (d, days) => {
      if (days <= 7)  return d.toLocaleDateString("en-IN", { weekday: "short" });
      if (days <= 30) return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      return `${d.toLocaleDateString("en-IN", { month: "short" })} ${d.getFullYear()}`; // "Jan 2025"
    };

    const dayMap = {};
    logs.forEach((log) => {
      const d   = new Date(log.timestamp);
      const key = getKey(d, days);
      if (!dayMap[key]) dayMap[key] = 0;
      dayMap[key] += (log.current_usage || 0) * 220 / 1000;
    });
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d     = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key   = getKey(d, days);
      const label = getLabel(d, days);
      result.push({ label, value: parseFloat((dayMap[key] || 0).toFixed(2)) });
    }
    const totalKWh = logs.reduce((s, l) => s + (l.current_usage || 0) * 220 / 1000, 0);
    const prevSince = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000);
    const prevLogs  = await HardwareDataLog.find({ ...cf(city), timestamp: { $gte: prevSince, $lt: since }, status: "ON" }).select("current_usage");
    const prevKWh   = prevLogs.reduce((s, l) => s + (l.current_usage || 0) * 220 / 1000, 0);
    let energySaved = 0;
    if (prevKWh > 0 && totalKWh < prevKWh) energySaved = parseFloat((((prevKWh - totalKWh) / prevKWh) * 100).toFixed(1));
    res.status(200).json({ success: true, data: { chart: result, totalKWh: parseFloat(totalKWh.toFixed(2)), costEstimate: Math.round(totalKWh * 8.5), energySaved, range } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── Single Light by ID (BUG-6 FIX) ───────────────────────────────────────────
const getLightById = async (req, res) => {
  try {
    const light = await Light.findOne({ light_id: req.params.light_id });
    if (!light) return res.status(404).json({ success: false, message: "Light not found" });
    res.status(200).json({ success: true, data: light });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── Maintenance Orders ─────────────────────────────────────────────────────
const getMaintenanceOrders = async (req, res) => {
  try {
    const city   = req.query.city || req.admin?.city;
    const faults = await FaultLog.find(cf(city)).sort({ fault_time: -1 }).limit(50);
    const orders = faults.map((f) => ({
      _id: f._id, light_id: f.light_id, controller_id: f.controller_id,
      fault_type: f.fault_type, city: f.city, location: f.location,
      current_at_fault: f.current_at_fault,
      status: f.resolved ? "Completed" : f.assigned_to ? "In Progress" : "Pending",
      technician: f.assigned_to || null,
      priority: (f.current_at_fault || 0) < 0.1 ? "High" : "Medium",
      created_at: f.fault_time, resolved: f.resolved, resolved_at: f.resolved_at,
    }));
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── Assign Technician (Maintenance page) ───────────────────────────────────
const assignTechnician = async (req, res) => {
  try {
    const { technician, status } = req.body;
    const updateData = { assigned_to: technician };
    if (status === "Completed") { updateData.resolved = true; updateData.resolved_at = new Date(); }
    const fault = await FaultLog.findByIdAndUpdate(req.params.fault_id, updateData, { new: true });
    if (!fault) return res.status(404).json({ success: false, message: "Not found" });
    res.status(200).json({ success: true, data: fault });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── Cancel Fault Assignment ────────────────────────────────────────────────
const cancelFaultAssignment = async (req, res) => {
  try {
    const fault = await FaultLog.findByIdAndUpdate(
      req.params.fault_id,
      { assigned_to: null, assigned_to_id: null, repair_status: "Pending" },
      { new: true }
    );
    if (!fault) return res.status(404).json({ success: false, message: "Fault not found" });
    res.status(200).json({ success: true, message: "Assignment cancelled", data: fault });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = {
  getDashboardStats, getMapData, getActiveFaults, getAllFaults,
  getControllerHealth, getLightHistory, getLightById, resolveFault,
  assignFaultToTechnician, cancelFaultAssignment, getTechniciansForAssign,
  getAdminNotifications, markNotificationsRead,
  getEnergyAnalytics, getMaintenanceOrders, assignTechnician,
};
