// Content script simplificado que funciona sin imports problemáticos
// Usa configuración centralizada del config.js
console.log('SafeWaters: Content script loading...');

class SafeWatersController {
  constructor() {
    // Obtener configuración del background script al inicializar
    this.config = null;
    // No llamar initialize() aquí, se llama desde bootSafeWaters()
  }

  async initialize() {
    // Obtener configuración centralizada
    await this.loadConfig();
    
    this.setupListeners();
    this.setupMessageListeners();
    console.log("SafeWaters: Extension initialized and active");
  }

  async loadConfig() {
    try {
      // Solicitar configuración al background script
      const response = await chrome.runtime.sendMessage({
        action: 'getConfig'
      });
      
      if (response && response.success) {
        this.config = response.config;
        console.log('SafeWaters: Configuración cargada desde background');
      } else {
        // Fallback a configuración básica
        this.config = {
          securityStatus: {
            SAFE: 'safe',
            MALICIOUS: 'malicious', 
            UNCERTAIN: 'uncertain',
            BLOCKED: 'blocked'
          }
        };
        console.warn('SafeWaters: Usando configuración fallback');
      }
    } catch (error) {
      console.error('SafeWaters: Error cargando configuración:', error);
      // Usar configuración fallback
      this.config = {
        securityStatus: {
          SAFE: 'safe',
          MALICIOUS: 'malicious',
          UNCERTAIN: 'uncertain', 
          BLOCKED: 'blocked'
        }
      };
    }
  }

  setupListeners() {
    console.log("SafeWaters: Setting up click listeners");
    const boundClickHandler = this.handleLinkClick.bind(this);
    document.body.addEventListener('click', boundClickHandler, true);
    console.log("SafeWaters: Click listener added to document.body");
  }

  setupMessageListeners() {
    // Listener para mensajes del background script (navegación directa)
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'showDirectNavigationPopup') {
        console.log('SafeWaters: Received direct navigation popup request:', message);
        this.handleDirectNavigationPopup(message);
        sendResponse({ success: true });
      }
    });
  }

  handleDirectNavigationPopup(message) {
    const { popupType, url, securityInfo } = message;
    
    if (popupType === 'blocked') {
      // Para navegación directa, usar páginas completas (no popups)
      window.location.href = chrome.runtime.getURL('src/pages/blocked/blocked.html') + 
                             '?url=' + encodeURIComponent(url) + 
                             '&reason=' + encodeURIComponent(securityInfo.info || 'Sitio bloqueado');
    } else if (popupType === 'warning') {
      // Para navegación directa, usar páginas completas (no popups)  
      window.location.href = chrome.runtime.getURL('src/pages/warning/warning.html') + 
                             '?url=' + encodeURIComponent(url) + 
                             '&domain=' + encodeURIComponent(securityInfo.domain || 'Desconocido') +
                             '&reason=' + encodeURIComponent(securityInfo.info || 'Sitio peligroso');
    }
  }

  async handleLinkClick(event) {
    console.log('SafeWaters: Click detected on:', event.target);

    // Ignorar clicks en elementos del popup de SafeWaters
    if (event.target.closest('.safewaters-preview-popup') || 
        event.target.hasAttribute('data-action') ||
        event.target.id.startsWith('sw-popup-')) {
      console.log('SafeWaters: Click ignorado - es parte del popup de SafeWaters');
      return;
    }

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
      // Enviar al background script modular para verificación
      const response = await chrome.runtime.sendMessage({
        action: 'checkClickUrl',
        url: url
      });

      if (response.success) {
        this.handleCheckResponse(response.result, url);
      } else {
        // Error - permitir navegación como fallback
        console.warn('SafeWaters: Error en verificación, permitiendo navegación', response);
        window.location.href = url;
      }
      
    } catch (error) {
      console.error('SafeWaters: Error analyzing URL:', error);
      // Fallback seguro - permitir navegación
      window.location.href = url;
    }
  }

  handleCheckResponse(result, url) {
    console.log('SafeWaters: Respuesta de verificación recibida', { result, url });
    
    switch (result.action) {
      case 'allow':
        // URL segura - navegar inmediatamente
        console.log('SafeWaters: URL allowed, navigating');
        window.location.href = url;
        break;
        
      case 'popup':
        // Popup ya fue mostrado por el background script
        console.log('SafeWaters: Popup mostrado por background script, esperando respuesta del usuario');
        // No hacer nada más - el popup manejará la navegación
        break;
        
      case 'redirect':
        // Redirigir a página de configuración
        console.log('SafeWaters: Redirecting for configuration');
        window.location.href = result.redirectUrl;
        break;
        
      default:
        console.warn('SafeWaters: Acción de respuesta desconocida', { action: result.action });
        window.location.href = url; // Fallback
    }
  }

  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch (error) {
      console.error('SafeWaters: Error extracting domain:', error);
      return url;
    }
  }
}

// Inicializar cuando el DOM esté listo
console.log('SafeWaters: Document ready state:', document.readyState);

async function bootSafeWaters() {
  console.log('SafeWaters: Booting SafeWaters controller...');
  const controller = new SafeWatersController();
  await controller.initialize();
  console.log('SafeWaters: Controller initialized successfully');
}

if (document.readyState === 'loading') {
  console.log('SafeWaters: Document still loading, waiting for DOMContentLoaded');
  document.addEventListener('DOMContentLoaded', bootSafeWaters);
} else {
  console.log('SafeWaters: Document already loaded, booting immediately');
  bootSafeWaters();
}
