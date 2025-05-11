import { getExtAPI } from '../utils/apis/ext-api.js';

// Constants for paths and element IDs
const PATHS = {
  POPUP_HTML: 'confirm-popup/confirm-popup.html',
  POPUP_CSS: 'confirm-popup/confirm-popup.css',
  ICON_MALICIOUS: 'icons/logo-rojo.svg',
  ICON_UNCERTAIN: 'icons/logo-naranja.svg'
};

const ELEMENTS = {
  // Container IDs
  CONTAINER_MALICIOUS_ID: 'safewaters-confirmation-popup-container-malicious',
  CONTAINER_UNCERTAIN_ID: 'safewaters-confirmation-popup-container-uncertain',
  
  // Message element IDs
  MESSAGE_MALICIOUS_ID: 'sw-popup-message-malicious',
  MESSAGE_UNCERTAIN_ID: 'sw-popup-message-uncertain',
  
  // Icon element IDs
  ICON_MALICIOUS_ID: 'sw-popup-icon-malicious',
  ICON_UNCERTAIN_ID: 'sw-popup-icon-uncertain',
  
  // Button IDs (same in both popups)
  PROCEED_BUTTON_ID: 'sw-popup-proceed-button',
  CANCEL_BUTTON_ID: 'sw-popup-cancel-button',
  
  // Fallback popup ID
  FALLBACK_POPUP_ID: 'safewaters-fallback-popup',
  
  // Style element ID
  CSS_ID: 'safewaters-confirm-popup-styles'
};

// Popup manager class
class SecurityPopupManager {
  constructor() {
    this.extAPI = getExtAPI();
    this.onProceedCallback = null;
    this.onCancelCallback = null;
  }

  /**
   * Show security alert popup based on URL analysis result
   * @param {string} url - The URL being checked
   * @param {Object} securityInfo - Security information with severity, domain and info
   * @param {Function} onProceed - Callback when user chooses to proceed
   * @param {Function} onCancel - Callback when user cancels
   */
  async show(url, securityInfo, onProceed, onCancel) {
    console.log('SafeWaters: Showing confirmation popup for URL:', url);
    
    try {
      // Store callbacks
      this.onProceedCallback = onProceed;
      this.onCancelCallback = onCancel;
      
      // Inject necessary HTML and CSS
      await this.injectPopupResources();
      
      // Select appropriate popup based on severity
      const popupConfig = this.getPopupConfigForSeverity(securityInfo);
      
      if (!popupConfig) {
        throw new Error(`Unknown severity level: ${securityInfo.severity}`);
      }
      
      // Setup and display the popup
      this.setupAndShowPopup(url, securityInfo, popupConfig);
      
    } catch (error) {
      console.error('SafeWaters: Error showing popup:', error);
      this.showFallbackPopup(url, securityInfo, onProceed, onCancel);
    }
  }

  /**
   * Hide all popups
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
    
    // Remove fallback popup if it exists
    this.removeFallbackPopup();
    
    // Clear callbacks
    this.onProceedCallback = null;
    this.onCancelCallback = null;
  }

  /**
   * Get popup configuration based on severity level
   * @param {Object} securityInfo - Security information with severity level
   * @returns {Object|null} - Popup configuration or null if invalid severity
   */
  getPopupConfigForSeverity(securityInfo) {
    const configs = {
      'malicious': {
        containerId: ELEMENTS.CONTAINER_MALICIOUS_ID,
        messageId: ELEMENTS.MESSAGE_MALICIOUS_ID,
        iconId: ELEMENTS.ICON_MALICIOUS_ID,
        iconPath: PATHS.ICON_MALICIOUS,
        messageTemplate: url => `¡PELIGRO! El enlace a "${securityInfo.domain}" parece ser malicioso. Información: ${securityInfo.info}`
      },
      'uncertain': {
        containerId: ELEMENTS.CONTAINER_UNCERTAIN_ID,
        messageId: ELEMENTS.MESSAGE_UNCERTAIN_ID,
        iconId: ELEMENTS.ICON_UNCERTAIN_ID,
        iconPath: PATHS.ICON_UNCERTAIN,
        messageTemplate: url => `¡PRECAUCIÓN! No se pudo verificar completamente la seguridad del enlace a "${securityInfo.domain}". Información: ${securityInfo.info}. Procede con cuidado.`
      }
    };
    
    return configs[securityInfo.severity] || null;
  }

