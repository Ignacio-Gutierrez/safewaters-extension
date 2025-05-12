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

    if (typeof browser !== "undefined" && browser.storage && browser.storage.local && browser.runtime && browser.storage.session) {
        if (!logged) {
            console.log("API de Firefox detectada");
            logged = true;
        }
        api = {
            storage: {
                get: browser.storage.local.get.bind(browser.storage.local),
                set: browser.storage.local.set.bind(browser.storage.local),
                remove: browser.storage.local.remove.bind(browser.storage.local),
                clear: browser.storage.local.clear.bind(browser.storage.local),
                onChanged: browser.storage.onChanged
            },
            sessionStorage: {
                get: browser.storage.session.get.bind(browser.storage.session),
                set: browser.storage.session.set.bind(browser.storage.session),
                remove: browser.storage.session.remove.bind(browser.storage.session),
                clear: browser.storage.session.clear.bind(browser.storage.session)
            },
            runtime: browser.runtime,
            tabs: browser.tabs
        };
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
            sessionStorage: {
                get: chrome.storage.session.get.bind(chrome.storage.session),
                set: chrome.storage.session.set.bind(chrome.storage.session),
                remove: chrome.storage.session.remove.bind(chrome.storage.session),
                clear: chrome.storage.session.clear.bind(chrome.storage.session)
            },
            runtime: chrome.runtime,
            tabs: chrome.tabs
        };
        return api;
    }
    throw new Error("No se encontró una API de almacenamiento compatible o falta storage.session.");
  }