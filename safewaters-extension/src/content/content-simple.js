// Content script simplificado que funciona sin imports problemáticos
console.log('SafeWaters: Content script loading...');

const SEVERITY = {
  SAFE: 'safe',
  MALICIOUS: 'malicious',
  UNCERTAIN: 'uncertain'
};

class SafeWatersController {
  constructor() {
    this.initialize();
  }

  initialize() {
    this.setupListeners();
    console.log("SafeWaters: Extension initialized and active");
  }

  setupListeners() {
    console.log("SafeWaters: Setting up click listeners");
    const boundClickHandler = this.handleLinkClick.bind(this);
    document.body.addEventListener('click', boundClickHandler, true);
    console.log("SafeWaters: Click listener added to document.body");
  }

  async handleLinkClick(event) {
    console.log('SafeWaters: Click detected on:', event.target);
    console.log('SafeWaters: Event type:', event.type);

    const linkElement = event.target.closest('a[href^="http"], a[href^="https"]');
    
    if (!linkElement) {
      console.log('SafeWaters: No link element found');
      return;
    }
    
    if (linkElement.classList.contains('safewaters-ignore-click')) {
      console.log('SafeWaters: Link ignored due to safewaters-ignore-click class');
      return;
    }

    console.log('SafeWaters: Link intercepted:', linkElement.href);
    event.preventDefault();

    const url = linkElement.href;
    
    try {
      const securityInfo = await this.getSecurityInfo(url);
      
      // Verificar si necesita configuración
      if (securityInfo && securityInfo.needsConfiguration) {
        console.log('SafeWaters: Configuration needed, ignoring navigation');
        // Simplemente ignorar la navegación cuando no está configurado
        return;
      }
      
      this.handleNavigation(url, securityInfo);
    } catch (error) {
      console.error('SafeWaters: Error analyzing URL:', error);
      this.handleError(url, error);
    }
  }

  async getSecurityInfo(url) {
    console.log('SafeWaters: Requesting security check via background script');
    
    try {
      // Enviar mensaje al background script para verificar la URL
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'checkUrl',
          url: url
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      });

      if (response.error) {
        throw new Error(response.error);
      }

      // Verificar si necesita configuración
      if (response.data && response.data.needsConfiguration) {
        console.log('SafeWaters: Extension needs configuration - configuration page opened');
        // No lanzar error, simplemente retornar estado especial
        return {
          needsConfiguration: true,
          message: response.data.message
        };
      }

