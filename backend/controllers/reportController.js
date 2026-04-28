const PDFDocument = require("pdfkit");
const Light            = require("../models/Light");
const FaultLog         = require("../models/FaultLog");
const ControllerMetrics= require("../models/ControllerMetrics");
const HardwareDataLog  = require("../models/HardwareDataLog");

const cityFilter = (city) => city ? { city: { $regex: new RegExp(`^${city}$`, "i") } } : {};

// Helper: draw PDF header
const drawHeader = (doc, title, city) => {
  doc.rect(0, 0, doc.page.width, 80).fill("#0a1628");
  doc.fillColor("#3b82f6").fontSize(20).font("Helvetica-Bold").text("🏙️ Smart Street Light System", 40, 20);
  doc.fillColor("#94a3b8").fontSize(11).font("Helvetica").text(`${title} — ${city}`, 40, 48);
  doc.fillColor("#64748b").fontSize(9).text(`Generated: ${new Date().toLocaleString("en-IN")}`, 40, 63);
  doc.fillColor("#1e3558").rect(0, 80, doc.page.width, 2).fill();
  doc.moveDown(3);
};

// Helper: section title
const sectionTitle = (doc, text) => {
  doc.moveDown(0.5);
  doc.fillColor("#3b82f6").fontSize(13).font("Helvetica-Bold").text(text);
  doc.fillColor("#1e3558").moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
  doc.moveDown(0.5);
};

// Helper: stat row
const statRow = (doc, label, value, color = "#e2e8f0") => {
  doc.fillColor("#94a3b8").fontSize(10).font("Helvetica").text(label, 50, doc.y, { continued: true, width: 250 });
  doc.fillColor(color).font("Helvetica-Bold").text(String(value), { align: "right" });
};

// Helper: table row
const tableRow = (doc, cols, y, isHeader = false) => {
  const widths = [80, 100, 90, 90, 80, 100];
  let x = 40;
  cols.forEach((col, i) => {
    doc.fillColor(isHeader ? "#3b82f6" : "#e2e8f0")
       .fontSize(isHeader ? 9 : 9)
       .font(isHeader ? "Helvetica-Bold" : "Helvetica")
       .text(String(col).slice(0, 18), x + 3, y + 3, { width: widths[i] - 6, ellipsis: true });
    x += widths[i];
  });
};

