import { getExtAPI } from "../utils/apis/ext-api.js";

// Elementos del DOM
const statusElement = document.getElementById('status');
const updateTokenBtn = document.getElementById("updateTokenBtn");

// API de extensión
const extAPI = getExtAPI();

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

  // Configurar estado visual (siempre activo)
  statusElement.style.color = 'green';
  console.log('SafeWaters: Popup initialized - Extension always active');

} else {
  // Deshabilitar funcionalidad si las APIs no están disponibles
  updateTokenBtn.disabled = true;
  statusElement.innerHTML = '<img src="../../assets/compass_off.svg" alt="compass"> Sin coordenadas';
  statusElement.style.color = 'orange';
  console.error("SafeWaters Popup: Extension APIs not available, popup functionality disabled.");
}