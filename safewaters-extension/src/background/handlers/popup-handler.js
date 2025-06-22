// SafeWaters Popup Handler - Maneja la creación y visualización de popups
import { Logger } from '../../utils/config.js';

export class PopupHandler {
    constructor() {
        this.activePopups = new Map();
        this.cssInjected = false;
        this.htmlInjected = false;
    }

    async showPopup(options) {
        const { type, message, url, tabId } = options;
        
        Logger.info('Mostrando popup', { type, url, tabId });

        try {
            await this.injectPopupResources(tabId);
            
            const popupId = `popup-${tabId}-${Date.now()}`;
            
            this.activePopups.set(popupId, {
                type,
                url,
                tabId,
                timestamp: Date.now()
            });

            await this.displayPopup(tabId, type, message, popupId, url);
            
            Logger.info('Popup mostrado exitosamente', { popupId, type });
            return popupId;

        } catch (error) {
            Logger.error('Error mostrando popup', { error: error.message, type, url });
            throw error;
        }
    }

    async injectPopupResources(tabId) {
        try {
            await chrome.scripting.insertCSS({
                target: { tabId },
                css: this.getPopupCSS()
            });

            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: function() {
                    // Función que se ejecuta en el contexto de la página - sin sintaxis moderna
                    // console.log('SafeWaters: Iniciando inyección de HTML de popup'); // DEBUG: Comentado para producción
                    
                    if (document.getElementById('safewaters-confirmation-popup-container-malicious') || 
                        document.getElementById('safewaters-confirmation-popup-container-uncertain') ||
                        document.getElementById('safewaters-confirmation-popup-container-blocked')) {
                        // console.log('SafeWaters: HTML ya inyectado, omitiendo'); // DEBUG: Comentado para producción
                        return;
                    }

                    var iconRojo = chrome.runtime.getURL('icons/logo-rojo.svg');
                    var iconNaranja = chrome.runtime.getURL('icons/logo-naranja.svg');
                    
                    var html = '<div id="safewaters-confirmation-popup-container-malicious" class="safewaters-preview-popup">' +
                        '<div class="sw-popup-content sw-popup-malicious">' +
                        '<div class="sw-message-content">' +
                        '<img id="sw-popup-icon-malicious" src="' + iconRojo + '" alt="Icono de advertencia roja" />' +
                        '<div>' +
                        '<h3 class="sw-popup-title">¡Alerta, Navegante!</h3>' +
                        '<p id="sw-popup-message-malicious"></p>' +
                        '</div>' +
                        '</div>' +
                        '<div class="sw-popup-buttons">' +
                        '<button id="sw-popup-proceed-button-malicious" data-action="proceed">Navegar bajo riesgo</button>' +
                        '<button id="sw-popup-cancel-button-malicious" data-action="cancel">Volver a puerto seguro</button>' +
                        '</div>' +
                        '</div>' +
                        '</div>' +
                        
                        '<div id="safewaters-confirmation-popup-container-uncertain" class="safewaters-preview-popup">' +
                        '<div class="sw-popup-content sw-popup-uncertain">' +
                        '<div class="sw-message-content">' +
                        '<img id="sw-popup-icon-uncertain" src="' + iconNaranja + '" alt="Icono de advertencia naranja" />' +
                        '<div>' +
                        '<h3 class="sw-popup-title">¡Alerta, Navegante!</h3>' +
                        '<p id="sw-popup-message-uncertain"></p>' +
                        '</div>' +
                        '</div>' +
                        '<div class="sw-popup-buttons">' +
                        '<button id="sw-popup-proceed-button-uncertain" data-action="proceed">Navegar bajo riesgo</button>' +
                        '<button id="sw-popup-cancel-button-uncertain" data-action="cancel">Volver a puerto seguro</button>' +
                        '</div>' +
                        '</div>' +
                        '</div>' +
                        
                        '<div id="safewaters-confirmation-popup-container-blocked" class="safewaters-preview-popup">' +
                        '<div class="sw-popup-content sw-popup-blocked">' +
                        '<div class="sw-message-content">' +
                        '<img id="sw-popup-icon-blocked" src="' + iconRojo + '" alt="Icono de bloqueo" />' +
                        '<div>' +
                        '<h3 class="sw-popup-title">¡Acceso Denegado!</h3>' +
                        '<p id="sw-popup-message-blocked"></p>' +
                        '</div>' +
                        '</div>' +
                        '<div class="sw-popup-buttons">' +
                        '<button id="sw-popup-understood-button-blocked" data-action="understood">Entendido</button>' +
                        '</div>' +
                        '</div>' +
                        '</div>';

                    document.body.insertAdjacentHTML('beforeend', html);
                    
                    // console.log('SafeWaters: HTML de popup inyectado exitosamente'); // DEBUG: Comentado para producción

                    // Configurar función global para listeners
                    window.safeWatersSetupPopupListeners = function(popupId) {
                        // console.log('SafeWaters: Configurando listeners para popup:', popupId); // DEBUG: Comentado para producción
                        var buttons = document.querySelectorAll('[data-action]');
                        
                        // Remover listeners previos
                        for (var i = 0; i < buttons.length; i++) {
                            var button = buttons[i];
                            button.replaceWith(button.cloneNode(true));
                        }

                        // Agregar nuevos listeners
                        var newButtons = document.querySelectorAll('[data-action]');
                        for (var j = 0; j < newButtons.length; j++) {
                            var btn = newButtons[j];
                            btn.addEventListener('click', function(e) {
                                var action = e.target.getAttribute('data-action');
                                // console.log('SafeWaters: Botón clickeado:', action); // DEBUG: Comentado para producción
                                
                                // Enviar respuesta al background script
                                chrome.runtime.sendMessage({
                                    action: 'popupResponse',
                                    popupId: popupId,
                                    userAction: action
                                });

                                // Ocultar popup
                                var popup = e.target.closest('.safewaters-preview-popup');
                                if (popup) {
                                    popup.style.display = 'none';
                                }
                                
                                // La navegación ahora se maneja desde el background script
                                // No necesitamos window.location.href aquí
                            });
                        }
                    };
                }
            });

