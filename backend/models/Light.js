const mongoose = require("mongoose");

const lightSchema = new mongoose.Schema(
  {
    light_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    controller_id: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, default: "" },
    },
    current_status: {
      type: String,
      enum: ["DAY_OFF", "IDLE", "ON", "FAULT", "OFFLINE"],
      default: "DAY_OFF",
    },
    current_usage: {
      type: Number,
      default: 0,
    },
    motion_detected: {
      type: Boolean,
      default: false,
    },
    last_updated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Light", lightSchema);