  /**
   * Setup and display the popup with the given configuration
   * @param {string} url - The URL being checked
   * @param {Object} securityInfo - Security information
   * @param {Object} popupConfig - Configuration for the popup to display
   */
  setupAndShowPopup(url, securityInfo, popupConfig) {
    // Hide all popup containers first
    Object.values({
      malicious: ELEMENTS.CONTAINER_MALICIOUS_ID,
      uncertain: ELEMENTS.CONTAINER_UNCERTAIN_ID
    }).forEach(id => {
      const container = document.getElementById(id);
      if (container) {
        container.style.display = 'none';
      }
    });
    
    // Get elements for the active popup
    const activeContainer = document.getElementById(popupConfig.containerId);
    const messageElement = document.getElementById(popupConfig.messageId);
    const iconElement = document.getElementById(popupConfig.iconId);
    
    if (!activeContainer || !messageElement || !iconElement) {
      throw new Error(`Popup elements not found for severity: ${securityInfo.severity}`);
    }
    
    // Update content
    messageElement.textContent = popupConfig.messageTemplate(url);
    iconElement.src = this.extAPI.runtime.getURL(popupConfig.iconPath);
    
    // Setup event listeners and show popup
    this.setupEventListeners(activeContainer);
    activeContainer.style.display = 'flex';
  }

  /**
   * Inject HTML and CSS resources for the popup
   */
  async injectPopupResources() {
    await Promise.all([
      this.injectPopupHTML(),
      this.injectPopupCSS()
    ]);
  }

  /**
   * Inject popup HTML if not already present
   */
  async injectPopupHTML() {
    // Check if popup HTML is already injected
    if (document.getElementById(ELEMENTS.CONTAINER_MALICIOUS_ID) || 
        document.getElementById(ELEMENTS.CONTAINER_UNCERTAIN_ID)) {
      return; // Already injected
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
   * Inject popup CSS if not already present
   */
  async injectPopupCSS() {
    // Check if popup CSS is already injected
    if (document.getElementById(ELEMENTS.CSS_ID)) {
      return; // Already injected
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
   * Setup event listeners for popup buttons
   * @param {HTMLElement} containerElement - The active popup container
   */
  setupEventListeners(containerElement) {
    const proceedButton = containerElement.querySelector(`#${ELEMENTS.PROCEED_BUTTON_ID}`);
    const cancelButton = containerElement.querySelector(`#${ELEMENTS.CANCEL_BUTTON_ID}`);
    
    if (proceedButton) {
      // Clone and replace to avoid accumulating event listeners
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
   * Show fallback popup when regular popup can't be displayed
   * @param {string} url - The URL being checked
   * @param {Object} securityInfo - Security information
   * @param {Function} onProceed - Callback when user chooses to proceed
   * @param {Function} onCancel - Callback when user cancels
   */
  showFallbackPopup(url, securityInfo, onProceed, onCancel) {
    this.removeFallbackPopup(); // Clean up any existing fallback popups
    
    const popup = document.createElement('div');
    popup.id = ELEMENTS.FALLBACK_POPUP_ID;
    
    // Apply styles
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
    
    // Create message
    const domain = securityInfo.domain || this.extractDomain(url);
    const message = document.createElement('p');
    message.textContent = `¡Atención! El enlace a "${domain}" podría ser peligroso. Información: ${securityInfo.info || 'No se pudo cargar la interfaz de advertencia detallada.'}`;
    message.style.color = 'black';
    
    // Create buttons
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
    
    // Assemble and show popup
    popup.appendChild(message);
    popup.appendChild(proceedButton);
    popup.appendChild(cancelButton);
    document.body.appendChild(popup);
  }

  /**
   * Remove fallback popup if it exists
   */
  removeFallbackPopup() {
    const existingPopup = document.getElementById(ELEMENTS.FALLBACK_POPUP_ID);
    if (existingPopup) {
      existingPopup.remove();
    }
  }

  /**
   * Extract domain from URL
   * @param {string} url - The URL
   * @returns {string} - The domain
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

// Create singleton instance
const popupManager = new SecurityPopupManager();

// Export public API
export const show = popupManager.show.bind(popupManager);
export const hide = popupManager.hide.bind(popupManager);