import { getExtAPI } from '../utils/apis/ext-api.js';

const extAPI = getExtAPI();
const ICON_ID_PREFIX = 'safewaters-icon-';

function addIconToLink(linkElement) {
    if (!linkElement || linkElement.querySelector(`img[id^="${ICON_ID_PREFIX}"]`)) {
        return; // No procesar si no hay enlace o ya tiene un icono
    }

    const iconUrl = extAPI.runtime.getURL('icons/logo.svg');
    const icon = document.createElement('img');
    icon.src = iconUrl;
    icon.style.width = '16px';
    icon.style.height = '16px';
    icon.style.marginLeft = '5px';
    icon.style.verticalAlign = 'middle';
    icon.id = `${ICON_ID_PREFIX}${Math.random().toString(36).substring(7)}`; // ID único para el icono

    linkElement.insertAdjacentElement('beforeend', icon);
}

function removeIcons() {
    const icons = document.querySelectorAll(`img[id^="${ICON_ID_PREFIX}"]`);
    icons.forEach(icon => icon.remove());
}

function processLinks() {
    const links = document.querySelectorAll('a[href^="http"], a[href^="https"]');
    links.forEach(link => {
        // Evitar añadir iconos a enlaces que ya son parte de la UI de la extensión o similar
        if (link.closest('.safewaters-ignore')) return;
        addIconToLink(link);
    });
}

let observer;
let isActive = true; // Estado por defecto

function observeDOM() {
    if (observer) {
        observer.disconnect();
    }
    observer = new MutationObserver((mutationsList, observer) => {
        if (!isActive) return;
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.matches('a[href^="http"], a[href^="https"]')) {
                            addIconToLink(node);
                        }
                        node.querySelectorAll('a[href^="http"], a[href^="https"]').forEach(addIconToLink);
                    }
                });
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

function initialize() {
    if (extAPI && extAPI.storage && extAPI.runtime) {
        extAPI.storage.get(['safewatersActive'], (result) => {
            const lastError = extAPI.runtime.lastError;
            if (lastError) {
                console.error(`SafeWaters Content: Error getting initial state: ${lastError.message}`);
                isActive = true;
            } else {
                isActive = typeof result.safewatersActive === "undefined" ? true : result.safewatersActive;
            }

            if (isActive) {
                processLinks();
                observeDOM();
            }
        });

        // Escuchar cambios en el estado de activación desde el popup
        extAPI.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local' && changes.safewatersActive) {
                isActive = changes.safewatersActive.newValue;
                if (isActive) {
                    processLinks();
                    observeDOM(); // Re-observar si se activa
                } else {
                    if (observer) {
                        observer.disconnect();
                    }
                    removeIcons();
                }
            }
        });
    } else {
        console.error("SafeWaters Content: Extension APIs not available.");
    }
}

// Asegurarse de que el DOM esté listo antes de manipularlo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}