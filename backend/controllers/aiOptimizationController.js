/**
 * AI Smart Street Light Optimization Engine
 * Analyses every light in the city and produces:
 *   - recommended_intensity, status, action, explanation, priority
 * Uses real Light + FaultLog data, enriched with synthetic features derived
 * from the smart_lighting_dataset_2024.csv distribution.
 */

const Light             = require("../models/Light");
const FaultLog          = require("../models/FaultLog");
const Technician        = require("../models/Technician");
const Notification      = require("../models/Notification");
const AIOptimizationLog = require("../models/AIOptimizationLog");

// ─────────────────────────────────────────────
// Deterministic-seeded PRNG (no randomness each run)
// ─────────────────────────────────────────────
function seededRand(seed) {
  let s = Math.abs(seed) % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i);
  return Math.abs(h);
}

// ─────────────────────────────────────────────
// Synthetic feature generation (dataset-calibrated)
// ─────────────────────────────────────────────
function generateSyntheticFeatures(light, hour, rand) {
  const lat = light.location?.lat || 0;
  const lng = light.location?.lng || 0;

  // nearby_light_count: 2–8, geographically seeded
  const nearby_light_count = 2 + Math.floor(rand() * 6);

  // coverage_gap: 0.0–1.0 (higher = bigger gap)
  const base_gap = 0.1 + rand() * 0.7;
  const coverage_gap = parseFloat(base_gap.toFixed(2));

  // traffic_density 0–60 (dataset median ≈25, higher during peak hours)
  const peak = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20);
  const traffic_density = parseFloat(
    Math.min(99, (peak ? 25 : 8) + rand() * (peak ? 40 : 20)).toFixed(1)
  );

  // occupancy_count 0–30
  const occupancy_count = Math.round(
    (peak ? 8 : 2) + rand() * (peak ? 20 : 8)
  );

  // ambient_light_lux: night ≈0-500, day 4000–12000
  const night = hour < 6 || hour >= 20;
  const ambient_light_lux = night
    ? parseFloat((rand() * 600).toFixed(1))
    : parseFloat((3500 + rand() * 8000).toFixed(1));

  // avg_pedestrian_speed 0–5
  const avg_pedestrian_speed = parseFloat((rand() * 5).toFixed(2));

  // energy_kwh 0.3–2.7 (dataset range)
  const energy_kwh = parseFloat((0.3 + rand() * 2.4).toFixed(3));

  // weather: weighted Clear 50%, Cloudy 20%, Rainy 15%, Foggy 15%
  const wv = rand();
  const weather_condition =
    wv < 0.5 ? "Clear" : wv < 0.7 ? "Cloudy" : wv < 0.85 ? "Rainy" : "Foggy";

  // temperature –6 to 45
  const temperature_celsius = parseFloat((-6 + rand() * 51).toFixed(1));

  // under_lit: true if coverage_gap > 0.6 and ambient < 500
  const under_lit = coverage_gap > 0.6 && ambient_light_lux < 500;

  // required_intensity: based on conditions
  let required_intensity = 50;
  if (night) required_intensity = 70 + rand() * 30;
  else required_intensity = 20 + rand() * 40;
  if (weather_condition === "Foggy" || weather_condition === "Rainy")
    required_intensity = Math.min(100, required_intensity + 15);
  required_intensity = parseFloat(required_intensity.toFixed(1));

  return {
    nearby_light_count,
    coverage_gap,
    traffic_density,
    occupancy_count,
    ambient_light_lux,
    avg_pedestrian_speed,
    energy_kwh,
    weather_condition,
    temperature_celsius,
    under_lit,
    required_intensity,
  };
}

// ─────────────────────────────────────────────
// Time-of-day helpers
// ─────────────────────────────────────────────
function getTimeOfDay(hour) {
  if (hour >= 6  && hour < 12) return "Morning";
  if (hour >= 12 && hour < 17) return "Afternoon";
  if (hour >= 17 && hour < 20) return "Evening";
  return "Night";
}

