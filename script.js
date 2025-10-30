document.addEventListener("DOMContentLoaded", () => {
  let ARDUINO_IP = "";
  let API_BASE_URL = "";
  let pollingInterval = null;
  let isAutoMode = false;

  const el = {
    preloader: document.getElementById("preloader"),
    inputIP: document.getElementById("input-ip"),
    btnSetIP: document.getElementById("btn-set-ip"),
    ipAddress: document.getElementById("ip-address"),
    distanceValue: document.getElementById("distance-value"),
    rangeMarker: document.getElementById("range-marker"),
    statusDot: document.getElementById("status-dot"),
    statusText: document.getElementById("status-text"),
    btnLeft: document.getElementById("btn-left"),
    btnStop: document.getElementById("btn-stop"),
    btnRight: document.getElementById("btn-right"),
    btnAuto: document.getElementById("btn-auto"),
    directionIndicator: document.getElementById("direction-indicator"),
    directionText: document.getElementById("direction-text"),
    modeIcon: null,
    modeText: null,
  };

  // 🔹 Ocultar preloader automáticamente después de 2 s
  setTimeout(() => {
    el.preloader.style.opacity = "0";
    setTimeout(() => (el.preloader.style.display = "none"), 500);
  }, 2000);

  // 🔹 Botón "Conectar"
  el.btnSetIP.addEventListener("click", () => {
    const ip = el.inputIP.value.trim();
    if (!ip) return alert("Por favor ingresa una IP válida.");

    ARDUINO_IP = ip;
    API_BASE_URL = `http://${ARDUINO_IP}`;
    el.ipAddress.textContent = `Conectado a: ${ARDUINO_IP}`;

    if (pollingInterval) clearInterval(pollingInterval);
    startSensorPolling();
  });

  // ===== FUNCIONES =====

  async function getSensorData() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/sensor`);
      if (!res.ok) throw new Error("Error de conexión");
      return await res.json();
    } catch (err) {
      console.error("Error:", err);
      showError("No se puede conectar al Arduino");
      return null;
    }
  }

  async function sendMotorCommand(dir) {
    if (!API_BASE_URL) return showError("Primero conecta la IP del Arduino");
    try {
      await fetch(`${API_BASE_URL}/api/motor/${dir}`, { method: "POST" });
    } catch {
      showError("Error de conexión");
    }
  }

  async function sendModeCommand(mode) {
    if (!API_BASE_URL) return showError("Primero conecta la IP del Arduino");
    try {
      await fetch(`${API_BASE_URL}/api/mode/${mode}`, { method: "POST" });
      isAutoMode = mode === "auto";
      updateAutoButton();
    } catch {
      showError("Error de conexión");
    }
  }

  function startSensorPolling() {
    pollingInterval = setInterval(async () => {
      const data = await getSensorData();
      if (data) updateSensorDisplay(data);
    }, 800);
  }

  function updateSensorDisplay({ distance = 0, mode = "MANUAL", direction = "STOP" }) {
    el.distanceValue.textContent = distance;
    el.rangeMarker.style.left = `${Math.min((distance / 350) * 100, 100)}%`;

    updateStatus(distance);
    updateDirection(direction);
    isAutoMode = mode === "AUTO";
    updateAutoButton();
  }

  function updateStatus(d) {
    if (d >= 100 && d <= 200) {
      el.statusDot.style.background = "#4CAF50";
      el.statusText.textContent = "Objeto en rango (100–200 cm)";
    } else if (d > 200 && d <= 300) {
      el.statusDot.style.background = "#2196F3";
      el.statusText.textContent = "Objeto en rango (200–300 cm)";
    } else {
      el.statusDot.style.background = "#f44336";
      el.statusText.textContent = "Fuera de rango";
    }
  }

  function updateDirection(dir) {
    const icons = {
      LEFT: '<i class="fas fa-undo rotating"></i>',
      RIGHT: '<i class="fas fa-redo rotating"></i>',
      STOP: '<i class="fas fa-pause"></i>',
    };
    el.directionIndicator.innerHTML = icons[dir] || icons.STOP;
    el.directionText.textContent =
      dir === "LEFT"
        ? "Girando a la izquierda"
        : dir === "RIGHT"
        ? "Girando a la derecha"
        : "Motor detenido";
  }

  function updateAutoButton() {
    // Actualizar el contenido del botón
    if (isAutoMode) {
      el.btnAuto.classList.add("active");
      el.btnAuto.innerHTML = `
        <i class="fas fa-robot mode-icon"></i>
        <span class="mode-text">MODO AUTOMÁTICO</span>
      `;
    } else {
      el.btnAuto.classList.remove("active");
      el.btnAuto.innerHTML = `
        <i class="fas fa-hand-paper mode-icon"></i>
        <span class="mode-text">MODO MANUAL</span>
      `;
    }
    
    // Actualizar referencias a los elementos
    el.modeIcon = el.btnAuto.querySelector(".mode-icon");
    el.modeText = el.btnAuto.querySelector(".mode-text");
  }

  function showError(msg) {
    el.statusText.textContent = `❌ ${msg}`;
    el.statusDot.style.background = "#ff0000";
    setTimeout(() => {
      el.statusText.textContent = "Esperando datos...";
      el.statusDot.style.background = "#ccc";
    }, 3000);
  }

  // Botones manuales
  el.btnLeft.addEventListener("click", () =>
    !isAutoMode ? sendMotorCommand("left") : showError("Modo automático activado")
  );
  el.btnStop.addEventListener("click", () =>
    !isAutoMode ? sendMotorCommand("stop") : showError("Modo automático activado")
  );
  el.btnRight.addEventListener("click", () =>
    !isAutoMode ? sendMotorCommand("right") : showError("Modo automático activado")
  );
  
  // Botón de modo automático/manual
  el.btnAuto.addEventListener("click", () => {
    // Aplicar la animación al botón
    el.btnAuto.classList.add("mode-switch-animation");
    
    // Quitar la clase de animación después de que termine
    setTimeout(() => {
      el.btnAuto.classList.remove("mode-switch-animation");
    }, 800);
    
    // Cambiar el modo
    const newMode = isAutoMode ? "manual" : "auto";
    sendModeCommand(newMode);
  });
  
  // Inicializar el botón
  updateAutoButton();
});
