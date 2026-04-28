#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <esp_task_wdt.h>

//////////////////// CONFIG ////////////////////

// ┌──────────────────────────────────────────────────────────────────┐
// │  BOARD: ESP32 DevKit V1 (30-pin)                                 │
// │  Module: ESP-WROOM-32, WiFi + BT, ISM 2.4G 802.11/b/g/n          │
// │  USB: Micro-USB, FTDI FT232RQ chip                               │
// └──────────────────────────────────────────────────────────────────┘

// ┌──────────────────────────────────────────────────────────────────┐
// │  LDR MODULE: Digital Output (DO) only — no AO pin                │
// │  Threshold is set physically via the module's potentiometer.     │
// │  DO = HIGH → dark (night), DO = LOW → bright (day)               │
// │  If your module behaves inversely, flip LDR_NIGHT_IS_HIGH        │
// └──────────────────────────────────────────────────────────────────┘
#define LDR_NIGHT_IS_HIGH                                                      \
  true // true = DO HIGH means dark/night (most common)
       // false = DO HIGH means bright/day (flip if needed)

const char *ssid = "HimanshuIphone";
const char *password = "12345678";

const char *serverURL = "http://172.20.10.3:5000/api/hardware/update";

const char *hardwareApiKey = "esp32_hardware_key_2024";

// ── Sensor Pins ────────────────────────────────────────────────────
// ┌─────────────────────────────────────────────────────────────────┐
// │  30-Pin Board Pin Mapping (silkscreen → GPIO)                   │
// │  D34 → GPIO 34 (LDR DO)   │  D35 → GPIO 35 (Current Sense)      │
// │  D15 → GPIO 15 (PIR)      │  TX2 → GPIO 17 (LED PWM)            │
// │  VIN → ~5V from USB       │  3V3 → 3.3V regulated               │
// └─────────────────────────────────────────────────────────────────┘
#define LDR_PIN 34 // Digital – LDR module DO pin (board label: D34)
#define PIR_PIN 15 // Digital – PIR sensor        (board label: D15)
#define SENSE_PIN                                                              \
  35 // Analog – Current sense      (ADC1_CH7, board label: D35)
     // Reads voltage across 330Ω resistor in LED circuit

// ── Output Pin ───────────────────────────────
#define LED_PIN 17 // PWM LED output   (board label: TX2 = GPIO17)
//#define BYPASS_PIR // UNCOMMENT to bypass PIR (always motion=true).

// ── LED Brightness (PWM) ─────────────────────
#define PWM_FREQ 5000      // 5 kHz — smooth, no flicker
#define PWM_RESOLUTION 8   // 8-bit = 0–255
#define BRIGHTNESS_OFF 0   // DAY_OFF / FAULT
#define BRIGHTNESS_IDLE 50 // 20% dim — night, no motion
#define BRIGHTNESS_ON 255  // 100% full — night + motion detected

// ── ADC / Sensor ─────────────────────────────
#define ADC_RESOLUTION 4016.0 // 3.1V ceiling under DB_11 (not 4095)
#define ADC_REF_VOLT 3.1      // actual usable ceiling (not 3.3V)
#define SENSE_RESISTOR                                                         \
  330.0 // Ω — LED current-limiting resistor doubles as sense resistor

// ── Timing & Thresholds ──────────────────────
#define CONTROL_INTERVAL 300 // ms – sensor read + LED control
#define SEND_INTERVAL 5000   // ms – telemetry send to server
#define FAULT_LIMIT 3        // consecutive low-current reads before FAULT
#define FAULT_CLEAR_LIMIT 5  // consecutive good reads to auto-recover from FAULT

// ── PIR Debounce ─────────────────────────────
#define PIR_DEBOUNCE_COUNT                                                     \
  2 // consecutive LOW reads to clear motion (lower = faster off)

// ── Identity & Location ──────────────────────
String controllerID = "CTRL-01";
String lightID = "SL-001";
String city = "Fetching..."; // Will be auto-updated via IP
float latitude = 0.0;
float longitude = 0.0;

////////////////////////////////////////////////

