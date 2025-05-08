/**
 * Obtiene la API de almacenamiento y runtime correcta para Chrome o Firefox.
 * @returns {object} - Un objeto con las APIs de almacenamiento y runtime.
 */
export function getExtAPI() {
    if (typeof browser !== "undefined" && browser.storage && browser.storage.local && browser.runtime) {
        console.log("API de Firefox detectada");
        return { storage: browser.storage.local, runtime: browser.runtime }; // Firefox

    }
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local && chrome.runtime) {
        console.log("API de Chrome detectada");
        return { storage: chrome.storage.local, runtime: chrome.runtime }; // Chrome
    }
    throw new Error("No se encontró una API de almacenamiento compatible.");
  }