      return this.processApiResult(url, response.data);
    } catch (error) {
      console.error('SafeWaters: Error getting security info via background:', error);
      throw error;
    }
  }

  processApiResult(url, data) {
    const domain = this.extractDomain(url);
    let severity = SEVERITY.SAFE;
    
    if (data.malicious) {
      severity = SEVERITY.MALICIOUS;
    }

    return {
      url: url,
      domain: data.domain || domain,
      info: data.info || 'No additional information available',
      source: data.source || 'Unknown',
      malicious: data.malicious || false,
      severity: severity,
      // Incluir información de bloqueo por reglas de usuario
      is_blocked_by_user_rule: data.is_blocked_by_user_rule || false,
      blocking_rule_details: data.blocking_rule_details || null
    };
  }

  handleNavigation(url, securityInfo) {
    console.log('SafeWaters: handleNavigation called with:', { url, securityInfo });
    
    // Verificar si está bloqueado por reglas de usuario (ACCESO DENEGADO)
    if (securityInfo.is_blocked_by_user_rule) {
      console.log('SafeWaters: URL blocked by user rule - access denied');
      this.showBlockedByRulePopup(url, securityInfo);
      return;
    }

    // URLs seguras pasan directamente
    if (securityInfo.severity === SEVERITY.SAFE) {
      console.log('SafeWaters: URL deemed safe, redirecting');
      window.location.href = url;
      return;
    }

    // URLs maliciosas o inciertas - mostrar popup con opción de continuar
    console.log(`SafeWaters: Showing warning popup for ${securityInfo.severity} URL`);
    
    const enhancedInfo = {
      ...securityInfo,
      info: securityInfo.source ? 
        `${securityInfo.info} (Source: ${securityInfo.source})` : 
        securityInfo.info
    };

    this.showSecurityPopup(url, enhancedInfo, () => {
      window.location.href = url;
    }, () => {
      // Usuario canceló la navegación
    });
  }

  handleError(url, error) {
    const domain = this.extractDomain(url);
    
    this.showSecurityPopup(url, {
      domain: domain,
      info: 'No se pudo verificar la seguridad de este enlace debido a un error. Proceda con precaución.',
      severity: SEVERITY.UNCERTAIN
    }, () => {
      window.location.href = url;
    }, () => {
      // Usuario canceló la navegación
    });
  }

  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch (error) {
      console.error('SafeWaters: Error extracting domain:', error);
      return url;
    }
  }

  // Mostrar popup usando el sistema confirm-popup integrado
  showSecurityPopup(url, securityInfo, onConfirm, onCancel) {
    console.log('SafeWaters: Showing security popup using confirm-popup system');
    console.log('SafeWaters: Security info:', securityInfo);
    console.log('SafeWaters: URL:', url);
    
    // Crear instancia del popup manager
    const popupManager = new SecurityPopupManager();
    popupManager.show(url, securityInfo, onConfirm, onCancel);
  }

  // Mostrar popup de bloqueo por reglas de usuario (sin opción de continuar)
  showBlockedByRulePopup(url, securityInfo) {
    console.log('SafeWaters: Showing blocked by user rule popup');
    console.log('SafeWaters: Security info for blocked rule:', securityInfo);
    console.log('SafeWaters: URL for blocked rule:', url);
    
    // Crear instancia del popup manager y usar método específico
    const popupManager = new SecurityPopupManager();
    popupManager.showBlockedByRulePopup(url, securityInfo);
  }
}

/**
 * Clase SecurityPopupManager copiada de confirm-popup para uso directo
 */
class SecurityPopupManager {
  constructor() {
    this.onProceedCallback = null;
    this.onCancelCallback = null;
  }

  async show(url, securityInfo, onProceed, onCancel) {
    console.log('SafeWaters: PopupManager.show() called');
    console.log('SafeWaters: Showing confirmation popup for URL:', url);
    console.log('SafeWaters: Security info in popup manager:', securityInfo);
    
    this.onProceedCallback = onProceed;
    this.onCancelCallback = onCancel;
    
    try {
      await this.injectPopupResources();
      console.log('SafeWaters: Popup resources injected successfully');
      
      const popupConfig = this.getPopupConfigForSeverity(securityInfo);
      console.log('SafeWaters: Popup config:', popupConfig);
      
      if (!popupConfig) {
        console.error(`SafeWaters: Unknown severity level: ${securityInfo.severity}`);
        return;
      }
      
      this.setupAndShowPopup(url, securityInfo, popupConfig);
      console.log('SafeWaters: Popup setup and show completed');
    } catch (error) {
      console.error('SafeWaters: Error in popup show:', error);
    }
  }

  hide() {
    const containers = [
      document.getElementById('safewaters-confirmation-popup-container-malicious'),
      document.getElementById('safewaters-confirmation-popup-container-uncertain'),
      document.getElementById('safewaters-confirmation-popup-container-blocked')
    ];
    containers.forEach(container => {
      if (container) {
        container.style.display = 'none';
      }
    });
    this.onProceedCallback = null;
    this.onCancelCallback = null;
  }

