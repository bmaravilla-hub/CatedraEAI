document.addEventListener('DOMContentLoaded', function() {
    // ================== CONFIGURA LA IP DEL ARDUINO ==================
    const ARDUINO_IP = '192.168.1.100';  //  IP real
    // ========================================================================

    const API_BASE_URL = `http://${ARDUINO_IP}`;
    
    // Elementos del DOM
    const elements = {
        preloader: document.getElementById('preloader'),
        distanceValue: document.getElementById('distance-value'),
        rangeMarker: document.getElementById('range-marker'),
        statusDot: document.getElementById('status-dot'),
        statusText: document.getElementById('status-text'),
        btnLeft: document.getElementById('btn-left'),
        btnStop: document.getElementById('btn-stop'),
        btnRight: document.getElementById('btn-right'),
        btnAuto: document.getElementById('btn-auto'),
        directionIndicator: document.getElementById('direction-indicator'),
        directionText: document.getElementById('direction-text'),
        ipAddress: document.getElementById('ip-address'),
        autoText: document.getElementById('auto-text')
    };

    let isAutoMode = false;
    let currentDirection = 'STOP';

    // Ocultar preloader después de 2 segundos
    setTimeout(() => {
        elements.preloader.style.opacity = '0';
        setTimeout(() => {
            elements.preloader.style.display = 'none';
            startSensorPolling();
            elements.ipAddress.textContent = `Conectado a: ${ARDUINO_IP}`;
        }, 500);
    }, 2000);

    // Obtener datos del sensor
    async function getSensorData() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/sensor`);
            if (!response.ok) throw new Error('Error en la respuesta');
            return await response.json();
        } catch (error) {
            console.error('Error conectando con Arduino:', error);
            showError('No se puede conectar al Arduino');
            return null;
        }
    }

    // Enviar comando al motor
    async function sendMotorCommand(direction) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/motor/${direction}`, {
                method: 'POST'
            });
            const data = await response.json();
            
            if (data.success) {
                return data;
            } else {
                showError(data.message);
                return null;
            }
        } catch (error) {
            console.error('Error controlando motor:', error);
            showError('Error de conexión');
            return null;
        }
    }

    // Actualizar interfaz con datos del sensor
    function updateSensorDisplay(sensorData) {
        if (!sensorData) return;

        const distance = sensorData.distance || 0;
        const mode = sensorData.mode || 'MANUAL';
        const direction = sensorData.direction || 'STOP';

        // Actualizar distancia
        elements.distanceValue.textContent = distance;
        
        // Actualizar marcador de rango
        const markerPosition = Math.min((distance / 350) * 100, 100);
        elements.rangeMarker.style.left = `${markerPosition}%`;
        
        // Actualizar estado
        updateStatus(distance, direction);
        
        // Actualizar modo y dirección
        isAutoMode = (mode === 'AUTO');
        updateAutoButton();
        updateDirectionIndicator(direction);
    }

    // Actualizar estado según distancia
    function updateStatus(distance, direction) {
        if (distance >= 100 && distance <= 200) {
            elements.statusDot.style.backgroundColor = '#4CAF50';
            elements.statusText.textContent = 'Objeto en rango (100-200cm)';
            elements.statusDot.classList.add('active');
        } else if (distance > 200 && distance <= 300) {
            elements.statusDot.style.backgroundColor = '#2196F3';
            elements.statusText.textContent = 'Objeto en rango (200-300cm)';
            elements.statusDot.classList.add('active');
        } else {
            elements.statusDot.style.backgroundColor = '#f44336';
            elements.statusText.textContent = 'Fuera de rango';
            elements.statusDot.classList.remove('active');
        }
    }

    // Actualizar indicador de dirección
    function updateDirectionIndicator(direction) {
        elements.directionIndicator.innerHTML = '';
        let icon, text;
        
        switch(direction) {
            case 'LEFT':
                icon = '<i class="fas fa-undo rotating"></i>';
                text = 'Girando a la izquierda';
                break;
            case 'RIGHT':
                icon = '<i class="fas fa-redo rotating"></i>';
                text = 'Girando a la derecha';
                break;
            default:
                icon = '<i class="fas fa-pause"></i>';
                text = 'Motor detenido';
        }
        
        elements.directionIndicator.innerHTML = icon;
        elements.directionText.textContent = text;
        currentDirection = direction;
    }

    // Actualizar botón de modo automático
    function updateAutoButton() {
        if (isAutoMode) {
            elements.btnAuto.classList.add('active');
            elements.btnAuto.innerHTML = '<i class="fas fa-toggle-on btn-icon"></i> Modo Automático ACTIVADO';
            elements.autoText.textContent = 'Modo Automático ACTIVADO';
        } else {
            elements.btnAuto.classList.remove('active');
            elements.btnAuto.innerHTML = '<i class="fas fa-toggle-off btn-icon"></i> Modo Manual ACTIVADO';
            elements.autoText.textContent = 'Modo Manual ACTIVADO';
        }
    }

    // Mostrar error
    function showError(message) {
        elements.statusText.textContent = `❌ ${message}`;
        elements.statusDot.style.backgroundColor = '#ff0000';
        
        setTimeout(() => {
            if (elements.statusText.textContent.includes(message)) {
                elements.statusText.textContent = 'Esperando datos...';
                elements.statusDot.style.backgroundColor = '#ccc';
            }
        }, 3000);
    }

    // Polling de datos del sensor
    function startSensorPolling() {
        setInterval(async () => {
            const sensorData = await getSensorData();
            if (sensorData) {
                updateSensorDisplay(sensorData);
            }
        }, 800);
    }

    // Event Listeners para botones
    elements.btnLeft.addEventListener('click', async () => {
        if (!isAutoMode) {
            const result = await sendMotorCommand('left');
            if (result) {
                updateDirectionIndicator('LEFT');
            }
        } else {
            showError('Modo automático activado - Usa el botón físico');
        }
    });

    elements.btnStop.addEventListener('click', async () => {
        if (!isAutoMode) {
            const result = await sendMotorCommand('stop');
            if (result) {
                updateDirectionIndicator('STOP');
            }
        } else {
            showError('Modo automático activado - Usa el botón físico');
        }
    });

    elements.btnRight.addEventListener('click', async () => {
        if (!isAutoMode) {
            const result = await sendMotorCommand('right');
            if (result) {
                updateDirectionIndicator('RIGHT');
            }
        } else {
            showError('Modo automático activado - Usa el botón físico');
        }
    });

    elements.btnAuto.addEventListener('click', () => {
        showError('Usa el BOTÓN FÍSICO en el circuito para cambiar modo');
    });
});