const FaultLog    = require("../models/FaultLog");
const Light       = require("../models/Light");
const Technician  = require("../models/Technician");
const Admin       = require("../models/Admin");
const Notification = require("../models/Notification");

// @desc  Get faults assigned to this technician
// @route GET /api/technician/faults
const getTechFaults = async (req, res) => {
  try {
    const techId = req.tech.id;
    const name   = req.tech.name;
    const city   = req.tech.city;
    const faults = await FaultLog.find({
      city: { $regex: new RegExp(`^${city}$`, "i") },
      resolved: false,
    }).sort({ fault_time: -1 });

    // BUG-4 FIX: Match by ID first, fall back to name for legacy records
    const myFaults = faults.filter(f =>
      (f.assigned_to_id && f.assigned_to_id.toString() === techId.toString()) ||
      (!f.assigned_to_id && f.assigned_to === name)
    );
    const unassigned    = faults.filter(f => !f.assigned_to);
    const urgent        = faults.filter(f => !f.resolved && (f.fault_type === "BULB_FUSE" || f.current_at_fault < 0.05));

    res.status(200).json({
      success: true,
      data: {
        assigned:   myFaults,
        unassigned: unassigned,
        urgent:     urgent,
        stats: {
          assigned:  myFaults.length,
          pending:   myFaults.filter(f => f.repair_status === "Pending" || !f.repair_status).length,
          inProgress:myFaults.filter(f => f.repair_status === "In Progress").length,
          completed: 0, // from history
          urgent:    urgent.length,
        }
      }
    });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// @desc  Get single fault detail with light info
// @route GET /api/technician/faults/:id
const getTechFaultDetail = async (req, res) => {
  try {
    const fault = await FaultLog.findById(req.params.id);
    if (!fault) return res.status(404).json({ success: false, message: "Fault not found" });

    const light = await Light.findOne({ light_id: fault.light_id });

    res.status(200).json({
      success: true,
      data: { fault, light: light || null }
    });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// @desc  Update fault repair status (Pending → In Progress → Resolved)
// @route PATCH /api/technician/faults/:id/status
const updateFaultStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const update = { repair_status: status };
    if (status === "In Progress") update.repair_started_at = new Date();
    if (status === "Resolved")    { update.resolved = true; update.resolved_at = new Date(); }

    // BUG-3 FIX: If resolving, check not already resolved
    const query = status === "Resolved"
      ? { _id: req.params.id, resolved: false }
      : { _id: req.params.id };
    const fault = await FaultLog.findOneAndUpdate(query, update, { new: true });
    if (!fault) return res.status(status === "Resolved" ? 409 : 404).json({ success: false, message: status === "Resolved" ? "Already resolved" : "Fault not found" });

    // If resolved, update light + notify admin
    if (status === "Resolved") {
      await Light.findOneAndUpdate({ light_id: fault.light_id }, { current_status: "IDLE" });
      const tech   = await Technician.findById(req.tech.id);
      const admins = await Admin.find({ city: { $regex: new RegExp(`^${fault.city}$`, "i") } });
      await Promise.all(admins.map(admin =>
        Notification.create({
          admin_id:   admin._id,
          city:       admin.city,
          type:       "FAULT_RESOLVED",
          title:      "✅ Fault Resolved",
          message:    `${fault.light_id} repair complete — ${tech?.name || "Technician"}`,
          light_id:   fault.light_id,
          fault_id:   fault._id,
          technician: tech?.name || "",
        })
      ));
    }

    res.status(200).json({ success: true, data: fault });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// @desc  Submit repair report (notes, parts used)
// @route PATCH /api/technician/faults/:id/repair
const submitRepair = async (req, res) => {
  try {
    const { notes, parts_used, action_taken } = req.body;
    // BUG-3 FIX: Only update if not already resolved (prevents double-resolve race condition)
    const fault = await FaultLog.findOneAndUpdate(
      { _id: req.params.id, resolved: false },
      {
        repair_notes:   notes,
        parts_used:     parts_used,
        action_taken:   action_taken,
        repair_status:  "Resolved",
        resolved:       true,
        resolved_at:    new Date(),
      },
      { new: true }
    );
    if (!fault) return res.status(409).json({ success: false, message: "Fault already resolved ya not found" });

      // Update light to IDLE after repair
    await Light.findOneAndUpdate({ light_id: fault.light_id }, { current_status: "IDLE" });

    // Notify all admins of this city
    const tech   = await Technician.findById(req.tech.id);
    const admins = await Admin.find({ city: { $regex: new RegExp(`^${fault.city}$`, "i") } });
    await Promise.all(admins.map(admin =>
      Notification.create({
        admin_id:   admin._id,
        city:       admin.city,
        type:       "FAULT_RESOLVED",
        title:      "✅ Fault Resolved",
        message:    `${fault.light_id} ka fault fix kar diya — ${tech?.name || "Technician"}`,
        light_id:   fault.light_id,
        fault_id:   fault._id,
        technician: tech?.name || "",
      })
    ));

    res.status(200).json({ success: true, message: "Repair submitted!", data: fault });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// @desc  Get technician's repair history (resolved faults)
// @route GET /api/technician/history
const getTechHistory = async (req, res) => {
  try {
    const name = req.tech.name;
    const city = req.tech.city;
    const history = await FaultLog.find({
      city:     { $regex: new RegExp(`^${city}$`, "i") },
      resolved: true,
      $or: [
        { assigned_to_id: req.tech.id },
        { assigned_to_id: null, assigned_to: name }, // BUG-4 FIX: legacy name fallback
      ],
    }).sort({ resolved_at: -1 }).limit(50);

    res.status(200).json({ success: true, count: history.length, data: history });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// @desc  Get technician profile + stats
// @route GET /api/technician/profile
const getTechProfile = async (req, res) => {
  try {
    const tech = await Technician.findById(req.tech.id);
    const name = tech.name;
    const city = tech.city;

    const idFilter = { $or: [{ assigned_to_id: tech._id }, { assigned_to_id: null, assigned_to: name }] };
    const cityF    = { city: { $regex: new RegExp(`^${city}$`, "i") } };
    const [assigned, completed] = await Promise.all([
      FaultLog.countDocuments({ ...cityF, ...idFilter, resolved: false }),
      FaultLog.countDocuments({ ...cityF, ...idFilter, resolved: true  }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        ...tech.toObject(),
        stats: { assigned, completed, totalHandled: assigned + completed }
      }
    });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// @desc  Get notifications (recent unresolved faults in city)
// @route GET /api/technician/notifications
const getTechNotifications = async (req, res) => {
  try {
    const city = req.tech.city;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await FaultLog.find({
      city:       { $regex: new RegExp(`^${city}$`, "i") },
      resolved:   false,
      fault_time: { $gte: since },
    }).sort({ fault_time: -1 }).limit(10);

    const notifications = recent.map(f => ({
      id:       f._id,
      title:    f.assigned_to ? `Fault Assigned to ${f.assigned_to}` : "New Fault Detected",
      message:  `Light ${f.light_id} — ${f.fault_type?.replace("_", " ")}`,
      location: f.location?.address || f.city,
      time:     f.fault_time,
      priority: f.current_at_fault < 0.05 ? "High" : "Normal",
      light_id: f.light_id,
    }));

    res.status(200).json({ success: true, data: notifications });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// @desc  Get all lights + faults for technician map
// @route GET /api/technician/map
const getTechMapData = async (req, res) => {
  try {
    const city = req.tech.city;
    const cityFilter = { city: { $regex: new RegExp(`^${city}$`, "i") } };

    const [lights, faults] = await Promise.all([
      Light.find(cityFilter).select("light_id controller_id location current_status motion_detected last_updated current_usage"),
      FaultLog.find({ ...cityFilter, resolved: false }).select("_id light_id fault_type location assigned_to repair_status fault_time"),
    ]);

    // Merge fault info into lights
    const faultMap = {};
    faults.forEach(f => { faultMap[f.light_id] = f; });

    const lightsWithFault = lights.map(l => ({
      ...l.toObject(),
      fault: faultMap[l.light_id] || null,
    }));

    res.status(200).json({ success: true, data: { lights: lightsWithFault, faults } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

module.exports = { getTechFaults, getTechFaultDetail, updateFaultStatus, submitRepair, getTechHistory, getTechProfile, getTechNotifications, getTechMapData };
