const mongoose = require("mongoose");

const hardwareDataLogSchema = new mongoose.Schema(
  {
    light_id: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    controller_id: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["DAY_OFF", "IDLE", "ON", "FAULT"],
      required: true,
    },
    current_usage: {
      type: Number,
      default: 0,
    },
    motion_detected: {
      type: Boolean,
      default: false,
    },
    ldr_value: {
      type: Number,
      default: 0,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: false }
);

// TTL index — logs automatically delete after 30 days
hardwareDataLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model("HardwareDataLog", hardwareDataLogSchema);
