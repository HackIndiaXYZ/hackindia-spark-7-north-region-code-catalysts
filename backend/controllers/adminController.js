const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const Technician = require("../models/Technician");

const ADMIN_EMAIL_DOMAIN = "@smartlight.gov.in"; // Only this domain can register as admin

const generateToken = (id, type = "admin") => {
  return jwt.sign({ id, type }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

// @desc    Register new admin — only @smartlight.gov.in emails allowed
// @route   POST /api/auth/signup
const signup = async (req, res) => {
  try {
    const { name, email, password, city, role } = req.body;

    // Email domain check
    if (!email.endsWith(ADMIN_EMAIL_DOMAIN)) {
      return res.status(403).json({
        success: false,
        message: `Admin registration ke liye sirf ${ADMIN_EMAIL_DOMAIN} email allowed hai`,
      });
    }

    const existing = await Admin.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already registered hai" });
    }

    const admin = await Admin.create({ name, email, password, city, role: role || "cityadmin" });
    const token = generateToken(admin._id, "admin");

    res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      token,
      admin: { id: admin._id, name: admin.name, email: admin.email, city: admin.city, role: admin.role, type: "admin" },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Admin login
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email aur password required hain" });

    const admin = await Admin.findOne({ email }).select("+password");
    if (!admin)
      return res.status(401).json({ success: false, message: "Invalid credentials" });

    const isMatch = await admin.comparePassword(password);
    if (!isMatch)
      return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = generateToken(admin._id, "admin");
    res.status(200).json({
      success: true,
      token,
      admin: { id: admin._id, name: admin.name, email: admin.email, city: admin.city, role: admin.role, type: "admin" },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Technician login
// @route   POST /api/auth/technician/login
const technicianLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email aur password required hain" });

    const tech = await Technician.findOne({ email }).select("+password");
    if (!tech)
      return res.status(401).json({ success: false, message: "Invalid credentials" });

    if (!tech.is_active)
      return res.status(403).json({ success: false, message: "Account disabled hai — admin se contact karo" });

    const isMatch = await tech.comparePassword(password);
    if (!isMatch)
      return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = generateToken(tech._id, "technician");
    res.status(200).json({
      success: true,
      token,
      admin: { id: tech._id, name: tech.name, email: tech.email, city: tech.city, role: "technician", type: "technician" },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Admin adds a new technician
// @route   POST /api/auth/technician/add
const addTechnician = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // City ALWAYS admin ki city hogi — koi aur city allowed nahi
    const adminCity = req.admin.city;

    const existing = await Technician.findOne({ email });
    if (existing)
      return res.status(400).json({ success: false, message: "Email already registered hai" });

    const tech = await Technician.create({
      name, email, password, phone,
      city: adminCity,
      added_by: req.admin.id,
    });

    res.status(201).json({
      success: true,
      message: "Technician added successfully",
      data: { id: tech._id, name: tech.name, email: tech.email, phone: tech.phone, city: tech.city, is_active: tech.is_active },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all technicians (admin only)
// @route   GET /api/auth/technicians
const getTechnicians = async (req, res) => {
  try {
    const city = req.admin.city;
    const techs = await Technician.find({ city: { $regex: new RegExp(`^${city}$`, "i") } }).select("-password");
    res.status(200).json({ success: true, count: techs.length, data: techs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle technician active/inactive
// @route   PATCH /api/auth/technician/:id/toggle
const toggleTechnician = async (req, res) => {
  try {
    const tech = await Technician.findById(req.params.id);
    if (!tech) return res.status(404).json({ success: false, message: "Technician not found" });
    tech.is_active = !tech.is_active;
    await tech.save();
    res.status(200).json({ success: true, message: `Technician ${tech.is_active ? "activated" : "deactivated"}`, data: tech });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete technician
// @route   DELETE /api/auth/technician/:id
const deleteTechnician = async (req, res) => {
  try {
    await Technician.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Technician deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get me
// @route   GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id);
    res.status(200).json({ success: true, admin });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { signup, login, technicianLogin, addTechnician, getTechnicians, toggleTechnician, deleteTechnician, getMe };