function isNightTime(tod) {
  return tod === "Night" || tod === "Evening";
}

// ─────────────────────────────────────────────
// Map ML prediction to UI format
// ─────────────────────────────────────────────
function mapMLPredictionToDecision(input, mlPrediction) {
  const { current_intensity, is_faulty, current_status, nearby_light_count, coverage_gap, under_lit } = input;
  const { recommended_intensity, action_class } = mlPrediction;

  // Only override ML for lights with confirmed FAULT status in the database
  if (current_status === "FAULT" && is_faulty) {
    if (nearby_light_count >= 3) {
      return {
        recommended_intensity: 0, status: "Offline", action: "Redistribute Load",
        priority: "Critical",
        explanation: `Light has active hardware fault. ${nearby_light_count} nearby lights will compensate while repair is pending.`,
        energy_saved_pct: 100
      };
    }
    return {
      recommended_intensity: 0, status: "Faulty", action: "Assign Technician",
      priority: "Critical",
      explanation: `Light has confirmed hardware fault with poor nearby coverage (${nearby_light_count} neighbors). Urgent repair needed.`,
      energy_saved_pct: 0
    };
  }

  let status = "Normal";
  let action = "Maintain";
  let priority = "Low";
  let explanation = `ML model recommended intensity: ${recommended_intensity}%.`;

  if (action_class === 0) {
    status = "Low Activity";
    action = "Adjust Intensity";
    priority = "Low";
    explanation = `Low activity detected — dimming to ${recommended_intensity}% to save energy. Traffic & pedestrian levels are minimal.`;
  } else if (action_class === 1) {
    status = "High Activity";
    action = "Adjust Intensity";
    priority = "Medium";
    explanation = `High activity zone — boosting intensity to ${recommended_intensity}% for safety. Elevated traffic and pedestrian movement detected.`;
  } else if (action_class === 2) {
    status = "Under-Lit";
    action = "Install New Light";
    priority = "High";
    explanation = `Under-lit zone identified (coverage gap: ${(coverage_gap * 100).toFixed(0)}%). Recommend installing additional lights to ensure uniform illumination.`;
  }

  // If the light has FAULT status but no fault log, it might be a transient issue
  if (current_status === "FAULT" && !is_faulty) {
    status = "Faulty";
    action = "Assign Technician";
    priority = "High";
    explanation = `Light is reporting FAULT status. Inspection recommended — may be a transient hardware issue.`;
  }

  // If intensity difference is negligible, just maintain
  if (action_class !== 2 && current_status !== "FAULT" && Math.abs(current_intensity - recommended_intensity) < 5) {
    action = "Maintain";
    status = "Normal";
    explanation = `Light is operating optimally at ${current_intensity}%. No adjustment needed.`;
  }

  const saved = Math.max(0, current_intensity - recommended_intensity);
  const pct = current_intensity > 0 ? parseFloat(((saved / current_intensity) * 100).toFixed(1)) : 0;

  return { recommended_intensity, status, action, priority, explanation, energy_saved_pct: pct };
}

// ─────────────────────────────────────────────
// Case-insensitive city filter (matches dashboard pattern)
// ─────────────────────────────────────────────
const cf = (city) => city ? { city: { $regex: new RegExp(`^${city}$`, "i") } } : {};

