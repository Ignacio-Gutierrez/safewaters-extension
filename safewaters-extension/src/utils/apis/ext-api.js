/**
 * Obtiene la API de almacenamiento y runtime correcta para Chrome o Firefox.
 * @returns {object} - Un objeto con las APIs de almacenamiento y runtime.
 */
let api = null;
let logged = false;

export function getExtAPI() {
    if (api) {
        return api;
    }

    if (typeof browser !== "undefined" && browser.storage && browser.storage.local && browser.runtime) {
        if (!logged) {
            console.log("API de Firefox detectada");
            logged = true;
        }
        api = { storage: browser.storage.local, runtime: browser.runtime }; // Firefox
        return api;
    }
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local && chrome.runtime) {
        if (!logged) {
            console.log("API de Chrome detectada");
            logged = true;
        }
        api = { storage: chrome.storage.local, runtime: chrome.runtime }; // Chrome
        return api;
    }
    throw new Error("No se encontró una API de almacenamiento compatible.");
  }