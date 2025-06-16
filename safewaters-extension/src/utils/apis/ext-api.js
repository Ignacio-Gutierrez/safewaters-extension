let api = null;
let logged = false;

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
            tabs: chrome.tabs,
            webNavigation: chrome.webNavigation,
            scripting: chrome.scripting
        };
        return api;
    }
    throw new Error("No se encontró una API de almacenamiento compatible.");
  }