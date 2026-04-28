const Light            = require("../models/Light");
const HardwareDataLog  = require("../models/HardwareDataLog");
const ControllerMetrics= require("../models/ControllerMetrics");
const FaultLog         = require("../models/FaultLog");
const Admin            = require("../models/Admin");
const Notification     = require("../models/Notification");
const Technician       = require("../models/Technician");
const mongoose         = require("mongoose");


// @desc    ESP32 se hardware data receive karna
// @route   POST /api/hardware/update
const receiveHardwareData = async (req, res) => {
  try {
    const { light_id, controller_id, city, status, current_usage, motion_detected, ldr_value, wifi_rssi, free_heap, ip_address, reset_reason } = req.body;

    if (!light_id || !controller_id || !city || !status)
      return res.status(400).json({ success: false, message: "light_id, controller_id, city, aur status required hain" });

    const validStatuses = ["DAY_OFF", "IDLE", "ON", "FAULT"];
    if (!validStatuses.includes(status))
      return res.status(400).json({ success: false, message: `Invalid status. Allowed: ${validStatuses.join(", ")}` });

    // 1. Light status update (upsert)
    const updatedLight = await Light.findOneAndUpdate(
      { light_id },
      { controller_id, city, current_status: status, current_usage: current_usage || 0, motion_detected: motion_detected || false, last_updated: new Date() },
      { upsert: true, new: true, runValidators: false }
    );

    // 2. Time-series log
    await HardwareDataLog.create({
      light_id, controller_id, city, status,
      current_usage: current_usage || 0,
      motion_detected: motion_detected || false,
      ldr_value: ldr_value || 0,
      timestamp: new Date(),
    });

    // 3. Controller metrics update
    const controllerUpdate = { city, last_ping: new Date(), is_online: true };
    if (wifi_rssi  !== undefined) controllerUpdate.wifi_rssi  = wifi_rssi;
    if (free_heap  !== undefined) controllerUpdate.free_heap  = free_heap;
    if (ip_address)               controllerUpdate.ip_address = ip_address;
    if (reset_reason && reset_reason.includes("WDT")) {
      controllerUpdate.$inc = { watchdog_resets: 1 };
      controllerUpdate.last_reset_reason = reset_reason;
    }
    await ControllerMetrics.findOneAndUpdate({ controller_id }, controllerUpdate, { upsert: true, new: true });

    // 4. FAULT handling with auto-assign
    if (status === "FAULT") {
      const existingFault = await FaultLog.findOne({ light_id, resolved: false });

      if (!existingFault) {
        // Auto-assign: find a technician in this city with 0 active tasks
        let autoTech = null;
        try {
          const cityTechs = await Technician.find({ city: { $regex: new RegExp(`^${city}$`, "i") }, is_active: true });
          for (const tech of cityTechs) {
            const activeCount = await FaultLog.countDocuments({ assigned_to_id: tech._id, resolved: false });
            if (activeCount === 0) {
              autoTech = tech;
              break;
            }
          }
        } catch {}

        const newFault = await FaultLog.create({
          light_id, controller_id, city,
          fault_type:       (current_usage || 0) < 0.1 ? "BULB_FUSE" : "LOW_CURRENT",
          current_at_fault: current_usage || 0,
          location:         updatedLight.location,
          fault_time:       new Date(),
          assigned_to:      autoTech?.name || null,
          assigned_to_id:   autoTech?._id  || null,
          repair_status:    autoTech ? "In Progress" : "Pending",
        });

        // Notify all admins of this city
        const admins = await Admin.find({ city: { $regex: new RegExp(`^${city}$`, "i") } });
        await Promise.all(admins.map(admin =>
          Notification.create({
            admin_id:  admin._id,
            city:      admin.city,
            type:      "FAULT_NEW",
            title:     autoTech
              ? `🔴 Fault Auto-Assigned to ${autoTech.name}`
              : "🔴 New Fault Detected!",
            message:   `${light_id} mein fault aaya — ${(current_usage || 0) < 0.1 ? "Bulb Fuse" : "Low Current"}${autoTech ? ` → Auto-assigned to ${autoTech.name}` : ""}`,
            light_id:  light_id,
            fault_id:  newFault._id,
            technician: autoTech?.name || "",
          })
        ));
      }
    }

    // 5. Auto-resolve when fault clears
    if (status !== "FAULT") {
      const activeFault = await FaultLog.findOne({ light_id, resolved: false });
      if (activeFault) {
        await FaultLog.updateMany({ light_id, resolved: false }, { resolved: true, resolved_at: new Date() });
      }
    }

    res.status(200).json({ success: true, message: "Data received", light_id, status });
  } catch (error) {
    console.error("Hardware update error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Upgraded cron: marks controllers offline AND resets stale light data
const markOfflineControllers = async () => {
  try {
    if (mongoose.connection.readyState !== 1) return;

    const thirtySecondsAgo = new Date(Date.now() - 30000);

    // 1. Find controllers going offline
    const goingOffline = await ControllerMetrics.find(
      { last_ping: { $lt: thirtySecondsAgo }, is_online: true }
    ).select("controller_id");

    if (goingOffline.length > 0) {
      const offlineControllerIds = goingOffline.map(c => c.controller_id);

      // 2. Mark controllers offline
      await ControllerMetrics.updateMany(
        { controller_id: { $in: offlineControllerIds } },
        { is_online: false }
      );

      // 3. Mark all non-FAULT lights on these controllers as OFFLINE + reset stale data
      await Light.updateMany(
        {
          controller_id: { $in: offlineControllerIds },
          current_status: { $nin: ["FAULT", "OFFLINE"] },
        },
        {
          current_status: "OFFLINE",
          current_usage: 0,
          motion_detected: false,
        }
      );
    }
  } catch (error) {
    console.error("Error in markOfflineControllers:", error.message);
  }
};

module.exports = { receiveHardwareData, markOfflineControllers };
