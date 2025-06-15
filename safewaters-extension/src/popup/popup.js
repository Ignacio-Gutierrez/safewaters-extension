import { getExtAPI } from "../utils/apis/ext-api.js";

// Elementos del DOM
const statusElement = document.getElementById('status');
const enableSafeWatersCheckbox = document.getElementById("enableSafeWaters");
const updateTokenBtn = document.getElementById("updateTokenBtn");

// API de extensión
const extAPI = getExtAPI();

// Actualizar estado visual del popup
function updateStatus(isActive) {
  if (isActive) {
    statusElement.innerHTML = '<img src="../../assets/sailing.svg" alt="sailing"> Protección en curso';
    statusElement.style.color = 'green';
  } else {
    statusElement.innerHTML = '<img src="../../assets/anchor.svg" alt="anchor"> Protección detenida';
    statusElement.style.color = 'red';
  }
}

if (extAPI && extAPI.storage && extAPI.runtime) {
  // Manejar clic del botón actualizar token
  updateTokenBtn.addEventListener("click", function() {
    extAPI.runtime.sendMessage({ 
      action: 'openWelcomePage', 
      updateToken: true 
    }, (response) => {
      if (extAPI.runtime.lastError) {
        console.error('Error opening welcome page:', extAPI.runtime.lastError);
      } else if (response && response.success) {
        console.log('Welcome page opened for token update');
        window.close();
      }
    });
  });

  // Obtener estado inicial de SafeWaters
  extAPI.storage.get(['safewatersActive'], (result) => {
    const lastError = extAPI.runtime.lastError;
    if (lastError) {
      console.error(`SafeWaters Popup: Error getting initial state: ${lastError.message}`);
      updateStatus(true);
      enableSafeWatersCheckbox.checked = true;
      return;
    }

    let isActive;
    if (typeof result.safewatersActive === "undefined") {
      isActive = true;
      extAPI.storage.set({ safewatersActive: true }, () => {
        if (extAPI.runtime.lastError) {
          console.error(`SafeWaters Popup: Error setting initial active state: ${extAPI.runtime.lastError.message}`);
        }
      });
    } else {
      isActive = result.safewatersActive;
    }
    enableSafeWatersCheckbox.checked = isActive;
    updateStatus(isActive);
  });

  // Manejar cambio de estado del checkbox
  enableSafeWatersCheckbox.addEventListener("change", function (event) {
    const isActive = event.target.checked;
    updateStatus(isActive);
    extAPI.storage.set({ safewatersActive: isActive }, () => {
      if (extAPI.runtime.lastError) {
        console.error(`SafeWaters Popup: Error setting active state: ${extAPI.runtime.lastError.message}`);
      }
    });
  });
} else {
  // Deshabilitar funcionalidad si las APIs no están disponibles
  enableSafeWatersCheckbox.disabled = true;
  updateTokenBtn.disabled = true;
  statusElement.innerHTML = '<img src="../../assets/compass_off.svg" alt="compass"> Sin coordenadas';
  statusElement.style.color = 'orange';
  console.error("SafeWaters Popup: Extension APIs not available, popup functionality disabled.");
}