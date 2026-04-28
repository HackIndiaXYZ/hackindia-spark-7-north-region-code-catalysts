const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const { markOfflineControllers } = require("./controllers/hardwareController");

// Load env vars
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middlewares
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api", require("./routes/apiRoutes"));
app.use("/api/hardware", require("./routes/hardwareRoutes"));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", uptime: process.uptime(), timestamp: new Date() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Internal server error" });
});

// ⏱️ Cron: Har 15 second mein offline controllers mark karo
setInterval(markOfflineControllers, 15000);

const PORT = process.env.PORT || 5000;

const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.log(`⚠️ Port ${port} is busy. Attempting to free it...`);
      const { execSync } = require("child_process");
      try {
        // Windows: find and kill the process on the port
        const result = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
        const lines = result.trim().split("\n");
        const pids = new Set();
        lines.forEach((line) => {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== "0" && pid !== String(process.pid)) pids.add(pid);
        });
        pids.forEach((pid) => {
          try {
            execSync(`taskkill /PID ${pid} /F`, { encoding: "utf8" });
            console.log(`✅ Killed process ${pid} on port ${port}`);
          } catch {}
        });
        // Retry after a short delay
        setTimeout(() => startServer(port), 1500);
      } catch (e) {
        console.error(`❌ Could not free port ${port}. Please manually kill the process.`);
        process.exit(1);
      }
    } else {
      console.error("Server error:", err);
      process.exit(1);
    }
  });
};

startServer(PORT);
