const mongoose = require("mongoose");

const controllerMetricsSchema = new mongoose.Schema(
  {
    controller_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    wifi_rssi: {
      type: Number,
      default: 0,
    },
    free_heap: {
      type: Number,
      default: 0,
    },
    ip_address: {
      type: String,
      default: "",
    },
    last_ping: {
      type: Date,
      default: Date.now,
    },
    is_online: {
      type: Boolean,
      default: true,
    },
    watchdog_resets: {
      type: Number,
      default: 0,
    },
    last_reset_reason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ControllerMetrics", controllerMetricsSchema);