unsigned long lastSendTime = 0;
unsigned long lastControlTime = 0;
unsigned long lastWifiCheckTime = 0; // Tracks last WiFi connection attempt
bool wifiWasConnected = false;       // Tracks connection state for clean logging
int faultCounter = 0;
int faultClearCounter = 0;
bool faultLatched = false;
bool lightState = false;
String status = "DAY_OFF";

// PIR debounce state
bool stablePIRState = false;
int pirStableCount = 0;

float currentThresholdON = 0.001;   // 1mA — full brightness threshold
float currentThresholdIDLE = 0.0002; // 0.2mA — dimmed brightness threshold

////////////////////////////////////////////////

void fetchLocation() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  Serial.println("Fetching location from IP...");
  HTTPClient http;
  http.setTimeout(4000); // 4-second timeout to avoid blocking too long
  http.begin("http://ip-api.com/json/");
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String payload = http.getString();
    JsonDocument doc;
    deserializeJson(doc, payload);
    
    if (doc["status"] == "success") {
      latitude = doc["lat"];
      longitude = doc["lon"];
      city = doc["city"].as<String>();
      
      Serial.printf("Auto-Location Fetched: City %s | Lat %.4f, Lng %.4f\n", city.c_str(), latitude, longitude);
    } else {
      Serial.println("Auto-Location Failed: API returned unsuccessful status.");
    }
  } else {
    Serial.printf("Auto-Location Failed: HTTP %d\n", httpCode);
  }
  http.end();
}

////////////////////////////////////////////////

void checkWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!wifiWasConnected) {
      wifiWasConnected = true;
      Serial.printf("\nWiFi connected! IP: %s\n",
                    WiFi.localIP().toString().c_str());
      
      fetchLocation(); // Fetch dynamic location once connected
    }
    return;
  }

  if (wifiWasConnected) {
    Serial.println("\nWiFi disconnected. Will retry in background...");
    wifiWasConnected = false;
  }

  unsigned long now = millis();
  if (now - lastWifiCheckTime >= 20000 || lastWifiCheckTime == 0) {
    lastWifiCheckTime = now;

    Serial.printf("\nAttempting WiFi connection to: '%s'...\n", ssid);
    WiFi.mode(WIFI_STA); // Station mode
    WiFi.disconnect();
    delay(100);
    WiFi.begin(ssid, password);
    WiFi.setAutoReconnect(true); // Let ESP32 background task handle it
  }
}

////////////////////////////////////////////////
// Real current sensing: reads voltage across 330Ω sense resistor
// and calculates actual current using Ohm's law (I = V / R)
float getSensedCurrent() {
  long sum = 0;
  for (int i = 0; i < 150; i++) {
    sum += analogRead(SENSE_PIN);
    delayMicroseconds(200);
  }
  float avg = sum / 150.0;
  avg = min(avg, (float)ADC_RESOLUTION);

  // Convert ADC reading to voltage
  float voltage = (avg / ADC_RESOLUTION) * ADC_REF_VOLT;

  // Ohm's law: I = V / R
  float current = voltage / SENSE_RESISTOR;

  return current; // Returns actual current in Amps
}

////////////////////////////////////////////////
// LDR Module: DO (Digital Output) only
// Adjust threshold via the module's physical potentiometer
// Returns true if it's dark (night mode)
bool isNightMode() {
  bool doState = digitalRead(LDR_PIN);
  // Most LDR modules: DO = HIGH when dark, LOW when bright
  // If your module behaves inversely, set LDR_NIGHT_IS_HIGH to false
  if (LDR_NIGHT_IS_HIGH)
    return (doState == HIGH); // HIGH = dark/night
  else
    return (doState == LOW); // LOW = dark/night (inverted module)
}

////////////////////////////////////////////////

