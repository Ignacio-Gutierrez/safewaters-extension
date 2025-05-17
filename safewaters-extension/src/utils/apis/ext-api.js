/**
 * @fileoverview Proporciona una función para obtener la API de almacenamiento y runtime de Chrome.
 * @module utils/apis/ext-api
 */

let api = null;
let logged = false;

/**
 * Obtiene la API de almacenamiento y runtime para Chrome.
 *
 * @function
 * @returns {Object} Un objeto con las APIs de almacenamiento (`storage`), runtime (`runtime`) y pestañas (`tabs`) de Chrome.
 * @throws {Error} Si no se encuentra una API de almacenamiento compatible.
 *
 * @example
 * const extAPI = getExtAPI();
 * extAPI.storage.get(['key'], (result) => { ... });
 */

export function getExtAPI() {
    if (api) {
        return api;
    }

    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local && chrome.runtime && chrome.storage.session) {
        if (!logged) {
            console.log("API de Chrome detectada");
            logged = true;
        }
        api = {
            storage: {
                get: chrome.storage.local.get.bind(chrome.storage.local),
                set: chrome.storage.local.set.bind(chrome.storage.local),
                remove: chrome.storage.local.remove.bind(chrome.storage.local),
                clear: chrome.storage.local.clear.bind(chrome.storage.local),
                onChanged: chrome.storage.onChanged
            },
            runtime: chrome.runtime,
            tabs: chrome.tabs
        };
        return api;
    }
    throw new Error("No se encontró una API de almacenamiento compatible.");
  }