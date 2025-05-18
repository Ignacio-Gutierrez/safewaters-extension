import { getExtAPI } from "../utils/apis/ext-api.js";

/**
 * Elemento de estado del popup.
 * @type {HTMLElement}
 */
const statusElement = document.getElementById('status');

/**
 * Checkbox para activar o desactivar SafeWaters.
 * @type {HTMLInputElement}
 */
const enableSafeWatersCheckbox = document.getElementById("enableSafeWaters");

/**
 * API de extensión obtenida mediante getExtAPI.
 * @type {Object}
 */
const extAPI = getExtAPI();

/**
 * Actualiza el estado visual del popup según si la protección está activa.
 * @param {boolean} isActive - Indica si la protección está activa.
 * @returns {void}
 */
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
  /**
   * Obtiene el estado inicial de SafeWaters y actualiza la interfaz.
   */
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

  /**
   * Maneja el cambio de estado del checkbox y actualiza el almacenamiento.
   */
  enableSafeWatersCheckbox.addEventListener("change", function (event) {
    const isActive = event.target.checked;
    updateStatus(isActive);
    extAPI.storage.set({ safewatersActive: isActive }, () => {
      if (extAPI.runtime.lastError) {
        console.error(`SafeWaters Popup: Error setting active state: ${extAPI.runtime.lastError.message}`);
      } else {
        // console.log(`SafeWaters Popup: State set to active: ${isActive}`);
      }
    });
  });
} else {
  /**
   * Deshabilita la funcionalidad del popup si las APIs no están disponibles.
   */
  enableSafeWatersCheckbox.disabled = true;
  statusElement.innerHTML = '<img src="../../assets/compass_off.svg" alt="compass"> Sin coordenadas';
  statusElement.style.color = 'orange';
  console.error("SafeWaters Popup: Extension APIs not available, popup functionality disabled.");
}