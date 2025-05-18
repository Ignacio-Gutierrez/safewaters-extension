import { getExtAPI } from '../utils/apis/ext-api.js';

/**
 * Rutas y nombres de elementos usados por el popup de confirmación.
 * @readonly
 * @enum {Object}
 */
const PATHS = {
  POPUP_HTML: 'confirm-popup/confirm-popup.html',
  POPUP_CSS: 'confirm-popup/confirm-popup.css',
  ICON_MALICIOUS: 'icons/logo-rojo.svg',
  ICON_UNCERTAIN: 'icons/logo-naranja.svg'
};

/**
 * Identificadores de elementos del DOM usados por el popup.
 * @readonly
 * @enum {Object}
 */
const ELEMENTS = {
  CONTAINER_MALICIOUS_ID: 'safewaters-confirmation-popup-container-malicious',
  CONTAINER_UNCERTAIN_ID: 'safewaters-confirmation-popup-container-uncertain',
  MESSAGE_MALICIOUS_ID: 'sw-popup-message-malicious',
  MESSAGE_UNCERTAIN_ID: 'sw-popup-message-uncertain',
  ICON_MALICIOUS_ID: 'sw-popup-icon-malicious',
  ICON_UNCERTAIN_ID: 'sw-popup-icon-uncertain',
  PROCEED_BUTTON_ID: 'sw-popup-proceed-button',
  CANCEL_BUTTON_ID: 'sw-popup-cancel-button',
  FALLBACK_POPUP_ID: 'safewaters-fallback-popup',
  CSS_ID: 'safewaters-confirm-popup-styles'
};

/**
 * Clase encargada de gestionar la visualización de los popups de advertencia de seguridad.
 * @class
 */
class SecurityPopupManager {
  constructor() {
    /**
     * API de la extensión.
     * @type {Object}
     */
    this.extAPI = getExtAPI();
    /**
     * Callback al continuar.
     * @type {?Function}
     */
    this.onProceedCallback = null;
    /**
     * Callback al cancelar.
     * @type {?Function}
     */
    this.onCancelCallback = null;
  }

  /**
   * Muestra el popup de advertencia según el resultado del análisis de la URL.
   * @param {string} url - La URL analizada.
   * @param {Object} securityInfo - Información de seguridad (incluye severidad, dominio e info).
   * @param {Function} onProceed - Callback si el usuario decide continuar.
   * @param {Function} onCancel - Callback si el usuario cancela.
   * @returns {Promise<void>}
   */
  async show(url, securityInfo, onProceed, onCancel) {
    console.log('SafeWaters: Showing confirmation popup for URL:', url);
    try {
      this.onProceedCallback = onProceed;
      this.onCancelCallback = onCancel;
      await this.injectPopupResources();
      const popupConfig = this.getPopupConfigForSeverity(securityInfo);
      if (!popupConfig) {
        throw new Error(`Unknown severity level: ${securityInfo.severity}`);
      }
      this.setupAndShowPopup(url, securityInfo, popupConfig);
    } catch (error) {
      console.error('SafeWaters: Error showing popup:', error);
      this.showFallbackPopup(url, securityInfo, onProceed, onCancel);
    }
  }

  /**
   * Oculta todos los popups y limpia callbacks.
   * @returns {void}
   */
  hide() {
    const containers = [
      document.getElementById(ELEMENTS.CONTAINER_MALICIOUS_ID),
      document.getElementById(ELEMENTS.CONTAINER_UNCERTAIN_ID)
    ];
    containers.forEach(container => {
      if (container) {
        container.style.display = 'none';
      }
    });
    this.removeFallbackPopup();
    this.onProceedCallback = null;
    this.onCancelCallback = null;
  }

