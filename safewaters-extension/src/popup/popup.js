const statusElement = document.getElementById('status');
const enableSafeWatersCheckbox = document.getElementById("enableSafeWaters");

// Determinar el objeto de almacenamiento y runtime correctos (Chrome/Firefox)
const extAPI = (() => {
  if (typeof browser !== 'undefined' && browser.storage && browser.storage.local && browser.runtime) {
    return { storage: browser.storage.local, runtime: browser.runtime };
  }
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local && chrome.runtime) {
    return { storage: chrome.storage.local, runtime: chrome.runtime };
  }
  console.error("SafeWaters Popup: Storage/Runtime API not found. Popup state will not work reliably.");
  return null;
})();

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
  // Deshabilitar la funcionalidad del popup si las APIs no están disponibles
  enableSafeWatersCheckbox.disabled = true;
  statusElement.innerHTML = '<img src="../../assets/compass_off.svg" alt="compass"> Sin coordenadas';
  statusElement.style.color = 'orange';
  console.error("SafeWaters Popup: Extension APIs not available, popup functionality disabled.");
}