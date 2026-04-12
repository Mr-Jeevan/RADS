#include <WiFi.h>
#include <WiFiClientSecure.h> // REQUIRED for the tunnel
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

// 1. Credentials
const char* ssid = "Arasu";
const char* password = "f1ypuaaj7t";

// 2. CHECK YOUR TERMINAL: Make sure this URL matches your active tunnel!
// Use https:// for the tunnel.
const char* serverName = "http://192.168.1.15:5000/api/anomalies";
float baselineZ = 1.0; 
Adafruit_MPU6050 mpu;

void setup() {
  Serial.begin(115200);
  delay(1000); 
  Wire.begin(21, 22); 

  if (!mpu.begin()) {
    Serial.println("Failed to find MPU6050 chip. Check wiring!");
    while (1) { delay(10); }
  }
  Serial.println("MPU6050 Found!");

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected to WiFi!");
}

void loop() {
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  float z_gForce = a.acceleration.z / 9.81; 
  float gForceDifference = abs(z_gForce - baselineZ);

  if (gForceDifference > 0.45) {
    Serial.print("ANOMALY DETECTED! G-Force: ");
    Serial.println(z_gForce);
    
    String severityLevel = "low";
    if (gForceDifference > 0.8) severityLevel = "medium";
    if (gForceDifference > 1.2) severityLevel = "high";
    if (gForceDifference > 2.0) severityLevel = "critical";

    if (WiFi.status() == WL_CONNECTED) {
      WiFiClient client;   // Tells ESP32 to ignore certificate errors
      
      HTTPClient http;
      http.begin(client, serverName); 
      http.addHeader("Content-Type", "application/json");

      String httpRequestData = "{\"type\":\"pothole\",\"severity\":\"" + severityLevel + "\",\"gForce\":" + String(z_gForce) + ",\"location\":{\"type\":\"Point\",\"coordinates\":[78.68, 10.83]}}";

      int httpResponseCode = http.POST(httpRequestData);
      
      Serial.print("HTTP Response code: ");
      Serial.println(httpResponseCode);
      
      if(httpResponseCode <= 0) {
        Serial.printf("Error: %s\n", http.errorToString(httpResponseCode).c_str());
      }
      
      http.end();
    }
    
    delay(2000); 
  }
  delay(50); 
}