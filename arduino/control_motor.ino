//para usar en la web

#include <WiFiS3.h>
#include <ArduinoJson.h>

// ================== CONFIGURACIÓN WIFI ==================
char ssid[] = "TU_RED_WIFI";        
char pass[] = "TU_PASSWORD_WIFI";   
// ========================================================

WiFiServer server(80);

// ====== CONFIGURACIÓN DE PINES ======
const int trigPin = 10;
const int echoPin = 9;
const int motorIN3 = 3;
const int motorIN4 = 2;
// ====================================

int distance = 0;
bool autoMode = false;  // inicia en manual
String currentDirection = "STOP";

void setup() {
  Serial.begin(9600);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(motorIN3, OUTPUT);
  pinMode(motorIN4, OUTPUT);

  stopMotor();

  connectToWiFi();
  server.begin();

  Serial.println("=== Sistema de Control de Motor (modo web) ===");
  Serial.print("IP asignada: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  distance = readDistance();

  if (autoMode) {
    controlMotorBySensor(distance);
  }

  handleWebClients();

  delay(200);
}

// ====== FUNCIONES DE RED ======
void connectToWiFi() {
  Serial.print("Conectando a ");
  Serial.println(ssid);
  int status = WiFi.begin(ssid, pass);
  while (status != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
    status = WiFi.begin(ssid, pass);
  }
  Serial.println("\nConectado a WiFi ✅");
}

// ====== LECTURA DEL SENSOR ======
int readDistance() {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  long duration = pulseIn(echoPin, HIGH, 25000);
  int dist = duration * 0.034 / 2;
  return constrain(dist, 0, 400);
}

// ====== CONTROL AUTOMÁTICO POR SENSOR ======
void controlMotorBySensor(int dist) {
  if (dist >= 100 && dist <= 200) {
    if (currentDirection != "RIGHT") {
      motorRight();
      currentDirection = "RIGHT";
      Serial.println("→ Sensor: Girando DERECHA");
    }
  } else if (dist > 200 && dist <= 300) {
    if (currentDirection != "LEFT") {
      motorLeft();
      currentDirection = "LEFT";
      Serial.println("← Sensor: Girando IZQUIERDA");
    }
  } else {
    if (currentDirection != "STOP") {
      stopMotor();
      currentDirection = "STOP";
      Serial.println("■ Sensor: Motor DETENIDO");
    }
  }
}

// ====== MANEJO DE PETICIONES WEB ======
void handleWebClients() {
  WiFiClient client = server.available();
  if (!client) return;

  String request = client.readStringUntil('\n');
  StaticJsonDocument<200> doc;
  String jsonResponse;

  // Endpoint: lectura de sensor
  if (request.indexOf("GET /api/sensor") >= 0) {
    doc["distance"] = distance;
    doc["mode"] = autoMode ? "AUTO" : "MANUAL";
    doc["direction"] = currentDirection;
  }
  // Control manual
  else if (request.indexOf("POST /api/motor/left") >= 0) {
    if (!autoMode) {
      motorLeft();
      currentDirection = "LEFT";
      doc["success"] = true;
    } else {
      doc["success"] = false;
      doc["message"] = "Modo automático activado";
    }
  }
  else if (request.indexOf("POST /api/motor/right") >= 0) {
    if (!autoMode) {
      motorRight();
      currentDirection = "RIGHT";
      doc["success"] = true;
    } else {
      doc["success"] = false;
      doc["message"] = "Modo automático activado";
    }
  }
  else if (request.indexOf("POST /api/motor/stop") >= 0) {
    if (!autoMode) {
      stopMotor();
      currentDirection = "STOP";
      doc["success"] = true;
    } else {
      doc["success"] = false;
      doc["message"] = "Modo automático activado";
    }
  }
  // Cambio de modo desde la web
  else if (request.indexOf("POST /api/mode/auto") >= 0) {
    autoMode = true;
    stopMotor();
    doc["success"] = true;
    doc["mode"] = "AUTO";
    Serial.println("🌐 Modo AUTOMÁTICO activado desde la web");
  }
  else if (request.indexOf("POST /api/mode/manual") >= 0) {
    autoMode = false;
    stopMotor();
    doc["success"] = true;
    doc["mode"] = "MANUAL";
    Serial.println("🌐 Modo MANUAL activado desde la web");
  }

  serializeJson(doc, jsonResponse);

  client.println("HTTP/1.1 200 OK");
  client.println("Content-Type: application/json");
  client.println("Access-Control-Allow-Origin: *");
  client.println();
  client.println(jsonResponse);
  client.stop();
}

// ====== FUNCIONES DE MOVIMIENTO ======
void motorLeft() {
  digitalWrite(motorIN3, HIGH);
  digitalWrite(motorIN4, LOW);
}

void motorRight() {
  digitalWrite(motorIN3, LOW);
  digitalWrite(motorIN4, HIGH);
}

void stopMotor() {
  digitalWrite(motorIN3, LOW);
  digitalWrite(motorIN4, LOW);
}