  getPopupConfigForSeverity(securityInfo) {
    const configs = {
      'malicious': {
        containerId: 'safewaters-confirmation-popup-container-malicious',
        messageId: 'sw-popup-message-malicious',
        iconId: 'sw-popup-icon-malicious',
        iconPath: 'icons/logo-rojo.svg',
        messageTemplate: (url, securityInfo) => `¡PELIGRO! El enlace a "${securityInfo.domain}" parece ser malicioso.`
      },
      'uncertain': {
        containerId: 'safewaters-confirmation-popup-container-uncertain',
        messageId: 'sw-popup-message-uncertain',
        iconId: 'sw-popup-icon-uncertain',
        iconPath: 'icons/logo-naranja.svg',
        messageTemplate: (url, securityInfo) => `¡PRECAUCIÓN! No se pudo verificar completamente la seguridad del enlace a "${securityInfo.domain}". Procede con cuidado.`
      },
      'blocked': {
        containerId: 'safewaters-confirmation-popup-container-blocked',
        messageId: 'sw-popup-message-blocked',
        iconId: 'sw-popup-icon-blocked',
        iconPath: 'icons/logo-rojo.svg',
        messageTemplate: (url, securityInfo) => `El sitio "${securityInfo.domain}" ha sido bloqueado por el administrador.`
      }
    };
    return configs[securityInfo.severity] || null;
  }

  setupAndShowPopup(url, securityInfo, popupConfig) {
    // Ocultar todos los popups
    ['malicious', 'uncertain', 'blocked'].forEach(type => {
      const container = document.getElementById(`safewaters-confirmation-popup-container-${type}`);
      if (container) {
        container.style.display = 'none';
      }
    });

    // Obtener elementos del popup activo
    const activeContainer = document.getElementById(popupConfig.containerId);
    const messageElement = document.getElementById(popupConfig.messageId);
    const iconElement = document.getElementById(popupConfig.iconId);

    if (!activeContainer || !messageElement || !iconElement) {
      throw new Error(`Popup elements not found for severity: ${securityInfo.severity}`);
    }

    // Actualizar contenido
    messageElement.textContent = popupConfig.messageTemplate(url, securityInfo);
    iconElement.src = chrome.runtime.getURL(popupConfig.iconPath);

    // Configurar eventos y mostrar
    if (securityInfo.severity === 'blocked') {
      this.setupBlockedEventListeners(activeContainer);
    } else {
      this.setupEventListeners(activeContainer);
    }
    activeContainer.style.display = 'flex';
  }

  async injectPopupResources() {
    await Promise.all([
      this.injectPopupHTML(),
      this.injectPopupCSS()
    ]);
  }

  async injectPopupHTML() {
    if (document.getElementById('safewaters-confirmation-popup-container-malicious') || 
        document.getElementById('safewaters-confirmation-popup-container-uncertain') ||
        document.getElementById('safewaters-confirmation-popup-container-blocked')) {
      return;
    }

    const html = `
    <div id="safewaters-confirmation-popup-container-malicious" class="safewaters-preview-popup">
      <div class="sw-popup-content sw-popup-malicious">
        <div class="sw-message-content">
          <img id="sw-popup-icon-malicious" src="" alt="Icono de advertencia roja" />
          <div>
            <h3 class="sw-popup-title">¡Alerta, Navegante!</h3>
            <p id="sw-popup-message-malicious"></p>
          </div>
        </div>
        <div class="sw-popup-buttons">
          <button id="sw-popup-proceed-button">Navegar bajo riesgo</button>
          <button id="sw-popup-cancel-button">Volver a puerto seguro</button>
        </div>
      </div>
    </div>

    <div id="safewaters-confirmation-popup-container-uncertain" class="safewaters-preview-popup">
      <div class="sw-popup-content sw-popup-uncertain">
        <div class="sw-message-content">
          <img id="sw-popup-icon-uncertain" src="" alt="Icono de advertencia naranja" />
          <div>
            <h3 class="sw-popup-title">¡Alerta, Navegante!</h3>
            <p id="sw-popup-message-uncertain"></p>
          </div>
        </div>
        <div class="sw-popup-buttons">
          <button id="sw-popup-proceed-button">Navegar bajo riesgo</button>
          <button id="sw-popup-cancel-button">Volver a puerto seguro</button>
        </div>
      </div>
    </div>

    <div id="safewaters-confirmation-popup-container-blocked" class="safewaters-preview-popup">
      <div class="sw-popup-content sw-popup-blocked">
        <div class="sw-message-content">
          <img id="sw-popup-icon-blocked" src="" alt="Icono de bloqueo" />
          <div>
            <h3 class="sw-popup-title">¡Acceso Denegado!</h3>
            <p id="sw-popup-message-blocked"></p>
          </div>
        </div>
        <div class="sw-popup-buttons">
          <button id="sw-popup-understood-button">Entendido</button>
        </div>
      </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
  }

  async injectPopupCSS() {
    if (document.getElementById('safewaters-confirm-popup-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'safewaters-confirm-popup-styles';
    style.textContent = `
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

    .sw-popup-malicious #sw-popup-proceed-button {
        background-color: #D7263D;
        color: white;
        border: 1px solid #8B1E3F;
    }

