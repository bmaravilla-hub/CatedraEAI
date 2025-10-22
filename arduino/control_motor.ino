#include <WiFiS3.h>
#include <ArduinoJson.h>

// ================== CONFIGURACIÓN WIFI ==================
char ssid[] = "TU_RED_WIFI";        // Nombre
char pass[] = "TU_PASSWORD_WIFI";   // Contraseña
// ============================================================

WiFiServer server(80);

// Pines del sensor 
const int trigPin = 9;
const int echoPin = 10;

// Pines del L293D
const int motorIN1 = 5;
const int motorIN2 = 6;
const int motorEnable = 3;

// Pin del botón
const int buttonPin = 2;

int distance = 0;
bool autoMode = false;
bool lastButtonState = HIGH;
String currentDirection = "STOP";

void setup() {
  Serial.begin(9600);
  
  // Configurar pines
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(motorIN1, OUTPUT);
  pinMode(motorIN2, OUTPUT);
  pinMode(motorEnable, OUTPUT);
  pinMode(buttonPin, INPUT_PULLUP);
  
  stopMotor();

  connectToWiFi();
  
  server.begin();
  
  Serial.println(" Sistema Arduino R4 WiFi iniciado");
  Serial.print(" Dirección IP: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  bool buttonState = digitalRead(buttonPin);
  if (lastButtonState == HIGH && buttonState == LOW) {
    autoMode = !autoMode;
    delay(50);
    Serial.println(autoMode ? " Modo AUTO" : " Modo MANUAL");
  }
  lastButtonState = buttonState;
  
  distance = readDistance();
  
  // Control automático
  if (autoMode) {
    controlMotorBySensor(distance);
  }
  
  // Maneja peticiones desde la web
  handleWebClients();
  
  delay(100);
}

void connectToWiFi() {
  Serial.print("📡 Conectando a: ");
  Serial.println(ssid);
  
  int status = WiFi.begin(ssid, pass);
  
  while (status != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
    status = WiFi.begin(ssid, pass);
  }
  
  Serial.println("\n ¡Conectado a WiFi!");
}

int readDistance() {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  
  long duration = pulseIn(echoPin, HIGH);
  return duration * 0.034 / 2;
}

void controlMotorBySensor(int dist) {
  if (dist >= 100 && dist <= 200) {
    if (currentDirection != "RIGHT") {
      motorRight();
      currentDirection = "RIGHT";
      Serial.println(" Sensor: Girando DERECHA");
    }
  } else if (dist > 200 && dist <= 300) {
    if (currentDirection != "LEFT") {
      motorLeft();
      currentDirection = "LEFT";
      Serial.println(" Sensor: Girando IZQUIERDA");
    }
  } else {
    if (currentDirection != "STOP") {
      stopMotor();
      currentDirection = "STOP";
      Serial.println(" Sensor: Motor DETENIDO");
    }
  }
}

void handleWebClients() {
  WiFiClient client = server.available();
  
  if (client) {
    String request = client.readStringUntil('\n');
    Serial.println(" Request: " + request);
    
    // Prepara respuesta JSON
    String jsonResponse = "";
    StaticJsonDocument<200> doc;
    
    if (request.indexOf("GET /api/sensor") >= 0) {
      doc["distance"] = distance;
      doc["mode"] = autoMode ? "AUTO" : "MANUAL";
      doc["direction"] = currentDirection;
      
    } else if (request.indexOf("POST /api/motor/left") >= 0) {
      if (!autoMode) {
        motorLeft();
        currentDirection = "LEFT";
        doc["success"] = true;
        doc["direction"] = "LEFT";
      } else {
        doc["success"] = false;
        doc["message"] = "Modo automático activado";
      }
      
    } else if (request.indexOf("POST /api/motor/right") >= 0) {
      if (!autoMode) {
        motorRight();
        currentDirection = "RIGHT";
        doc["success"] = true;
        doc["direction"] = "RIGHT";
      } else {
        doc["success"] = false;
        doc["message"] = "Modo automático activado";
      }
      
    } else if (request.indexOf("POST /api/motor/stop") >= 0) {
      if (!autoMode) {
        stopMotor();
        currentDirection = "STOP";
        doc["success"] = true;
        doc["direction"] = "STOP";
      } else {
        doc["success"] = false;
        doc["message"] = "Modo automático activado";
      }
    }
    
    serializeJson(doc, jsonResponse);
    
    // Enviar respuesta
    client.println("HTTP/1.1 200 OK");
    client.println("Content-type: application/json");
    client.println("Access-Control-Allow-Origin: *");
    client.println();
    client.println(jsonResponse);
    
    client.stop();
  }
}

void motorLeft() {
  digitalWrite(motorIN1, HIGH);
  digitalWrite(motorIN2, LOW);
  analogWrite(motorEnable, 200);
}

void motorRight() {
  digitalWrite(motorIN1, LOW);
  digitalWrite(motorIN2, HIGH);
  analogWrite(motorEnable, 200);
}

void stopMotor() {
  digitalWrite(motorIN1, LOW);
  digitalWrite(motorIN2, LOW);
  analogWrite(motorEnable, 0);
}