// ─────────────────────────────────────────────
// @route GET /api/reports/energy
// ─────────────────────────────────────────────
const downloadEnergyReport = async (req, res) => {
  try {
    const city   = req.admin.city;
    const filter = cityFilter(city);
    const since  = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [lights, logs] = await Promise.all([
      Light.find(filter),
      HardwareDataLog.find({ ...filter, timestamp: { $gte: since }, status: "ON" }).select("current_usage timestamp light_id"),
    ]);

    const onLights   = lights.filter(l => l.current_status === "ON");
    const totalKWh   = logs.reduce((s, l) => s + (l.current_usage || 0) * 220 / 1000, 0);
    const costEst    = Math.round(totalKWh * 8.5);

    // Group kWh by day
    const dayMap = {};
    logs.forEach(log => {
      const day = new Date(log.timestamp).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" });
      dayMap[day] = (dayMap[day] || 0) + (log.current_usage || 0) * 220 / 1000;
    });

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="energy-report-${city}-${Date.now()}.pdf"`);
    doc.pipe(res);

    drawHeader(doc, "Energy Analytics Report", city);

    sectionTitle(doc, "Summary");
    statRow(doc, "Total Lights",          lights.length);
    statRow(doc, "Currently Active (ON)", onLights.length, "#4ade80");
    statRow(doc, "Total kWh (Last 7 days)", totalKWh.toFixed(2) + " kWh", "#60a5fa");
    statRow(doc, "Estimated Cost",        "₹ " + costEst, "#fbbf24");
    statRow(doc, "Rate per kWh",          "₹ 8.5");
    statRow(doc, "Report Period",         "Last 7 Days");

    sectionTitle(doc, "Daily Usage Breakdown");
    if (Object.keys(dayMap).length === 0) {
      doc.fillColor("#64748b").fontSize(10).text("No energy data available for this period.", 50);
    } else {
      // Header
      const rowY = doc.y;
      doc.rect(40, rowY, 515, 18).fill("#0f1f36");
      tableRow(doc, ["Day", "kWh Used", "Est. Cost (₹)", "", "", ""], rowY, true);
      doc.moveDown(1.2);

      Object.entries(dayMap).forEach(([day, kwh], i) => {
        const y = doc.y;
        if (i % 2 === 0) doc.rect(40, y, 515, 18).fill("#0a1628");
        tableRow(doc, [day, kwh.toFixed(2), Math.round(kwh * 8.5), "", "", ""], y);
        doc.moveDown(1.2);
      });
    }

    sectionTitle(doc, "Active Lights List");
    const headerY = doc.y;
    doc.rect(40, headerY, 515, 18).fill("#0f1f36");
    tableRow(doc, ["Light ID", "Controller", "Status", "Current (A)", "Motion", "Last Update"], headerY, true);
    doc.moveDown(1.2);

    onLights.slice(0, 20).forEach((l, i) => {
      const y = doc.y;
      if (i % 2 === 0) doc.rect(40, y, 515, 18).fill("#0a1628");
      tableRow(doc, [
        l.light_id, l.controller_id, l.current_status,
        l.current_usage, l.motion_detected ? "Yes" : "No",
        new Date(l.last_updated).toLocaleTimeString("en-IN"),
      ], y);
      doc.moveDown(1.2);
    });

    doc.end();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────
// @route GET /api/reports/fault
// ─────────────────────────────────────────────
const downloadFaultReport = async (req, res) => {
  try {
    const city   = req.admin.city;
    const filter = cityFilter(city);

    const faults = await FaultLog.find(filter).sort({ fault_time: -1 }).limit(100);
    const active   = faults.filter(f => !f.resolved);
    const resolved = faults.filter(f => f.resolved);

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="fault-report-${city}-${Date.now()}.pdf"`);
    doc.pipe(res);

    drawHeader(doc, "Fault Alerts Report", city);

    sectionTitle(doc, "Summary");
    statRow(doc, "Total Faults (All Time)", faults.length);
    statRow(doc, "Active / Unresolved",     active.length,   "#f87171");
    statRow(doc, "Resolved",                resolved.length, "#4ade80");
    statRow(doc, "Resolution Rate",         faults.length > 0 ? Math.round((resolved.length / faults.length) * 100) + "%" : "N/A", "#60a5fa");

    sectionTitle(doc, "Active Faults");
    if (active.length === 0) {
      doc.fillColor("#4ade80").fontSize(10).text("✓ No active faults — all clear!", 50);
      doc.moveDown();
    } else {
      const hy = doc.y;
      doc.rect(40, hy, 515, 18).fill("#0f1f36");
      tableRow(doc, ["Light ID", "Controller", "Fault Type", "Detected", "Current(A)", "Location"], hy, true);
      doc.moveDown(1.2);
      active.slice(0, 15).forEach((f, i) => {
        const y = doc.y;
        if (i % 2 === 0) doc.rect(40, y, 515, 18).fill("#0a1628");
        tableRow(doc, [
          f.light_id, f.controller_id,
          f.fault_type?.replace("_", " "),
          new Date(f.fault_time).toLocaleDateString("en-IN"),
          f.current_at_fault,
          f.location?.address || city,
        ], y);
        doc.moveDown(1.2);
      });
    }

    sectionTitle(doc, "Recently Resolved Faults");
    if (resolved.length === 0) {
      doc.fillColor("#64748b").fontSize(10).text("No resolved faults yet.", 50);
    } else {
      const hy2 = doc.y;
      doc.rect(40, hy2, 515, 18).fill("#0f1f36");
      tableRow(doc, ["Light ID", "Fault Type", "Resolved On", "Assigned To", "Parts Used", "Location"], hy2, true);
      doc.moveDown(1.2);
      resolved.slice(0, 15).forEach((f, i) => {
        const y = doc.y;
        if (i % 2 === 0) doc.rect(40, y, 515, 18).fill("#0a1628");
        tableRow(doc, [
          f.light_id,
          f.fault_type?.replace("_", " "),
          f.resolved_at ? new Date(f.resolved_at).toLocaleDateString("en-IN") : "—",
          f.assigned_to || "—",
          f.parts_used  || "—",
          f.location?.address || city,
        ], y);
        doc.moveDown(1.2);
      });
    }

    doc.end();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────
// @route GET /api/reports/monthly
// ─────────────────────────────────────────────
const downloadMonthlySummary = async (req, res) => {
  try {
    const city   = req.admin.city;
    const filter = cityFilter(city);
    const since  = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [lights, faults, controllers, logs] = await Promise.all([
      Light.find(filter),
      FaultLog.find({ ...filter, fault_time: { $gte: since } }),
      ControllerMetrics.find(filter),
      HardwareDataLog.find({ ...filter, timestamp: { $gte: since }, status: "ON" }).select("current_usage"),
    ]);

    const totalKWh = logs.reduce((s, l) => s + (l.current_usage || 0) * 220 / 1000, 0);

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="monthly-summary-${city}-${Date.now()}.pdf"`);
    doc.pipe(res);

    drawHeader(doc, "Monthly Summary Report", city);

    sectionTitle(doc, "Infrastructure Overview");
    statRow(doc, "Total Street Lights",   lights.length);
    statRow(doc, "Active (ON)",           lights.filter(l => l.current_status === "ON").length,      "#4ade80");
    statRow(doc, "IDLE",                  lights.filter(l => l.current_status === "IDLE").length,    "#fbbf24");
    statRow(doc, "Faulty",                lights.filter(l => l.current_status === "FAULT").length,   "#f87171");
    statRow(doc, "Day OFF",               lights.filter(l => l.current_status === "DAY_OFF").length, "#94a3b8");
    statRow(doc, "Total Controllers",     controllers.length);
    statRow(doc, "Online Controllers",    controllers.filter(c => c.is_online).length, "#4ade80");

    sectionTitle(doc, "Maintenance (Last 30 Days)");
    statRow(doc, "Total Faults Reported", faults.length);
    statRow(doc, "Resolved",              faults.filter(f => f.resolved).length,  "#4ade80");
    statRow(doc, "Still Active",          faults.filter(f => !f.resolved).length, "#f87171");
    const avgResolve = faults.filter(f => f.resolved && f.resolved_at).map(f => new Date(f.resolved_at) - new Date(f.fault_time));
    const avgHrs = avgResolve.length > 0 ? (avgResolve.reduce((a, b) => a + b, 0) / avgResolve.length / 3600000).toFixed(1) : "N/A";
    statRow(doc, "Avg Resolution Time",   avgHrs === "N/A" ? "N/A" : avgHrs + " hrs");

    sectionTitle(doc, "Energy (Last 30 Days)");
    statRow(doc, "Total Consumption",     totalKWh.toFixed(2) + " kWh", "#60a5fa");
    statRow(doc, "Estimated Cost",        "₹ " + Math.round(totalKWh * 8.5), "#fbbf24");
    statRow(doc, "Avg Daily Usage",       (totalKWh / 30).toFixed(2) + " kWh/day");

    doc.end();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────
// @route GET /api/reports/controller
// ─────────────────────────────────────────────
const downloadControllerReport = async (req, res) => {
  try {
    const city        = req.admin.city;
    const filter      = cityFilter(city);
    const controllers = await ControllerMetrics.find(filter).sort({ is_online: -1 });

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="controller-report-${city}-${Date.now()}.pdf"`);
    doc.pipe(res);

    drawHeader(doc, "Controller Health Report", city);

    sectionTitle(doc, "Summary");
    statRow(doc, "Total Controllers",  controllers.length);
    statRow(doc, "Online",             controllers.filter(c => c.is_online).length,  "#4ade80");
    statRow(doc, "Offline",            controllers.filter(c => !c.is_online).length, "#f87171");
    statRow(doc, "Total WDT Resets",   controllers.reduce((s, c) => s + (c.watchdog_resets || 0), 0), "#fbbf24");

    sectionTitle(doc, "Controller Details");
    if (controllers.length === 0) {
      doc.fillColor("#64748b").fontSize(10).text("No controllers found.", 50);
    } else {
      const hy = doc.y;
      doc.rect(40, hy, 515, 18).fill("#0f1f36");
      tableRow(doc, ["Controller ID", "Status", "WiFi RSSI", "Free Heap", "WDT Resets", "Last Ping"], hy, true);
      doc.moveDown(1.2);
      controllers.forEach((c, i) => {
        const y = doc.y;
        if (i % 2 === 0) doc.rect(40, y, 515, 18).fill("#0a1628");
        const secAgo = Math.floor((Date.now() - new Date(c.last_ping)) / 1000);
        tableRow(doc, [
          c.controller_id,
          c.is_online ? "Online" : "Offline",
          c.wifi_rssi + " dBm",
          (c.free_heap / 1024).toFixed(0) + " KB",
          c.watchdog_resets || 0,
          secAgo + "s ago",
        ], y);
        doc.moveDown(1.2);
      });
    }

    doc.end();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { downloadEnergyReport, downloadFaultReport, downloadMonthlySummary, downloadControllerReport };
