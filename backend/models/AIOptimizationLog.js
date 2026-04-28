const mongoose = require("mongoose");

const aiOptimizationLogSchema = new mongoose.Schema({
  light_id:           { type: String, required: true, trim: true, index: true },
  controller_id:      { type: String, required: true, trim: true },
  city:               { type: String, required: true, trim: true },
  analyzed_at:        { type: Date, default: Date.now },

  // Input snapshot
  input: {
    latitude:           { type: Number },
    longitude:          { type: Number },
    current_intensity:  { type: Number },   // %
    motion_detected:    { type: Boolean },
    traffic_density:    { type: Number },   // 0–100
    occupancy_count:    { type: Number },
    ambient_light_lux:  { type: Number },
    time_of_day:        { type: String },   // Morning/Afternoon/Evening/Night
    weather_condition:  { type: String },   // Clear/Cloudy/Rainy/Foggy
    temperature_celsius:{ type: Number },
    energy_kwh:         { type: Number },
    nearby_light_count: { type: Number },
    coverage_gap:       { type: Number },   // 0–1 score
    is_faulty:          { type: Boolean },
    is_offline:         { type: Boolean },
  },

  // AI outputs
  recommended_intensity: { type: Number },  // %
  status: {
    type: String,
    enum: ["Normal","Low Activity","High Activity","Under-Lit","Faulty","Offline"],
    default: "Normal",
  },
  action: {
    type: String,
    enum: ["Maintain","Adjust Intensity","Assign Technician","Install New Light","Redistribute Load"],
    default: "Maintain",
  },
  explanation:    { type: String, default: "" },
  priority:       { type: String, enum: ["Low","Medium","High","Critical"], default: "Low" },
  energy_saved_pct: { type: Number, default: 0 },   // estimated % savings vs current
  task_created:   { type: Boolean, default: false },
  task_fault_id:  { type: mongoose.Schema.Types.ObjectId, ref: "FaultLog", default: null },

}, { timestamps: true });

aiOptimizationLogSchema.index({ city: 1, analyzed_at: -1 });

module.exports = mongoose.model("AIOptimizationLog", aiOptimizationLogSchema);