// ─────────────────────────────────────────────
// POST /api/ai/run  — Run full-city analysis
// ─────────────────────────────────────────────
exports.runOptimization = async (req, res) => {
  try {
    const adminCity = req.admin.city;
    const cityFilter = cf(adminCity);
    const lights    = await Light.find(cityFilter);
    if (!lights.length)
      return res.status(404).json({ success: false, message: "No lights found for city." });

    const activeFaults = await FaultLog.find({ ...cityFilter, resolved: false });
    const faultMap     = {};
    activeFaults.forEach(f => { faultMap[f.light_id] = f; });

    const technicians = await Technician.find({ ...cityFilter, is_active: true });

    const now  = new Date();
    const hour = now.getHours();
    const tod  = getTimeOfDay(hour);

    const results  = [];
    const bulkOps  = [];
    const lightInputs = [];
    const lightRefs = {};

    for (const light of lights) {
      const rand   = seededRand(hashString(light.light_id) + hour);
      const synth  = generateSyntheticFeatures(light, hour, rand);
      const faultDoc = faultMap[light.light_id];

      const input = {
        light_id:           light.light_id,
        latitude:           light.location?.lat,
        longitude:          light.location?.lng,
        current_intensity:  light.current_usage || 50,
        motion_detected:    light.motion_detected ? 1 : 0,
        traffic_density:    synth.traffic_density,
        occupancy_count:    synth.occupancy_count,
        ambient_light_lux:  synth.ambient_light_lux,
        time_of_day:        tod,
        weather_condition:  synth.weather_condition,
        temperature_celsius:synth.temperature_celsius,
        prev_hour_energy_usage_kwh: synth.energy_kwh,
        nearby_light_count: synth.nearby_light_count,
        coverage_gap:       synth.coverage_gap,
        avg_pedestrian_speed: synth.avg_pedestrian_speed,
        under_lit:          synth.under_lit,
        required_intensity: synth.required_intensity,
        is_faulty:          !!faultDoc,
        is_offline:         light.current_status === "FAULT",
        current_status:     light.current_status,
      };

      lightInputs.push(input);
      lightRefs[light.light_id] = { light, faultDoc, input, synth, rand };
    }

    // Call Python ML service
    let predictions = [];
    try {
      const mlResponse = await fetch("http://127.0.0.1:5001/predict_batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lightInputs),
      });
      const mlData = await mlResponse.json();
      if (mlData.success) {
        predictions = mlData.predictions;
      } else {
        throw new Error(mlData.error || "ML prediction failed");
      }
    } catch (err) {
      console.error("Python ML Server error:", err);
      return res.status(500).json({ success: false, message: "Python ML Service is unreachable or failed." });
    }

    // Process predictions and map to UI schema
    for (const pred of predictions) {
      const { light, faultDoc, input, synth, rand } = lightRefs[pred.light_id];
      const decision = mapMLPredictionToDecision(input, pred);

      // ── Auto-create fault/task if needed ──────────────
      let task_created  = false;
      let task_fault_id = null;

      if (
        (decision.action === "Assign Technician" || decision.action === "Install New Light") &&
        !faultDoc
      ) {
        const tech = technicians[Math.floor(rand() * technicians.length)];
        const newFault = await FaultLog.create({
          light_id:         light.light_id,
          controller_id:    light.controller_id,
          city:             light.city,
          fault_type:       decision.action === "Install New Light" ? "UNKNOWN" : "UNKNOWN",
          current_at_fault: light.current_usage,
          location:         light.location,
          assigned_to:      tech?.name || null,
          assigned_to_id:   tech?._id  || null,
          repair_status:    "Pending",
          repair_notes:     `[AI] ${decision.explanation}`,
        });
        task_created  = true;
        task_fault_id = newFault._id;

        // Notify admin
        if (req.admin.id) {
          await Notification.create({
            admin_id:   req.admin.id,
            city:       adminCity,
            type:       "FAULT_NEW",
            title:      `AI: ${decision.action} — ${light.light_id}`,
            message:    decision.explanation,
            light_id:   light.light_id,
            fault_id:   newFault._id,
            technician: tech?.name || "",
          });
        }
      }

      // ── Upsert log ─────────────────────────────────────
      bulkOps.push({
        updateOne: {
          filter: { light_id: light.light_id, city: adminCity },
          update: {
            $set: {
              controller_id:          light.controller_id,
              analyzed_at:            now,
              input,
              recommended_intensity:  decision.recommended_intensity,
              status:                 decision.status,
              action:                 decision.action,
              explanation:            decision.explanation,
              priority:               decision.priority,
              energy_saved_pct:       decision.energy_saved_pct,
              task_created,
              task_fault_id,
            },
          },
          upsert: true,
        },
      });

      results.push({
        light_id:              light.light_id,
        controller_id:         light.controller_id,
        location:              light.location,
        current_intensity:     input.current_intensity,
        recommended_intensity: decision.recommended_intensity,
        status:                decision.status,
        action:                decision.action,
        explanation:           decision.explanation,
        priority:              decision.priority,
        energy_saved_pct:      decision.energy_saved_pct,
        task_created,
        synth: {
          nearby_light_count:  input.nearby_light_count,
          coverage_gap:        input.coverage_gap,
          traffic_density:     input.traffic_density,
          ambient_light_lux:   input.ambient_light_lux,
          weather_condition:   input.weather_condition,
          time_of_day:         tod,
          under_lit:           input.under_lit,
        },
      });
    }

    if (bulkOps.length) await AIOptimizationLog.bulkWrite(bulkOps);

    // ── Summary stats ──────────────────────────────────────
    const summary = {
      total:           results.length,
      normal:          results.filter(r => r.status === "Normal").length,
      low_activity:    results.filter(r => r.status === "Low Activity").length,
      high_activity:   results.filter(r => r.status === "High Activity").length,
      under_lit:       results.filter(r => r.status === "Under-Lit").length,
      faulty:          results.filter(r => r.status === "Faulty" || r.status === "Offline").length,
      tasks_created:   results.filter(r => r.task_created).length,
      avg_energy_saved:results.length
        ? parseFloat((results.reduce((s, r) => s + r.energy_saved_pct, 0) / results.length).toFixed(1))
        : 0,
    };

    return res.json({ success: true, summary, results, analyzed_at: now });
  } catch (err) {
    console.error("AI Optimization error:", err);
    return res.status(500).json({ success: false, message: "Optimization engine failed." });
  }
};