  /**
   * Obtiene la configuración del popup según el nivel de severidad.
   * @param {Object} securityInfo - Información de seguridad con severidad.
   * @returns {Object|null} Configuración del popup o null si la severidad es inválida.
   */
  getPopupConfigForSeverity(securityInfo) {
    const configs = {
      'malicious': {
        containerId: ELEMENTS.CONTAINER_MALICIOUS_ID,
        messageId: ELEMENTS.MESSAGE_MALICIOUS_ID,
        iconId: ELEMENTS.ICON_MALICIOUS_ID,
        iconPath: PATHS.ICON_MALICIOUS,
        messageTemplate: url => `¡PELIGRO! El enlace a "${securityInfo.domain}" parece ser malicioso.`
      },
      'uncertain': {
        containerId: ELEMENTS.CONTAINER_UNCERTAIN_ID,
        messageId: ELEMENTS.MESSAGE_UNCERTAIN_ID,
        iconId: ELEMENTS.ICON_UNCERTAIN_ID,
        iconPath: PATHS.ICON_UNCERTAIN,
        messageTemplate: url => `¡PRECAUCIÓN! No se pudo verificar completamente la seguridad del enlace a "${securityInfo.domain}". Procede con cuidado.`
      }
    };
    return configs[securityInfo.severity] || null;
  }

  /**
   * Configura y muestra el popup con la configuración dada.
   * @param {string} url - La URL analizada.
   * @param {Object} securityInfo - Información de seguridad.
   * @param {Object} popupConfig - Configuración del popup.
   * @returns {void}
   */
  setupAndShowPopup(url, securityInfo, popupConfig) {
    // Oculta todos los popups antes de mostrar el nuevo
    Object.values({
      malicious: ELEMENTS.CONTAINER_MALICIOUS_ID,
      uncertain: ELEMENTS.CONTAINER_UNCERTAIN_ID
    }).forEach(id => {
      const container = document.getElementById(id);
      if (container) {
        container.style.display = 'none';
      }
    });
    // Obtiene los elementos del popup activo
    const activeContainer = document.getElementById(popupConfig.containerId);
    const messageElement = document.getElementById(popupConfig.messageId);
    const iconElement = document.getElementById(popupConfig.iconId);
    if (!activeContainer || !messageElement || !iconElement) {
      throw new Error(`Popup elements not found for severity: ${securityInfo.severity}`);
    }
    // Actualiza el contenido
    messageElement.textContent = popupConfig.messageTemplate(url);
    iconElement.src = this.extAPI.runtime.getURL(popupConfig.iconPath);
    // Configura eventos y muestra el popup
    this.setupEventListeners(activeContainer);
    activeContainer.style.display = 'flex';
  }

  /**
   * Inyecta los recursos HTML y CSS necesarios para el popup.
   * @returns {Promise<void>}
   */
  async injectPopupResources() {
    await Promise.all([
      this.injectPopupHTML(),
      this.injectPopupCSS()
    ]);
  }

  /**
   * Inyecta el HTML del popup si aún no está presente.
   * @returns {Promise<void>}
   */
  async injectPopupHTML() {
    if (document.getElementById(ELEMENTS.CONTAINER_MALICIOUS_ID) || 
        document.getElementById(ELEMENTS.CONTAINER_UNCERTAIN_ID)) {
      return;
    }
    try {
      const popupHTMLUrl = this.extAPI.runtime.getURL(PATHS.POPUP_HTML);
      const response = await fetch(popupHTMLUrl);
      if (!response.ok) {
        throw new Error(`Failed to load popup HTML: ${response.statusText}`);
      }
      const html = await response.text();
      document.body.insertAdjacentHTML('beforeend', html);
    } catch (error) {
      console.error('SafeWaters: Error injecting popup HTML:', error);
      throw error;
    }
  }

  /**
   * Inyecta el CSS del popup si aún no está presente.
   * @returns {Promise<void>}
   */
  async injectPopupCSS() {
    if (document.getElementById(ELEMENTS.CSS_ID)) {
      return;
    }
    try {
      const link = document.createElement('link');
      link.id = ELEMENTS.CSS_ID;
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = this.extAPI.runtime.getURL(PATHS.POPUP_CSS);
      document.head.appendChild(link);
    } catch (error) {
      console.error('SafeWaters: Error injecting popup CSS:', error);
      throw error;
    }
  }

