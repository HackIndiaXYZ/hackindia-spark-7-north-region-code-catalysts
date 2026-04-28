const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const Technician = require("../models/Technician");

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token)
      return res.status(401).json({ success: false, message: "Login required" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type === "technician") {
      const tech = await Technician.findById(decoded.id);
      if (!tech || !tech.is_active)
        return res.status(401).json({ success: false, message: "Unauthorized" });
      req.admin = { id: tech._id, name: tech.name, city: tech.city, role: "technician", type: "technician" };
      req.tech  = { id: tech._id, name: tech.name, city: tech.city };
    } else {
      const admin = await Admin.findById(decoded.id);
      if (!admin)
        return res.status(401).json({ success: false, message: "Unauthorized" });
      req.admin = { id: admin._id, city: admin.city, role: admin.role, type: "admin" };
    }
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "Invalid token" });
  }
};

// Only admin can access (not technician)
const adminOnly = (req, res, next) => {
  if (req.admin.type !== "admin")
    return res.status(403).json({ success: false, message: "Admin access required" });
  next();
};

const technicianOnly = (req, res, next) => {
  if (req.admin.type !== "technician")
    return res.status(403).json({ success: false, message: "Technician access only" });
  next();
};

module.exports = { protect, adminOnly, technicianOnly };