            Logger.debug('Recursos de popup inyectados', { tabId });

        } catch (error) {
            Logger.error('Error inyectando recursos de popup', { 
                tabId, 
                error: error.message 
            });
            throw error;
        }
    }

    async displayPopup(tabId, type, message, popupId, url) {
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: function(type, message, popupId, targetUrl) {
                    // Función que se ejecuta en el contexto de la página
                    // console.log('SafeWaters: Mostrando popup específico - type:', type, 'message:', message, 'popupId:', popupId); // DEBUG: Comentado para producción
                    
                    // Ocultar todos los popups primero
                    var allPopups = document.querySelectorAll('.safewaters-preview-popup');
                    for (var i = 0; i < allPopups.length; i++) {
                        allPopups[i].style.display = 'none';
                    }

                    // Mostrar el popup específico
                    var containerId = 'safewaters-confirmation-popup-container-' + type;
                    var messageId = 'sw-popup-message-' + type;
                    
                    console.log('SafeWaters: Buscando elementos - containerId:', containerId, 'messageId:', messageId);
                    
                    var container = document.getElementById(containerId);
                    var messageElement = document.getElementById(messageId);
                    
                    if (container && messageElement) {
                        console.log('SafeWaters: Elementos encontrados, configurando popup');
                        messageElement.textContent = message;
                        // Guardar la URL en el popup para usarla en la navegación
                        container.setAttribute('data-url', targetUrl);
                        container.style.display = 'flex';
                        
                        // Configurar listeners con el popupId específico
                        if (window.safeWatersSetupPopupListeners) {
                            window.safeWatersSetupPopupListeners(popupId);
                            console.log('SafeWaters: Listeners configurados para popup');
                        } else {
                            console.error('SafeWaters: Función safeWatersSetupPopupListeners no disponible');
                        }
                    } else {
                        console.error('SafeWaters: Elementos de popup no encontrados - containerId:', containerId, 'messageId:', messageId, 'containerFound:', !!container, 'messageFound:', !!messageElement);
                    }
                },
                args: [type, message, popupId, url]
            });

        } catch (error) {
            Logger.error('Error mostrando popup específico', { 
                tabId, 
                type, 
                error: error.message 
            });
            throw error;
        }
    }

    handlePopupResponse(popupId, action) {
        const popupInfo = this.activePopups.get(popupId);
        
        if (!popupInfo) {
            Logger.warn('Popup no encontrado', { popupId });
            return null;
        }

        Logger.info('Respuesta de popup recibida', { 
            popupId, 
            action, 
            type: popupInfo.type,
            url: popupInfo.url 
        });

        this.activePopups.delete(popupId);

        return {
            ...popupInfo,
            userAction: action
        };
    }

    getPopupCSS() {
        return `
        /* Estilos exactos del confirm-popup original */
        body {
            font-family: Arial, sans-serif;
        }

        /* Contenedor principal del Popup: para posicionamiento y visibilidad */
        .safewaters-preview-popup {
            display: none;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 2147483647;
        }
        .sw-popup-content {
            background-color: #E8DED2;
            padding: 25px;
            box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.5);
            text-align: center;
            border-radius: 8px;
            min-width: 300px;
            max-width: 500px;
        }

        .sw-message-content p {
            color: black;
        }

        .sw-message-content {
            display: flex;        
            gap: 12px;
            align-items: center;
        }

        .sw-popup-title {
            margin-top: 0;
            color: black;
            font-weight: bold;
        }

        .sw-popup-buttons button {
            padding: 10px 15px;
            margin: 0 10px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
        }

        /* popup MALICIOSO */
        .safewaters-preview-popup .sw-popup-malicious #sw-popup-icon-malicious {
            width: 100px;
            height: 100px;
            display: inline-block;
            object-fit: contain;
        }

        .sw-popup-malicious {
            border: 3px solid #D7263D;
        }

        .sw-popup-malicious [id*="proceed"] {
            background-color: #D7263D;
            color: white;
            border: 1px solid #8B1E3F;
        }

        .sw-popup-malicious [id*="proceed"]:hover {
            color: white;
            background-color: #8B1E3F;
        }

        .sw-popup-malicious [id*="cancel"] {
            background-color: white;
            color: black;
        }
        .sw-popup-malicious [id*="cancel"]:hover {
            color: white;
            background-color: gray;
        }

        /* popup INCIERTO */
        .safewaters-preview-popup .sw-popup-uncertain #sw-popup-icon-uncertain {
            width: 100px;
            height: 100px;
            display: inline-block;
            object-fit: contain;
        }

        .sw-popup-uncertain {
            border: 3px solid #FF8C00;
        }
        .sw-popup-uncertain [id*="proceed"] {
            background-color: #FF8C00;
            color: black;
            border: 1px solid #D2691E;
        }
        .sw-popup-uncertain [id*="proceed"]:hover {
            color: white;
            background-color: #D2691E;
        }

        .sw-popup-uncertain [id*="cancel"] {
            background-color: white;
            color: black;
        }
        .sw-popup-uncertain [id*="cancel"]:hover {
            color: white;
            background-color: gray;
        }

        /* popup BLOQUEADO */
        .safewaters-preview-popup .sw-popup-blocked #sw-popup-icon-blocked {
            width: 100px;
            height: 100px;
            display: inline-block;
            object-fit: contain;
        }

        .sw-popup-blocked {
            border: 3px solid #D7263D;
        }
        .sw-popup-blocked [id*="understood"] {
            background-color: #D7263D;
            color: white;
            border: 1px solid #8B1E3F;
        }
        .sw-popup-blocked [id*="understood"]:hover {
            color: white;
            background-color: #8B1E3F;
        }
        `;
    }

    cleanup(maxAge = 30000) {
        const now = Date.now();
        
        for (const [popupId, popupInfo] of this.activePopups.entries()) {
            if (now - popupInfo.timestamp > maxAge) {
                this.activePopups.delete(popupId);
                Logger.debug('Popup antiguo limpiado', { popupId });
            }
        }
    }

    getStats() {
        return {
            activePopups: this.activePopups.size,
            handlerType: 'popup'
        };
    }
}
