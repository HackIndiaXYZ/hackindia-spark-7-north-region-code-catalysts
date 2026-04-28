const mongoose = require("mongoose");
const faultLogSchema = new mongoose.Schema({
  light_id:         { type: String, required: true, trim: true, index: true },
  controller_id:    { type: String, required: true, trim: true },
  city:             { type: String, required: true, trim: true },
  fault_type:       { type: String, enum: ["BULB_FUSE","WIRE_CUT","LOW_CURRENT","UNKNOWN"], default: "UNKNOWN" },
  current_at_fault: { type: Number, default: 0 },
  location:         { lat: { type: Number }, lng: { type: Number }, address: { type: String, default: "" } },
  resolved:         { type: Boolean, default: false },
  resolved_at:      { type: Date, default: null },
  assigned_to:      { type: String, default: null },
  assigned_to_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', default: null },
  repair_status:    { type: String, enum: ["Pending","In Progress","Resolved"], default: "Pending" },
  repair_notes:     { type: String, default: "" },
  parts_used:       { type: String, default: "" },
  action_taken:     { type: String, default: "" },
  repair_started_at:{ type: Date, default: null },
  fault_time:       { type: Date, default: Date.now },
}, { timestamps: true });
module.exports = mongoose.model("FaultLog", faultLogSchema);
