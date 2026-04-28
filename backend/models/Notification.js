const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  admin_id:   { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
  city:       { type: String, required: true },
  type:       { type: String, enum: ["FAULT_RESOLVED", "FAULT_NEW", "FAULT_ASSIGNED"], required: true },
  title:      { type: String, required: true },
  message:    { type: String, required: true },
  light_id:   { type: String, default: "" },
  fault_id:   { type: mongoose.Schema.Types.ObjectId, ref: "FaultLog" },
  technician: { type: String, default: "" },
  is_read:    { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("Notification", notificationSchema);
