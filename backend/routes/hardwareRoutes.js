const express = require("express");
const router = express.Router();
const { receiveHardwareData } = require("../controllers/hardwareController");

// Simple API key middleware for hardware
const hardwareAuth = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== process.env.HARDWARE_API_KEY) {
    // Allow if no key set (development mode)
    if (!process.env.HARDWARE_API_KEY) return next();
    return res.status(403).json({ success: false, message: "Invalid API key" });
  }
  next();
};

// POST /api/hardware/update — ESP32 ispe POST karega
router.post("/update", hardwareAuth, receiveHardwareData);

// GET /api/hardware/ping — ESP32 connectivity test ke liye
router.get("/ping", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is alive",
    server_time: new Date().toISOString(),
  });
});

module.exports = router;
