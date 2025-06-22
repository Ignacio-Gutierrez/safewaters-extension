// SafeWaters Popup Script
// Elementos del DOM
const statusElement = document.getElementById('status');
const updateTokenBtn = document.getElementById("updateTokenBtn");

// Verificar que las APIs de Chrome estén disponibles
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.storage) {
  // Manejar clic del botón actualizar token
  updateTokenBtn.addEventListener("click", function() {
    chrome.runtime.sendMessage({ 
      action: 'openWelcomePage', 
      updateToken: true 
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error opening welcome page:', chrome.runtime.lastError);
      } else if (response && response.success) {
        // console.log('Welcome page opened for token update'); // DEBUG: Comentado para producción
        window.close();
      }
    });
  });

  // Configurar estado visual (siempre activo)
  statusElement.style.color = 'green';
  // console.log('SafeWaters: Popup initialized - Extension always active'); // DEBUG: Comentado para producción

} else {
  // Deshabilitar funcionalidad si las APIs no están disponibles
  updateTokenBtn.disabled = true;
  statusElement.innerHTML = '<img src="../../assets/compass_off.svg" alt="compass"> Sin coordenadas';
  statusElement.style.color = 'orange';
  console.error("SafeWaters Popup: Chrome Extension APIs not available, popup functionality disabled.");
}