    .sw-popup-malicious #sw-popup-proceed-button:hover {
        color: white;
        background-color: #8B1E3F;
    }

    .sw-popup-malicious #sw-popup-cancel-button {
        background-color: white;
        color: black;
    }
    .sw-popup-malicious #sw-popup-cancel-button:hover {
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
    .sw-popup-uncertain #sw-popup-proceed-button {
        background-color: #FF8C00;
        color: black;
        border: 1px solid #D2691E;
    }
    .sw-popup-uncertain #sw-popup-proceed-button:hover {
        color: white;
        background-color: #D2691E;
    }

    .sw-popup-uncertain #sw-popup-cancel-button {
        background-color: white;
        color: black;
    }
    .sw-popup-uncertain #sw-popup-cancel-button:hover {
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
    .sw-popup-blocked #sw-popup-understood-button {
        background-color: #D7263D;
        color: white;
        border: 1px solid #8B1E3F;
    }
    .sw-popup-blocked #sw-popup-understood-button:hover {
        color: white;
        background-color: #8B1E3F;
    }
    `;

    document.head.appendChild(style);
  }

  setupEventListeners(containerElement) {
    const proceedButton = containerElement.querySelector('#sw-popup-proceed-button');
    const cancelButton = containerElement.querySelector('#sw-popup-cancel-button');

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

  setupBlockedEventListeners(containerElement) {
    const understoodButton = containerElement.querySelector('#sw-popup-understood-button');

    if (understoodButton) {
      const newUnderstoodButton = understoodButton.cloneNode(true);
      understoodButton.parentNode.replaceChild(newUnderstoodButton, understoodButton);
      newUnderstoodButton.onclick = () => {
        console.log('SafeWaters: User acknowledged blocked site');
        this.hide();
        // No redirigir - simplemente cerrar
      };
    }
  }



  // Mostrar popup de bloqueo independiente
  showBlockedByRulePopup(url, securityInfo) {
    console.log('SafeWaters: Showing blocked popup using dedicated blocked popup');
    
    // Usar popup específico de bloqueo
    const blockedSecurityInfo = {
      ...securityInfo,
      severity: 'blocked'
    };

    // Usar el flujo estándar con popup específico
    this.show(url, blockedSecurityInfo, null, null);
  }
}

function bootSafeWaters() {
  console.log('SafeWaters: Booting SafeWaters controller...');
  new SafeWatersController();
  console.log('SafeWaters: Controller initialized successfully');
}

// Inicializar cuando el DOM esté listo
console.log('SafeWaters: Document ready state:', document.readyState);

if (document.readyState === 'loading') {
  console.log('SafeWaters: Document still loading, waiting for DOMContentLoaded');
  document.addEventListener('DOMContentLoaded', bootSafeWaters);
} else {
  console.log('SafeWaters: Document already loaded, booting immediately');
  bootSafeWaters();
}
