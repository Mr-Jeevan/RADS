#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

// 1. WOKWI VIRTUAL WIFI (Keep as is for simulation)
const char* ssid = "Wokwi-GUEST";
const char* password = "";

// 2. YOUR LOCALTUNNEL URL (Update this every time you restart the tunnel!)
const char* serverName = "https://dull-moles-repeat.loca.lt/api/anomalies"; 

Adafruit_MPU6050 mpu;

void setup() {
  Serial.begin(115200);
  delay(2000); // ADD THIS LINE: Wait for VS Code terminal to wake up!

  Wire.begin(21, 22);

  if (!mpu.begin()) {
    Serial.println("Failed to find MPU6050 chip");
    while (1) { delay(10); }
  }
  Serial.println("MPU6050 Found!");

  // Connect to Virtual Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected!");
}

void loop() {
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  // Math to detect vertical vibration (G-Force)
  float z_gForce = a.acceleration.z / 9.81; 
  float gForceDifference = abs(z_gForce - 1.0);

  // If the impact is greater than 0.45G, trigger an anomaly
  if (gForceDifference > 0.45) {
    Serial.print("POTHOLE TRIGGERED! G-Force: ");
    Serial.println(z_gForce);
    
    // Determine severity for your MongoDB schema
    String severityLevel = "low";
    if (gForceDifference > 0.8) severityLevel = "medium";
    if (gForceDifference > 1.2) severityLevel = "high";
    if (gForceDifference > 2.0) severityLevel = "critical";

    sendAnomalyData("pothole", severityLevel, z_gForce);
    
    // Delay to prevent double-triggering on the same pothole
    delay(2000); 
  }
  delay(100); 
}

void sendAnomalyData(String type, String severity, float gForce) {
  if (WiFi.status() == WL_CONNECTED) {
    // Create a secure client to handle Localtunnel HTTPS
    WiFiClientSecure client;
    
    // Bypass SSL certificate checks
    client.setInsecure();    
    
    HTTPClient http;
    
    // Begin connection using the secure client
    http.begin(client, serverName); 
    http.addHeader("Content-Type", "application/json");

    // Construct the JSON payload exactly as your backend expects
    String httpRequestData = "{\"type\":\"" + type + "\",\"severity\":\"" + severity + "\",\"gForce\":" + String(gForce) + ",\"location\":{\"type\":\"Point\",\"coordinates\":[78.68, 10.83]}}";

    // Send the POST request
    int httpResponseCode = http.POST(httpRequestData);

    Serial.print("HTTP Response code: ");
    Serial.println(httpResponseCode);
    
    http.end();
  } else {
    Serial.println("WiFi Disconnected. Cannot send data.");
  }
}