bool getDebouncedPIR() {
#ifdef BYPASS_PIR
  return false; // Always motion detected (force ON condition)
#else
  bool reading = digitalRead(PIR_PIN);

  // Instant ON: a single HIGH read indicates motion
  // Slow OFF: requires consecutive LOW reads to clear (prevents flicker)
  if (reading == HIGH) {
    stablePIRState = true;
    pirStableCount = 0; // reset off-counter
  } else {
    pirStableCount++;
    if (pirStableCount >= PIR_DEBOUNCE_COUNT) {
      stablePIRState = false;
      pirStableCount = PIR_DEBOUNCE_COUNT; // clamp
    }
  }

  return stablePIRState;
#endif
}

////////////////////////////////////////////////
// Set LED brightness via PWM (0–255)
void setLight(int brightness) {
  brightness = constrain(brightness, 0, 255);
  ledcWrite(LED_PIN, brightness); // Core 3.x uses pin directly, not channel
}

void sendData(int ldr, float current, bool motion, String statusStr) {
  if (WiFi.status() != WL_CONNECTED)
    return;

  HTTPClient http;
  http.setTimeout(2000);
  http.setConnectTimeout(
      2000); // TCP connect timeout (separate from response timeout)
  http.begin(serverURL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", hardwareApiKey);

  JsonDocument doc;
  doc["controller_id"] = controllerID;
  doc["light_id"] = lightID;
  doc["city"] = city;
  doc["status"] = statusStr; 
  doc["ldr_value"] = ldr;
  doc["current_usage"] = current;
  doc["motion_detected"] = motion;
  doc["wifi_rssi"] = WiFi.RSSI();
  doc["free_heap"] = ESP.getFreeHeap();
  doc["ip_address"] = WiFi.localIP().toString();
  
  // Nested location object matching database expectations
  doc["location"]["lat"] = latitude;
  doc["location"]["lng"] = longitude;
  doc["location"]["address"] = city; // Added address to match schema

  String json;
  serializeJson(doc, json);
  Serial.println("Sending: " + json);

  esp_task_wdt_reset(); // before POST
  int httpCode = http.POST(json);
  esp_task_wdt_reset(); // immediately after POST returns

  if (httpCode > 0) {
    Serial.printf("HTTP %d — Data sent successfully\n", httpCode);
    if (httpCode == 400) {
      String response = http.getString();
      Serial.println("Server error: " + response);
    }
  } else {
    Serial.println("Server unreachable — " + http.errorToString(httpCode));
  }
  http.end();
  esp_task_wdt_reset(); // after cleanup too
}

////////////////////////////////////////////////

void setup() {
  esp_task_wdt_add(NULL); // subscribe this task — Core 3.x already inits WDT
  Serial.begin(115200);
  // PIR module drives its own output HIGH/LOW — no pull resistor needed
  pinMode(PIR_PIN, INPUT);

  // PWM setup for LED dimming (ESP32 Arduino Core 3.x API)
  ledcAttach(LED_PIN, PWM_FREQ, PWM_RESOLUTION);
  setLight(BRIGHTNESS_OFF);

  // ── STARTUP BLINK TEST: LED check — should blink 3 times ──
  Serial.println(">>> LED BLINK TEST: LED should blink 3 times now...");
  for (int i = 0; i < 3; i++) {
    setLight(BRIGHTNESS_ON);
    delay(300);
    setLight(BRIGHTNESS_OFF);
    delay(300);
  }
  // Dim test — LED should glow dimly for 1 second
  Serial.println(">>> DIM TEST: LED should glow dimly for 1 second...");
  setLight(BRIGHTNESS_IDLE);
  delay(1000);
  setLight(BRIGHTNESS_OFF);
  Serial.println(">>> BLINK+DIM TEST DONE. If LED did not blink/dim, check wiring!");

  analogReadResolution(12);
  analogSetPinAttenuation(SENSE_PIN, ADC_ATTENDB_MAX); // Current sense ADC

  // LDR module DO pin — digital input
  pinMode(LDR_PIN, INPUT);

  // Quick LDR DO pin test — check current light state
  Serial.printf(">>> LDR DO pin %d reading: %s (adjust module pot if wrong)\n",
                LDR_PIN, digitalRead(LDR_PIN) ? "HIGH (dark)" : "LOW (bright)");

  // Quick PIR pin test — print raw reading
  Serial.printf(">>> PIR pin %d raw reading: %d (expect 0 = no motion)\n",
                PIR_PIN, digitalRead(PIR_PIN));

  checkWiFi(); // Non-blocking initial call

  Serial.println("Setup complete — 30-pin ESP32 DevKit V1, PWM LED control.");
  Serial.printf("Endpoint: %s\n", serverURL);
  Serial.printf("Light ID: %s | Controller: %s | City: %s\n", lightID.c_str(),
                controllerID.c_str(), city.c_str());
}

////////////////////////////////////////////////

void loop() {
  esp_task_wdt_reset();
  checkWiFi(); // Reconnects silently in background if dropped

  unsigned long now = millis();

  // ── Control loop — 300ms ─────────────────────────────────────────────────
  if (now - lastControlTime >= CONTROL_INTERVAL) {
    lastControlTime = now;

    bool nightMode = isNightMode();
    int ldrValue = nightMode ? 0 : 4095; // for serial log & telemetry
    bool motionDetected = getDebouncedPIR();
    float current = getSensedCurrent();

    float activeThreshold = currentThresholdON;

    // ── Normal light control logic ──
    // Note: We don't force OFF during a fault. If LED is disconnected (fault), 
    // sending PWM is safe, and it allows us to detect when it's reconnected!
    if (nightMode) {
      if (motionDetected) {
        setLight(BRIGHTNESS_ON); // Full brightness
        lightState = true;
        status = "ON";
        activeThreshold = currentThresholdON;
      } else {
        setLight(BRIGHTNESS_IDLE); // Dim
        lightState = true;         // True so we check faults in IDLE too!
        status = "IDLE";
        activeThreshold = currentThresholdIDLE; // Lower threshold for dim LED
      }
    } else {
      setLight(BRIGHTNESS_OFF); // Day — off
      lightState = false;
      status = "DAY_OFF";
    }

    // Override display status if fault is active
    if (faultLatched) {
      status = "FAULT";
    }

    // ── Fault detection + auto-recovery (real current sensing) ──
    if (lightState) {
      if (current < activeThreshold) {
        // Current is too low — Fault detected
        if (faultCounter < FAULT_LIMIT)
          faultCounter++;
        if (faultCounter >= FAULT_LIMIT) {
          if (!faultLatched) {
            faultLatched = true;
            Serial.println("FAULT: LED disconnected or burned out!");
          }
          faultClearCounter = 0;
          status = "FAULT";
        }
      } else {
        // Current is good!
        faultCounter = 0;
        if (faultLatched) {
          faultClearCounter++;
          Serial.printf("Fault recovery: %d / %d good reads\n",
                        faultClearCounter, FAULT_CLEAR_LIMIT);
          if (faultClearCounter >= FAULT_CLEAR_LIMIT) {
            faultLatched = false;
            faultClearCounter = 0;
            Serial.println("FAULT CLEARED — system resumed normal operation.");
          }
        } else {
          // If not in fault and we got a good read, reset recovery counter
          if (faultClearCounter > 0) {
            faultClearCounter = 0;
          }
        }
      }
    } else {
      // Daytime (lightState = false): LED is OFF, can't check faults.
      faultCounter = 0;
    }

    Serial.printf(
        "LDR: %d | PIR_RAW: %d | Motion: %s | Current: %.4f A | Status: %s\n",
        ldrValue, digitalRead(PIR_PIN), motionDetected ? "YES" : "NO", current,
        status.c_str());
  }

  // ── Telemetry loop — 5s ──────────────────────────────────────────────────
  if (now - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = now;

    bool nightMode = isNightMode();
    int ldrValue = nightMode ? 0 : 4095; // for server telemetry
    bool motionDetected = getDebouncedPIR();
    float current = getSensedCurrent();

    // Re-derive fresh telemetry status
    String telemetryStatus;
    if (faultLatched) {
      telemetryStatus = "FAULT";
    } else if (nightMode) {
      telemetryStatus = motionDetected ? "ON" : "IDLE";
    } else {
      telemetryStatus = "DAY_OFF";
    }

    sendData(ldrValue, current, motionDetected, telemetryStatus);
  }
}