// ─────────────────────────────────────────────
// GET /api/ai/results  — Fetch last run results
// ─────────────────────────────────────────────
exports.getOptimizationResults = async (req, res) => {
  try {
    const city = req.admin.city;
    const logs = await AIOptimizationLog.find(cf(city)).sort({ analyzed_at: -1 }).limit(1000).lean();

    if (!logs.length)
      return res.json({ success: true, message: "No analysis run yet.", results: [] });

    const analyzed_at = logs[0]?.analyzed_at;
    const summary = {
      total:           logs.length,
      normal:          logs.filter(l => l.status === "Normal").length,
      low_activity:    logs.filter(l => l.status === "Low Activity").length,
      high_activity:   logs.filter(l => l.status === "High Activity").length,
      under_lit:       logs.filter(l => l.status === "Under-Lit").length,
      faulty:          logs.filter(l => l.status === "Faulty" || l.status === "Offline").length,
      tasks_created:   logs.filter(l => l.task_created).length,
      avg_energy_saved:logs.length
        ? parseFloat((logs.reduce((s, l) => s + (l.energy_saved_pct || 0), 0) / logs.length).toFixed(1))
        : 0,
    };

    const results = logs.map(l => ({
      light_id:              l.light_id,
      controller_id:         l.controller_id,
      location:              l.input?.latitude ? { lat: l.input.latitude, lng: l.input.longitude } : null,
      current_intensity:     l.input?.current_intensity,
      recommended_intensity: l.recommended_intensity,
      status:                l.status,
      action:                l.action,
      explanation:           l.explanation,
      priority:              l.priority,
      energy_saved_pct:      l.energy_saved_pct,
      task_created:          l.task_created,
      synth: {
        nearby_light_count:  l.input?.nearby_light_count,
        coverage_gap:        l.input?.coverage_gap,
        traffic_density:     l.input?.traffic_density,
        ambient_light_lux:   l.input?.ambient_light_lux,
        weather_condition:   l.input?.weather_condition,
        time_of_day:         l.input?.time_of_day,
        under_lit:           l.input?.under_lit,
      },
    }));

    return res.json({ success: true, summary, results, analyzed_at });
  } catch (err) {
    console.error("Get AI results error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch results." });
  }
};