  /**
   * Configura los listeners de los botones del popup.
   * @param {HTMLElement} containerElement - Contenedor del popup activo.
   * @returns {void}
   */
  setupEventListeners(containerElement) {
    const proceedButton = containerElement.querySelector(`#${ELEMENTS.PROCEED_BUTTON_ID}`);
    const cancelButton = containerElement.querySelector(`#${ELEMENTS.CANCEL_BUTTON_ID}`);
    if (proceedButton) {
      const newProceedButton = proceedButton.cloneNode(true);
      proceedButton.parentNode.replaceChild(newProceedButton, proceedButton);
      newProceedButton.onclick = () => {
        if (this.onProceedCallback) {
          this.onProceedCallback();
        }
        this.hide();
      };
    }
    if (cancelButton) {
      const newCancelButton = cancelButton.cloneNode(true);
      cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);
      newCancelButton.onclick = () => {
        if (this.onCancelCallback) {
          this.onCancelCallback();
        }
        this.hide();
      };
    }
  }

  /**
   * Muestra un popup alternativo si el popup principal no puede mostrarse.
   * @param {string} url - La URL analizada.
   * @param {Object} securityInfo - Información de seguridad.
   * @param {Function} onProceed - Callback si el usuario decide continuar.
   * @param {Function} onCancel - Callback si el usuario cancela.
   * @returns {void}
   */
  showFallbackPopup(url, securityInfo, onProceed, onCancel) {
    this.removeFallbackPopup();
    const popup = document.createElement('div');
    popup.id = ELEMENTS.FALLBACK_POPUP_ID;
    Object.assign(popup.style, {
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: 'lightyellow',
      border: '2px solid orange',
      padding: '20px',
      zIndex: '100000',
      boxShadow: '0px 0px 10px rgba(0,0,0,0.5)',
      textAlign: 'center'
    });
    const domain = securityInfo.domain || this.extractDomain(url);
    const message = document.createElement('p');
    message.textContent = `¡Atención! El enlace a "${domain}" podría ser peligroso. Información: ${securityInfo.info || 'No se pudo cargar la interfaz de advertencia detallada.'}`;
    message.style.color = 'black';
    const proceedButton = document.createElement('button');
    proceedButton.textContent = 'Continuar de todas formas';
    proceedButton.style.marginRight = '10px';
    proceedButton.onclick = () => {
      if (onProceed) onProceed();
      this.removeFallbackPopup();
    };
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancelar';
    cancelButton.onclick = () => {
      if (onCancel) onCancel();
      this.removeFallbackPopup();
    };
    popup.appendChild(message);
    popup.appendChild(proceedButton);
    popup.appendChild(cancelButton);
    document.body.appendChild(popup);
  }

  /**
   * Elimina el popup alternativo si existe.
   * @returns {void}
   */
  removeFallbackPopup() {
    const existingPopup = document.getElementById(ELEMENTS.FALLBACK_POPUP_ID);
    if (existingPopup) {
      existingPopup.remove();
    }
  }

  /**
   * Extrae el dominio de una URL.
   * @param {string} url - La URL.
   * @returns {string} El dominio extraído o la URL original si falla.
   */
  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch (e) {
      console.error('SafeWaters: Error extracting domain:', e);
      return url;
    }
  }
}

/**
 * Instancia única del gestor de popups.
 * @type {SecurityPopupManager}
 */
const popupManager = new SecurityPopupManager();

/**
 * Muestra el popup de advertencia.
 * @function
 * @param {string} url - La URL analizada.
 * @param {Object} securityInfo - Información de seguridad.
 * @param {Function} onProceed - Callback si el usuario decide continuar.
 * @param {Function} onCancel - Callback si el usuario cancela.
 * @returns {Promise<void>}
 */
export const show = popupManager.show.bind(popupManager);

/**
 * Oculta cualquier popup de advertencia.
 * @function
 * @returns {void}
 */
export const hide = popupManager.hide.bind(popupManager);